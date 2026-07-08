from datetime import date
from calendar import monthrange

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.session import WorkSession
from app.models.stress_entry import StressEntry
from app.models.task import Task
from app.models.user import User
from app.services.badge_service import get_user_badges


def get_user_stats(db: Session, user: User) -> dict:
    sessions = db.query(WorkSession).filter(WorkSession.user_id == user.id).all()
    session_ids = [s.id for s in sessions]
    completed_tasks = 0
    if session_ids:
        completed_tasks = (
            db.query(func.count(Task.id))
            .filter(Task.session_id.in_(session_ids), Task.status.in_(("completed", "delegated")))
            .scalar()
            or 0
        )
    avg_stress = 0.0
    if session_ids:
        avg = db.query(func.avg(StressEntry.level)).filter(StressEntry.session_id.in_(session_ids)).scalar()
        avg_stress = round(float(avg or 0), 1)

    last = sessions[-1] if sessions else None
    return {
        "total_sessions": len(sessions),
        "completed_tasks": completed_tasks,
        "average_stress": avg_stress,
        "last_mode": last.mode if last else None,
        "last_phase": last.phase if last else None,
    }


def list_user_sessions(db: Session, user: User, limit: int = 50) -> list[dict]:
    sessions = (
        db.query(WorkSession)
        .filter(WorkSession.user_id == user.id)
        .order_by(WorkSession.created_at.desc())
        .limit(limit)
        .all()
    )
    return [_session_summary(db, session) for session in sessions]


def _session_summary(db: Session, session: WorkSession) -> dict:
    tasks = db.query(Task).filter(Task.session_id == session.id).all()
    done = sum(1 for t in tasks if t.status in ("completed", "delegated"))
    return {
        "id": session.id,
        "display_name": session.display_name,
        "mode": session.mode,
        "phase": session.phase,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        "stress_score": session.stress_score,
        "tasks_completed": done,
        "tasks_total": len(tasks),
    }


def get_session_calendar(db: Session, user: User, year: int, month: int) -> dict:
    start = date(year, month, 1)
    _, last_day = monthrange(year, month)
    end = date(year, month, last_day)

    sessions = (
        db.query(WorkSession)
        .filter(WorkSession.user_id == user.id)
        .order_by(WorkSession.started_at.asc())
        .all()
    )

    days_map: dict[str, list] = {}
    for session in sessions:
        ref = session.started_at or session.created_at
        if not ref:
            continue
        day_key = ref.date().isoformat()
        if start <= ref.date() <= end:
            days_map.setdefault(day_key, []).append(_session_summary(db, session))

    days = [{"date": day, "sessions": items} for day, items in sorted(days_map.items())]
    return {"year": year, "month": month, "days": days}


def get_user_badges_payload(user: User) -> dict:
    return {"badges": get_user_badges(user)}
