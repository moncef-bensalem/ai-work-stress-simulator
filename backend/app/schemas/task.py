from datetime import datetime

from pydantic import BaseModel, Field


class TaskResponse(BaseModel):
    id: str
    session_id: str
    title: str
    description: str
    category: str
    status: str
    sort_order: int
    allocated_minutes: int
    deadline: datetime | None

    model_config = {"from_attributes": True}


class TaskUpdate(BaseModel):
    status: str | None = Field(default=None, pattern="^(pending|in_progress|completed|delegated)$")
    sort_order: int | None = None
