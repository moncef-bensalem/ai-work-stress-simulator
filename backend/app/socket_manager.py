import asyncio
import logging
import uuid
from datetime import datetime, timezone

import socketio
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import decode_token
from app.models.session import WorkSession
from app.models.chat_message import ChatMessage
from app.services.analytics_service import compute_session_metrics
from app.services.aria_prompts import PHASE_INTERVALS_SEC
from app.services.aria_service import create_aria_message
from app.services.llm_client import llm_is_available
from app.services.chat_service import message_to_dict, save_message
from app.services.fsm_service import phase_label, update_session_phase

logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

_scheduler_task: asyncio.Task | None = None
_last_proactive: dict[str, datetime] = {}
_presence: dict[str, dict] = {}


def get_connected_users_snapshot() -> dict[str, int]:
    counts: dict[str, int] = {}
    for info in _presence.values():
        email = info.get("email")
        if email:
            counts[email] = counts.get(email, 0) + 1
    return counts


def _get_user_email(token: str) -> str | None:
    payload = decode_token(token)
    if payload and payload.get("type") == "access":
        return payload.get("sub")
    return None


def _get_session_for_user(db: Session, session_id: str, email: str) -> WorkSession | None:
    from app.models.user import User

    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    return (
        db.query(WorkSession)
        .filter(WorkSession.id == session_id, WorkSession.user_id == user.id)
        .first()
    )


async def _emit_phase_change(session_id: str, phase: str):
    await sio.emit(
        "session_phase_change",
        {"session_id": session_id, "phase": phase, "label": phase_label(phase)},
        room=f"session:{session_id}",
    )


async def emit_assigned_task_event(
    event_type: str,
    task: dict,
    assignee_id: str | None,
    manager_id: str,
):
    payload = {"event": event_type, "task": task}
    bundles = _build_notification_bundles(event_type, task)

    if assignee_id:
        await sio.emit("assigned_task_update", payload, room=f"user:{assignee_id}")
        for note in bundles.get("user", []):
            await _emit_platform_notification(note, f"user:{assignee_id}")

    if manager_id:
        await sio.emit("assigned_task_update", payload, room=f"manager:{manager_id}")
        for note in bundles.get("manager", []):
            await _emit_platform_notification(note, f"manager:{manager_id}")

    for note in bundles.get("admin", []):
        await _emit_platform_notification(note, "admin:hub")


def _notification(
    audience: str,
    ntype: str,
    title: str,
    message: str,
    task_id: str | None = None,
) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "type": ntype,
        "title": title,
        "message": message,
        "audience": audience,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "task_id": task_id,
    }


def _build_notification_bundles(event_type: str, task: dict) -> dict[str, list[dict]]:
    title = task.get("title", "Tâche")
    task_id = task.get("id")
    assignee = task.get("assignee_name") or "un employé"
    bundles: dict[str, list[dict]] = {"user": [], "manager": [], "admin": []}

    if event_type == "assigned" and task.get("assignee_id"):
        bundles["user"].append(
            _notification(
                "user",
                "task_assigned",
                "Nouvelle tâche assignée",
                f'Votre Manager vous a attribué la tâche : "{title}".',
                task_id,
            )
        )
        bundles["manager"].append(
            _notification(
                "manager",
                "task_assigned_team",
                "Tâche assignée",
                f'Vous avez assigné "{title}" à {assignee}.',
                task_id,
            )
        )
        bundles["admin"].append(
            _notification(
                "admin",
                "admin_task_activity",
                "Activité équipe",
                f'Un Manager a assigné "{title}" à {assignee}.',
                task_id,
            )
        )

    elif event_type == "created" and task.get("assignee_id"):
        bundles["user"].append(
            _notification(
                "user",
                "task_assigned",
                "Nouvelle tâche assignée",
                f'Nouvelle tâche : "{title}".',
                task_id,
            )
        )

    elif event_type == "status_changed":
        status = task.get("status")
        if status == "done":
            bundles["manager"].append(
                _notification(
                    "manager",
                    "task_completed",
                    "Tâche terminée",
                    f'{assignee} a terminé la tâche "{title}".',
                    task_id,
                )
            )
            bundles["admin"].append(
                _notification(
                    "admin",
                    "admin_task_completed",
                    "Tâche terminée",
                    f'{assignee} a terminé "{title}".',
                    task_id,
                )
            )
        elif status == "in_progress":
            bundles["manager"].append(
                _notification(
                    "manager",
                    "task_started",
                    "Tâche en cours",
                    f'{assignee} a commencé "{title}".',
                    task_id,
                )
            )

    elif event_type == "validated":
        bundles["user"].append(
            _notification(
                "user",
                "task_validated",
                "Tâche validée",
                f'Votre Manager a validé la tâche "{title}".',
                task_id,
            )
        )
        bundles["admin"].append(
            _notification(
                "admin",
                "admin_task_validated",
                "Validation Manager",
                f'La tâche "{title}" a été validée.',
                task_id,
            )
        )

    elif event_type == "updated" and task.get("is_overdue"):
        bundles["user"].append(
            _notification(
                "user",
                "task_overdue",
                "Tâche en retard",
                f'La tâche "{title}" a dépassé sa date limite.',
                task_id,
            )
        )
        bundles["manager"].append(
            _notification(
                "manager",
                "task_overdue_team",
                "Tâche en retard",
                f'La tâche "{title}" de {assignee} est en retard.',
                task_id,
            )
        )

    return bundles


async def _emit_platform_notification(notification: dict, room: str):
    await sio.emit("platform_notification", notification, room=room)
    await sio.emit("task_notification", notification, room=room)


def _build_task_notification(event_type: str, task: dict) -> dict | None:
    bundles = _build_notification_bundles(event_type, task)
    for group in ("user", "manager", "admin"):
        if bundles.get(group):
            return bundles[group][0]
    return None


async def emit_stress_update(session_id: str, level: int, minute: float = 0):
    await sio.emit(
        "stress_update",
        {"session_id": session_id, "level": level, "minute": minute},
        room=f"session:{session_id}",
    )
    await _emit_metrics_update(session_id)


async def _emit_metrics_update(session_id: str):
    db = SessionLocal()
    try:
        session = db.query(WorkSession).filter(WorkSession.id == session_id).first()
        if session:
            payload = compute_session_metrics(db, session)
            await sio.emit("metrics_update", payload, room=f"session:{session_id}")
    except Exception as exc:
        logger.warning("metrics_update failed: %s", exc)
    finally:
        db.close()


async def _process_fsm(db: Session, session: WorkSession) -> str | None:
    new_phase = update_session_phase(db, session)
    if new_phase:
        await _emit_phase_change(session.id, new_phase)
        if new_phase == "debriefing":
            await sio.emit(
                "stress_alert",
                {"session_id": session.id, "message": "Phase de débriefing atteinte."},
                room=f"session:{session.id}",
            )
        await _emit_metrics_update(session.id)
    return new_phase


async def handle_user_message(session_id: str, email: str, content: str):
    db = SessionLocal()
    try:
        session = _get_session_for_user(db, session_id, email)
        if not session:
            return
        user_msg = save_message(db, session_id, "user", content)
        await sio.emit("user_message", message_to_dict(user_msg), room=f"session:{session_id}")

        await sio.emit("aria_typing", {"typing": True}, room=f"session:{session_id}")
        aria_msg = await create_aria_message(db, session, user_message=content)
        await sio.emit("aria_typing", {"typing": False}, room=f"session:{session_id}")
        await sio.emit("aria_message", aria_msg, room=f"session:{session_id}")

        await _process_fsm(db, session)
        await _emit_metrics_update(session_id)
    finally:
        db.close()


@sio.event
async def connect(sid, environ, auth):
    token = None
    if auth and isinstance(auth, dict):
        token = auth.get("token")
    if not token:
        query = environ.get("QUERY_STRING", "")
        for part in query.split("&"):
            if part.startswith("token="):
                token = part.split("=", 1)[1]
    email = _get_user_email(token) if token else None
    if not email:
        return False
    _presence[sid] = {
        "email": email,
        "connected_at": datetime.now(timezone.utc).isoformat(),
    }
    return True


@sio.event
async def disconnect(sid):
    _presence.pop(sid, None)


@sio.event
async def join_user_inbox(sid, data):
    if not isinstance(data, dict):
        return
    token = data.get("token")
    user_id = data.get("user_id")
    if not token or not user_id:
        return
    email = _get_user_email(token)
    if not email:
        return
    db = SessionLocal()
    try:
        from app.models.user import User

        user = db.query(User).filter(User.email == email, User.id == user_id).first()
        if user:
            await sio.enter_room(sid, f"user:{user_id}")
    finally:
        db.close()


@sio.event
async def join_manager_board(sid, data):
    if not isinstance(data, dict):
        return
    token = data.get("token")
    manager_id = data.get("manager_id")
    if not token or not manager_id:
        return
    email = _get_user_email(token)
    if not email:
        return
    db = SessionLocal()
    try:
        from app.models.user import User

        user = db.query(User).filter(User.email == email, User.id == manager_id).first()
        if user and getattr(user, "role", "user") in ("admin", "manager"):
            await sio.enter_room(sid, f"manager:{manager_id}")
    finally:
        db.close()


@sio.event
async def join_admin_hub(sid, data):
    if not isinstance(data, dict):
        return
    token = data.get("token")
    if not token:
        return
    email = _get_user_email(token)
    if not email:
        return
    db = SessionLocal()
    try:
        from app.models.user import User

        user = db.query(User).filter(User.email == email).first()
        if user and getattr(user, "role", "user") == "admin":
            await sio.enter_room(sid, "admin:hub")
    finally:
        db.close()


@sio.event
async def join_session(sid, data):
    session_id = data.get("session_id") if isinstance(data, dict) else None
    if not session_id:
        return
    await sio.enter_room(sid, f"session:{session_id}")


@sio.event
async def user_message(sid, data):
    if not isinstance(data, dict):
        return
    session_id = data.get("session_id")
    content = data.get("content", "").strip()
    token = data.get("token")
    if not session_id or not content or not token:
        return
    email = _get_user_email(token)
    if not email:
        return
    await handle_user_message(session_id, email, content)


async def _proactive_loop():
    while True:
        await asyncio.sleep(30)
        if not llm_is_available():
            continue
        db = SessionLocal()
        try:
            sessions = (
                db.query(WorkSession)
                .filter(WorkSession.ended_at.is_(None), WorkSession.started_at.isnot(None))
                .all()
            )
            now = datetime.now(timezone.utc)
            for session in sessions:
                interval = PHASE_INTERVALS_SEC.get(session.phase, 0)
                if interval == 0:
                    continue
                last = _last_proactive.get(session.id)
                if last and (now - last).total_seconds() < interval:
                    continue

                last_aria = (
                    db.query(ChatMessage)
                    .filter(ChatMessage.session_id == session.id, ChatMessage.sender == "aria")
                    .order_by(ChatMessage.created_at.desc())
                    .first()
                )
                if last_aria and last_aria.created_at:
                    created = last_aria.created_at
                    if created.tzinfo is None:
                        created = created.replace(tzinfo=timezone.utc)
                    if (now - created).total_seconds() < interval:
                        continue

                await sio.emit("aria_typing", {"typing": True}, room=f"session:{session.id}")
                msg = await create_aria_message(db, session, proactive=True)
                await sio.emit("aria_typing", {"typing": False}, room=f"session:{session.id}")
                await sio.emit("aria_message", msg, room=f"session:{session.id}")
                _last_proactive[session.id] = now
                await _process_fsm(db, session)
        except Exception as exc:
            logger.exception("Proactive loop error: %s", exc)
        finally:
            db.close()


def start_scheduler():
    global _scheduler_task
    if _scheduler_task is None or _scheduler_task.done():
        _scheduler_task = asyncio.create_task(_proactive_loop())


def stop_scheduler():
    global _scheduler_task
    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()
        _scheduler_task = None
