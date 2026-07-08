from pydantic import BaseModel, Field


class MetricScores(BaseModel):
    productivity: float = Field(..., ge=0, le=100)
    cognitive_load: float = Field(..., ge=0, le=100)
    fatigue: float = Field(..., ge=0, le=100)
    declared_stress: int = Field(..., ge=1, le=10)
    completion_rate: float
    elapsed_minutes: float
    tasks_completed: int
    tasks_total: int
    chat_messages: int
    reorder_events: int


class StressPoint(BaseModel):
    time: str | None
    minute: int
    level: int = Field(..., ge=1, le=10)


class MetricsHistoryPoint(BaseModel):
    minute: int
    productivity: float
    cognitive_load: float
    fatigue: float
    stress: float


class SessionMetricsResponse(BaseModel):
    session_id: str
    phase: str
    mode: str
    current: MetricScores
    stress_series: list[StressPoint]
    history: list[MetricsHistoryPoint]
