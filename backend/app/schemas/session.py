from datetime import datetime

from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    display_name: str = Field(min_length=2, max_length=255)
    mode: str = Field(default="bienveillante", pattern="^(bienveillante|exigeante|toxique)$")


class SessionResponse(BaseModel):
    id: str
    display_name: str
    mode: str
    phase: str
    started_at: datetime | None
    ended_at: datetime | None

    model_config = {"from_attributes": True}


class StressEntryCreate(BaseModel):
    level: int = Field(ge=1, le=10)


class StressEntryResponse(BaseModel):
    id: str
    level: int
    recorded_at: datetime

    model_config = {"from_attributes": True}
