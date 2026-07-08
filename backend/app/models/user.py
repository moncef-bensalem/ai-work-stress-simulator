from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import TimestampMixin, generate_uuid
from app.core.database import Base


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="user")
    team: Mapped[str | None] = mapped_column(String(50), nullable=True, default="developpement")
    poste: Mapped[str | None] = mapped_column(String(50), nullable=True, default="developpeur")
    badges: Mapped[str | None] = mapped_column(Text, nullable=True)
    webauthn_credential: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    face_descriptor: Mapped[str | None] = mapped_column(Text, nullable=True)
    preferences: Mapped[str | None] = mapped_column(Text, nullable=True)

    sessions = relationship("WorkSession", back_populates="user", cascade="all, delete-orphan")
