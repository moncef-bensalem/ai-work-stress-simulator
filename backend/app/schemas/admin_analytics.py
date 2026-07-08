from pydantic import BaseModel


class HeatmapCell(BaseModel):
    day: int
    hour: int
    value: float
    sessions: int


class ModeDistribution(BaseModel):
    mode: str
    count: int
    label: str


class RadarMetric(BaseModel):
    mode: str
    productivity: float
    cognitive_load: float
    fatigue: float
    stress: float
    completion: float


class TimelineEvent(BaseModel):
    id: str
    type: str
    label: str
    user: str
    timestamp: str | None
    meta: str | None = None


class OpenSessionItem(BaseModel):
    id: str
    display_name: str
    user_name: str
    user_email: str
    mode: str
    phase: str
    elapsed_minutes: float
    started_at: str | None


class ConnectedUserItem(BaseModel):
    email: str
    full_name: str
    connections: int


class SessionsTrendPoint(BaseModel):
    date: str
    sessions: int
    completed: int
    avg_stress: float


class AdminAnalyticsResponse(BaseModel):
    heatmap: list[HeatmapCell]
    mode_distribution: list[ModeDistribution]
    radar_by_mode: list[RadarMetric]
    sessions_trend: list[SessionsTrendPoint]
    avg_stress_score: float
    completion_rate: float


class AdminLiveResponse(BaseModel):
    open_sessions: list[OpenSessionItem]
    connected_users: list[ConnectedUserItem]
    connected_count: int
    timeline: list[TimelineEvent]
    active_sessions: int
