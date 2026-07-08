from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class ChatMessage(Base, TimestampMixin):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("sessions.id"), nullable=False)
    sender: Mapped[str] = mapped_column(String(10), nullable=False)  # "user" | "aria"
    content: Mapped[str] = mapped_column(Text, nullable=False)

    session = relationship("WorkSession", back_populates="chat_messages")
