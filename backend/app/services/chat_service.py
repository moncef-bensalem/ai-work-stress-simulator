from sqlalchemy.orm import Session

from app.core.datetime_utils import elapsed_minutes_since
from app.models.session import WorkSession
from app.models.stress_entry import StressEntry
from app.models.task import Task


def get_messages(db: Session, session_id: str) -> list:
    from app.models.chat_message import ChatMessage

    return (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )


def save_message(db: Session, session_id: str, sender: str, content: str):
    from app.models.chat_message import ChatMessage

    msg = ChatMessage(session_id=session_id, sender=sender, content=content.strip())
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def message_to_dict(msg) -> dict:
    return {
        "id": msg.id,
        "session_id": msg.session_id,
        "sender": msg.sender,
        "content": msg.content,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }


def build_session_context(db: Session, session: WorkSession) -> dict:
    tasks = db.query(Task).filter(Task.session_id == session.id).all()
    completed = sum(1 for t in tasks if t.status in ("completed", "delegated"))
    pending = sum(1 for t in tasks if t.status in ("pending", "in_progress"))

    latest_stress = (
        db.query(StressEntry)
        .filter(StressEntry.session_id == session.id)
        .order_by(StressEntry.recorded_at.desc())
        .first()
    )
    stress_level = latest_stress.level if latest_stress else 5
    elapsed_min = elapsed_minutes_since(session.started_at)

    return {
        "display_name": session.display_name,
        "mode": session.mode,
        "phase": session.phase,
        "tasks_total": len(tasks),
        "tasks_completed": completed,
        "tasks_pending": pending,
        "stress_level": stress_level,
        "elapsed_minutes": elapsed_min,
    }
