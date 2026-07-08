from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.stress_entry import StressEntry
from app.models.user import User
from app.schemas.session import SessionCreate, SessionResponse, StressEntryCreate, StressEntryResponse
from app.schemas.task import TaskResponse
from app.services import session_service, task_service

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse, status_code=201)
def start_session(
    data: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return session_service.create_session(db, current_user, data)


@router.get("/{session_id}/tasks", response_model=list[TaskResponse])
def list_tasks(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return task_service.get_session_tasks(db, session_id, current_user)


@router.post("/{session_id}/stress", response_model=StressEntryResponse, status_code=201)
def record_stress(
    session_id: str,
    data: StressEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session_service.get_session(db, session_id, current_user)
    entry = StressEntry(session_id=session_id, level=data.level)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
