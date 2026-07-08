from pydantic import BaseModel, Field


class UserPreferences(BaseModel):
    theme: str = Field(default="auto", pattern="^(dark|light|auto)$")
    language: str = Field(default="fr", pattern="^(fr|en|ar)$")
    accent_color: str = Field(default="violet", pattern="^(violet|cyan|emerald|rose)$")
    font_family: str = Field(default="jakarta", pattern="^(jakarta|inter|mono)$")
    high_contrast: bool = False
    notifications: bool = True
    aria_volume: int = Field(default=80, ge=0, le=100)
    avatar_url: str | None = None


class UserPreferencesUpdate(BaseModel):
    theme: str | None = Field(default=None, pattern="^(dark|light|auto)$")
    language: str | None = Field(default=None, pattern="^(fr|en|ar)$")
    accent_color: str | None = Field(default=None, pattern="^(violet|cyan|emerald|rose)$")
    font_family: str | None = Field(default=None, pattern="^(jakarta|inter|mono)$")
    high_contrast: bool | None = None
    notifications: bool | None = None
    aria_volume: int | None = Field(default=None, ge=0, le=100)
    avatar_url: str | None = None
