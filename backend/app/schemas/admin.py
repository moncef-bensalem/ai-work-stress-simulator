from pydantic import BaseModel, EmailStr, Field


class AdminStatsResponse(BaseModel):
    total_users: int
    total_sessions: int
    active_sessions: int
    average_stress: float


class AdminUserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    team: str | None = None
    poste: str | None = None
    sessions_count: int
    created_at: str | None


class AdminUserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2)
    password: str = Field(min_length=6)
    role: str = "user"
    team: str = "developpement"
    poste: str = "developpeur"


class AdminUserUpdate(BaseModel):
    full_name: str | None = None
    role: str | None = None
    password: str | None = None
    team: str | None = None
    poste: str | None = None
