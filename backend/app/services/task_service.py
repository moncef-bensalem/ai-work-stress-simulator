from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.task import Task
from app.models.task_event import TaskEvent
from app.models.user import User
from app.schemas.task import TaskUpdate
from app.services.session_service import get_session


def get_session_tasks(db: Session, session_id: str, user: User) -> list[Task]:
    get_session(db, session_id, user)
    return (
        db.query(Task)
        .filter(Task.session_id == session_id)
        .order_by(Task.sort_order)
        .all()
    )


def update_task(db: Session, task_id: str, user: User, data: TaskUpdate) -> Task:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tâche introuvable")

    get_session(db, task.session_id, user)

    if data.status is not None:
        task.status = data.status
        event_type = "completed" if data.status == "completed" else "delegated" if data.status == "delegated" else "status_change"
        db.add(TaskEvent(task_id=task.id, event_type=event_type))

    if data.sort_order is not None:
        task.sort_order = data.sort_order
        db.add(TaskEvent(task_id=task.id, event_type="reordered"))

    db.commit()
    db.refresh(task)

    from app.models.session import WorkSession
    from app.services.fsm_service import update_session_phase

    work_session = db.query(WorkSession).filter(WorkSession.id == task.session_id).first()
    if work_session:
        update_session_phase(db, work_session)

    return task
