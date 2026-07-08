from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.assigned_task import AssignedTaskResponse, UserTaskStatusUpdate
from app.schemas.dashboard import BadgesResponse, CalendarResponse, SessionSummary, UserStatsResponse
from app.services import assigned_task_service
from app.services.dashboard_service import get_session_calendar, get_user_badges_payload, get_user_stats, list_user_sessions
from app.socket_manager import emit_assigned_task_event

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=UserStatsResponse)
def user_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_user_stats(db, current_user)


@router.get("/sessions", response_model=list[SessionSummary])
def user_sessions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return list_user_sessions(db, current_user)


@router.get("/calendar", response_model=CalendarResponse)
def session_calendar(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_session_calendar(db, current_user, year, month)


@router.get("/badges", response_model=BadgesResponse)
def user_badges(current_user: User = Depends(get_current_user)):
    return get_user_badges_payload(current_user)


@router.get("/assigned-tasks", response_model=list[AssignedTaskResponse])
def user_assigned_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return assigned_task_service.get_user_assigned_tasks(db, current_user)


@router.put("/assigned-tasks/{task_id}/status", response_model=AssignedTaskResponse)
def update_user_task_status(
    task_id: str,
    data: UserTaskStatusUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = assigned_task_service.update_user_task_status(
        db, current_user, task_id, data.status, data.progress
    )
    manager_id = None
    if task.get("created_by_id"):
        manager_id = task["created_by_id"]
    background_tasks.add_task(
        emit_assigned_task_event,
        "status_changed",
        task,
        current_user.id,
        manager_id or current_user.id,
    )
    return task
