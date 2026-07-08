from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_manager_user
from app.models.user import User
from app.schemas.assigned_task import (
    AssignTaskRequest,
    AssignedTaskCreate,
    AssignedTaskResponse,
    AssignedTaskUpdate,
    ManagerTaskBoardResponse,
)
from app.schemas.manager import ManagerOverviewResponse
from app.services import assigned_task_service
from app.services.manager_service import get_manager_overview
from app.socket_manager import emit_assigned_task_event

router = APIRouter(prefix="/api/manager", tags=["manager"])


@router.get("/overview", response_model=ManagerOverviewResponse)
def manager_overview(db: Session = Depends(get_db), _: User = Depends(get_manager_user)):
    return get_manager_overview(db)


@router.get("/tasks/board", response_model=ManagerTaskBoardResponse)
def task_board(db: Session = Depends(get_db), manager: User = Depends(get_manager_user)):
    assigned_task_service.seed_default_tasks(db, manager)
    return assigned_task_service.get_manager_task_board(db, manager)


@router.get("/tasks/templates")
def task_templates(_: User = Depends(get_manager_user)):
    return assigned_task_service.get_task_templates()


@router.post("/tasks", response_model=AssignedTaskResponse, status_code=201)
def create_task(
    data: AssignedTaskCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    manager: User = Depends(get_manager_user),
):
    task = assigned_task_service.create_assigned_task(db, manager, data.model_dump())
    background_tasks.add_task(
        emit_assigned_task_event,
        "created",
        task,
        task.get("assignee_id"),
        manager.id,
    )
    return task


@router.put("/tasks/{task_id}", response_model=AssignedTaskResponse)
def update_task(
    task_id: str,
    data: AssignedTaskUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    manager: User = Depends(get_manager_user),
):
    task = assigned_task_service.update_manager_task(
        db, manager, task_id, data.model_dump(exclude_unset=True)
    )
    background_tasks.add_task(
        emit_assigned_task_event,
        "updated",
        task,
        task.get("assignee_id"),
        manager.id,
    )
    return task


@router.put("/tasks/{task_id}/assign", response_model=AssignedTaskResponse)
def assign_task(
    task_id: str,
    data: AssignTaskRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    manager: User = Depends(get_manager_user),
):
    task = assigned_task_service.assign_task(db, manager, task_id, data.assignee_id)
    background_tasks.add_task(
        emit_assigned_task_event,
        "assigned",
        task,
        task.get("assignee_id"),
        manager.id,
    )
    return task


@router.post("/tasks/{task_id}/validate", response_model=AssignedTaskResponse)
def validate_task(
    task_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    manager: User = Depends(get_manager_user),
):
    task = assigned_task_service.validate_task(db, manager, task_id)
    background_tasks.add_task(
        emit_assigned_task_event,
        "validated",
        task,
        task.get("assignee_id"),
        manager.id,
    )
    return task


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    manager: User = Depends(get_manager_user),
):
    assigned_task_service.delete_assigned_task(db, manager, task_id)
