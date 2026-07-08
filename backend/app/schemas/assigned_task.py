from datetime import datetime

from pydantic import BaseModel, Field


class AssignedTaskResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    poste: str
    poste_label: str
    priority: str
    difficulty: str
    status: str
    status_label: str
    progress: int
    estimated_minutes: int
    start_date: datetime | None = None
    due_date: datetime | None = None
    assignee_id: str | None = None
    assignee_name: str | None = None
    created_by_id: str
    team: str | None = None
    sort_order: int
    is_overdue: bool = False
    validated_at: datetime | None = None
    created_at: datetime | None = None


class EmployeeTaskCard(BaseModel):
    id: str
    full_name: str
    email: str
    poste: str
    poste_label: str
    team: str | None
    tasks: list[AssignedTaskResponse]


class TaskBoardStats(BaseModel):
    total: int
    todo: int
    in_progress: int
    done: int
    overdue: int
    unassigned: int
    team_progress: float


class ManagerTaskBoardResponse(BaseModel):
    available_tasks: list[AssignedTaskResponse]
    employees: list[EmployeeTaskCard]
    kanban: dict[str, list[AssignedTaskResponse]]
    stats: TaskBoardStats
    postes: dict[str, str]


class AssignedTaskCreate(BaseModel):
    title: str = Field(min_length=2, max_length=500)
    description: str = ""
    category: str = "general"
    poste: str = "all"
    priority: str = "moyenne"
    difficulty: str = "moyen"
    estimated_minutes: int = 60
    start_date: datetime | None = None
    due_date: datetime | None = None
    assignee_id: str | None = None
    status: str | None = None


class AssignedTaskUpdate(BaseModel):
    status: str | None = None
    priority: str | None = None
    progress: int | None = None
    sort_order: int | None = None
    assignee_id: str | None = None


class AssignTaskRequest(BaseModel):
    assignee_id: str | None = None


class UserTaskStatusUpdate(BaseModel):
    status: str
    progress: int | None = None
