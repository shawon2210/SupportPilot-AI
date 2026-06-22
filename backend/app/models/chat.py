"""SupportPilot AI — Chat and Message Models"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.chat_tag import ChatTag
    from app.models.message import Message
    from app.models.user import User
    from app.models.workspace import Workspace


class ChatStatus:
    ACTIVE = "active"
    WAITING = "waiting"       # escalated, waiting for human
    CLOSED = "closed"
    ARCHIVED = "archived"

    ALL = [ACTIVE, WAITING, CLOSED, ARCHIVED]


class ChatMode:
    AI = "ai"
    HYBRID = "hybrid"  # AI + human escalation

    ALL = [AI, HYBRID]


class Chat(Base, TimestampMixin):
    """A conversation session within a workspace."""
    __tablename__ = "chats"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str | None] = mapped_column(
        String(255), ForeignKey("users.id", ondelete="SET NULL")
    )
    title: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), default=ChatStatus.ACTIVE, nullable=False)
    assigned_to: Mapped[str | None] = mapped_column(
        String(255), ForeignKey("users.id", ondelete="SET NULL"), default=None
    )
    mode: Mapped[str] = mapped_column(String(10), default="ai")  # "ai" | "hybrid"
    metadata_: Mapped[str | None] = mapped_column("metadata", Text, default="{}")

    # Relationships
    workspace: Mapped[Workspace] = relationship("Workspace", back_populates="chats")
    assigned_user: Mapped[User | None] = relationship("User", foreign_keys=[assigned_to], lazy="selectin")
    messages: Mapped[list[Message]] = relationship(
        "Message", back_populates="chat", lazy="selectin",
        cascade="all, delete-orphan", order_by="Message.created_at"
    )
    tags: Mapped[list[ChatTag]] = relationship(
        "ChatTag", secondary="chat_tag_association", back_populates="chats", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Chat id={self.id} workspace={self.workspace_id} status={self.status}>"
