"""SupportPilot AI — Conversation Rating Model"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.chat import Chat
    from app.models.workspace import Workspace


class ConversationRating(Base, TimestampMixin):
    """CSAT rating left by a user after a chat is closed."""
    __tablename__ = "conversation_ratings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    chat_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("chats.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    workspace_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text)

    # Relationships
    chat: Mapped[Chat] = relationship("Chat")
    workspace: Mapped[Workspace] = relationship("Workspace")

    def __repr__(self) -> str:
        return f"<ConversationRating chat={self.chat_id} score={self.score}>"
