from pydantic import BaseModel


class UserStatsResponse(BaseModel):
    total_sessions: int
    completed_tasks: int
    average_stress: float
    last_mode: str | None
    last_phase: str | None


class SessionSummary(BaseModel):
    id: str
    display_name: str
    mode: str
    phase: str
    started_at: str | None
    ended_at: str | None = None
    stress_score: int | None = None
    tasks_completed: int
    tasks_total: int

    model_config = {"from_attributes": True}


class CalendarDay(BaseModel):
    date: str
    sessions: list[SessionSummary]


class CalendarResponse(BaseModel):
    year: int
    month: int
    days: list[CalendarDay]


class UserBadge(BaseModel):
    id: str
    emoji: str
    label: str
    new: bool


class BadgesResponse(BaseModel):
    badges: list[UserBadge]
