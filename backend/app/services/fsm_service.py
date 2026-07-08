from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.datetime_utils import elapsed_minutes_since
from app.models.session import WorkSession
from app.models.task import Task
from app.services.aria_prompts import PHASE_LABELS


def compute_phase(session: WorkSession, tasks: list[Task]) -> str:
    if not tasks:
        return "accueil"

    done = sum(1 for t in tasks if t.status in ("completed", "delegated"))
    total = len(tasks)
    if done == total:
        return "debriefing"

    elapsed_min = elapsed_minutes_since(session.started_at)

    completion_rate = done / total

    if elapsed_min < 8 and completion_rate < 0.2:
        return "accueil"
    if elapsed_min < 20 and completion_rate < 0.6:
        return "pression"
    if completion_rate < 0.85:
        return "pic"
    return "debriefing"


def update_session_phase(db: Session, session: WorkSession) -> str | None:
    tasks = db.query(Task).filter(Task.session_id == session.id).all()
    new_phase = compute_phase(session, tasks)
    if new_phase != session.phase:
        session.phase = new_phase
        db.commit()
        db.refresh(session)
        return new_phase
    return None


def phase_label(phase: str) -> str:
    return PHASE_LABELS.get(phase, phase)
