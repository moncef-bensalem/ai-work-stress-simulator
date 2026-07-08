from datetime import datetime

from pydantic import BaseModel


class MetricScoresResponse(BaseModel):
    productivity: float
    cognitive_load: float
    fatigue: float
    declared_stress: int
    completion_rate: float
    elapsed_minutes: float
    tasks_completed: int
    tasks_total: int
    chat_messages: int
    reorder_events: int


class BehaviorAnalysisResponse(BaseModel):
    observations: list[str]
    coaching: str
    advice: str
    signals: dict


class BadgeResponse(BaseModel):
    id: str
    emoji: str
    label: str
    new: bool


class SessionReportResponse(BaseModel):
    session_id: str
    display_name: str
    mode: str
    mode_label: str
    phase: str
    phase_label: str
    started_at: datetime | None
    ended_at: datetime | None
    elapsed_minutes: float
    stress_score: int
    stress_label: str
    metrics: MetricScoresResponse
    stress_series: list[dict]
    history: list[dict]
    recommendations: list[str]
    behavior_analysis: BehaviorAnalysisResponse | None = None
    badges_earned: list[BadgeResponse] = []
    disclaimer: str
