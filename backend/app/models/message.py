"""SupportPilot AI — Message Model"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.chat import Chat
    from app.models.workspace import Workspace


class MessageRole:
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

    ALL = [USER, ASSISTANT, SYSTEM]


class Message(Base, TimestampMixin):
    """A single message within a chat conversation."""
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    chat_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("chats.id", ondelete="CASCADE"), nullable=False, index=True
    )
    workspace_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sources: Mapped[str | None] = mapped_column(Text, default="[]")  # JSON array of citations
    tokens_used: Mapped[int | None] = mapped_column(Integer)
    metadata_: Mapped[str | None] = mapped_column("metadata", Text, default="{}")

    # Relationships
    chat: Mapped[Chat] = relationship("Chat", back_populates="messages")
    workspace: Mapped[Workspace] = relationship("Workspace")

    def __repr__(self) -> str:
        return f"<Message id={self.id} chat={self.chat_id} role={self.role}>"
