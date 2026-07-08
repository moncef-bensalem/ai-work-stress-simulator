"""Analytics avancées pour le dashboard admin SaaS."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.datetime_utils import elapsed_minutes_since
from app.models.session import WorkSession
from app.models.stress_entry import StressEntry
from app.models.task import Task
from app.models.task_event import TaskEvent
from app.models.user import User
from app.services.analytics_service import compute_current_scores
from app.socket_manager import get_connected_users_snapshot

MODE_LABELS = {
    "bienveillante": "Bienveillante",
    "exigeante": "Exigeante",
    "toxique": "Toxique",
}

DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]


def _build_heatmap(db: Session) -> list[dict]:
    entries = db.query(StressEntry).all()
    grid: dict[tuple[int, int], list[int]] = {}
    session_hours: dict[tuple[int, int], set[str]] = {}

    for entry in entries:
        ts = entry.recorded_at
        if not ts:
            continue
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        key = ((ts.weekday() + 1) % 7, ts.hour)
        grid.setdefault(key, []).append(entry.level)
        session_hours.setdefault(key, set()).add(entry.session_id)

    for session in db.query(WorkSession).filter(WorkSession.started_at.isnot(None)).all():
        ts = session.started_at
        if ts and ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        if ts:
            key = ((ts.weekday() + 1) % 7, ts.hour)
            session_hours.setdefault(key, set()).add(session.id)

    heatmap = []
    for day in range(7):
        for hour in range(24):
            key = (day, hour)
            levels = grid.get(key, [])
            heatmap.append(
                {
                    "day": day,
                    "hour": hour,
                    "value": round(sum(levels) / len(levels), 1) if levels else 0.0,
                    "sessions": len(session_hours.get(key, set())),
                }
            )
    return heatmap


def _mode_distribution(db: Session) -> list[dict]:
    rows = db.query(WorkSession.mode, func.count(WorkSession.id)).group_by(WorkSession.mode).all()
    return [
        {"mode": mode, "count": count, "label": MODE_LABELS.get(mode, mode)}
        for mode, count in rows
    ]


def _radar_by_mode(db: Session) -> list[dict]:
    result = []
    for mode in ("bienveillante", "exigeante", "toxique"):
        sessions = db.query(WorkSession).filter(WorkSession.mode == mode).all()
        if not sessions:
            result.append(
                {
                    "mode": mode,
                    "productivity": 0,
                    "cognitive_load": 0,
                    "fatigue": 0,
                    "stress": 0,
                    "completion": 0,
                }
            )
            continue
        totals = {"productivity": 0.0, "cognitive_load": 0.0, "fatigue": 0.0, "stress": 0.0, "completion": 0.0}
        for session in sessions:
            scores = compute_current_scores(db, session)
            totals["productivity"] += scores["productivity"]
            totals["cognitive_load"] += scores["cognitive_load"]
            totals["fatigue"] += scores["fatigue"]
            totals["stress"] += scores["declared_stress"] * 10
            totals["completion"] += scores["completion_rate"]
        n = len(sessions)
        result.append(
            {
                "mode": mode,
                "productivity": round(totals["productivity"] / n, 1),
                "cognitive_load": round(totals["cognitive_load"] / n, 1),
                "fatigue": round(totals["fatigue"] / n, 1),
                "stress": round(totals["stress"] / n, 1),
                "completion": round(totals["completion"] / n, 1),
            }
        )
    return result


def _sessions_trend(db: Session, days: int = 14) -> list[dict]:
    now = datetime.now(timezone.utc)
    trend = []
    for i in range(days - 1, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        sessions = (
            db.query(WorkSession)
            .filter(WorkSession.started_at >= day_start, WorkSession.started_at < day_end)
            .all()
        )
        session_ids = [s.id for s in sessions]
        avg_stress = 0.0
        if session_ids:
            avg = db.query(func.avg(StressEntry.level)).filter(StressEntry.session_id.in_(session_ids)).scalar()
            avg_stress = round(float(avg or 0), 1)
        completed = sum(1 for s in sessions if s.ended_at is not None)
        trend.append(
            {
                "date": day_start.strftime("%Y-%m-%d"),
                "sessions": len(sessions),
                "completed": completed,
                "avg_stress": avg_stress,
            }
        )
    return trend


def get_admin_analytics(db: Session) -> dict:
    total_sessions = db.query(func.count(WorkSession.id)).scalar() or 0
    closed = db.query(WorkSession).filter(WorkSession.stress_score.isnot(None)).all()
    avg_score = (
        round(sum(s.stress_score for s in closed) / len(closed), 1) if closed else 0.0
    )
    all_tasks = db.query(Task).count() or 1
    done_tasks = db.query(Task).filter(Task.status.in_(("completed", "delegated"))).count() or 0
    completion_rate = round(done_tasks / all_tasks * 100, 1)

    return {
        "heatmap": _build_heatmap(db),
        "mode_distribution": _mode_distribution(db),
        "radar_by_mode": _radar_by_mode(db),
        "sessions_trend": _sessions_trend(db),
        "avg_stress_score": avg_score,
        "completion_rate": completion_rate,
    }


def _build_timeline(db: Session, limit: int = 25) -> list[dict]:
    events: list[dict] = []

    recent_sessions = (
        db.query(WorkSession).order_by(WorkSession.started_at.desc()).limit(8).all()
    )
    for session in recent_sessions:
        user = db.query(User).filter(User.id == session.user_id).first()
        name = user.full_name if user else "Utilisateur"
        ts = session.started_at.isoformat() if session.started_at else None
        events.append(
            {
                "id": f"session-start-{session.id}",
                "type": "session_start",
                "label": "Session démarrée",
                "user": name,
                "timestamp": ts,
                "meta": f"{MODE_LABELS.get(session.mode, session.mode)} · {session.display_name}",
            }
        )
        if session.ended_at:
            events.append(
                {
                    "id": f"session-end-{session.id}",
                    "type": "session_end",
                    "label": "Session terminée",
                    "user": name,
                    "timestamp": session.ended_at.isoformat(),
                    "meta": f"Score {session.stress_score or '—'}/100",
                }
            )

    task_events = (
        db.query(TaskEvent)
        .order_by(TaskEvent.timestamp.desc())
        .limit(10)
        .all()
    )
    for ev in task_events:
        task = db.query(Task).filter(Task.id == ev.task_id).first()
        if not task:
            continue
        session = db.query(WorkSession).filter(WorkSession.id == task.session_id).first()
        user = db.query(User).filter(User.id == session.user_id).first() if session else None
        events.append(
            {
                "id": f"task-{ev.id}",
                "type": "task_event",
                "label": ev.event_type.replace("_", " ").capitalize(),
                "user": user.full_name if user else "Utilisateur",
                "timestamp": ev.timestamp.isoformat() if ev.timestamp else None,
                "meta": task.title[:40],
            }
        )

    stress_recent = db.query(StressEntry).order_by(StressEntry.recorded_at.desc()).limit(8).all()
    for entry in stress_recent:
        session = db.query(WorkSession).filter(WorkSession.id == entry.session_id).first()
        user = db.query(User).filter(User.id == session.user_id).first() if session else None
        events.append(
            {
                "id": f"stress-{entry.id}",
                "type": "stress",
                "label": "Stress déclaré",
                "user": user.full_name if user else "Utilisateur",
                "timestamp": entry.recorded_at.isoformat() if entry.recorded_at else None,
                "meta": f"Niveau {entry.level}/10",
            }
        )

    events.sort(key=lambda e: e["timestamp"] or "", reverse=True)
    return events[:limit]


def get_admin_live(db: Session) -> dict:
    open_sessions_raw = (
        db.query(WorkSession)
        .filter(WorkSession.ended_at.is_(None), WorkSession.started_at.isnot(None))
        .order_by(WorkSession.started_at.desc())
        .all()
    )
    open_sessions = []
    for session in open_sessions_raw:
        user = db.query(User).filter(User.id == session.user_id).first()
        open_sessions.append(
            {
                "id": session.id,
                "display_name": session.display_name,
                "user_name": user.full_name if user else "—",
                "user_email": user.email if user else "—",
                "mode": session.mode,
                "phase": session.phase,
                "elapsed_minutes": round(elapsed_minutes_since(session.started_at), 1),
                "started_at": session.started_at.isoformat() if session.started_at else None,
            }
        )

    connected_snapshot = get_connected_users_snapshot()
    email_to_name = {u.email: u.full_name for u in db.query(User).all()}
    connected_users = [
        {
            "email": email,
            "full_name": email_to_name.get(email, email.split("@")[0]),
            "connections": count,
        }
        for email, count in connected_snapshot.items()
    ]

    return {
        "open_sessions": open_sessions,
        "connected_users": connected_users,
        "connected_count": len(connected_snapshot),
        "timeline": _build_timeline(db),
        "active_sessions": len(open_sessions),
    }
