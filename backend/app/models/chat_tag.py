"""SupportPilot AI — Chat Tag Model"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Column, ForeignKey, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.chat import Chat
    from app.models.workspace import Workspace


chat_tag_association = Table(
    "chat_tag_association",
    Base.metadata,
    Column("chat_id", String(36), ForeignKey("chats.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", String(36), ForeignKey("chat_tags.id", ondelete="CASCADE"), primary_key=True),
)


class ChatTag(Base, TimestampMixin):
    """A label that can be assigned to chats for categorisation."""
    __tablename__ = "chat_tags"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str] = mapped_column(String(7), default="#6366f1")

    # Many-to-many with Chat
    chats: Mapped[list[Chat]] = relationship(
        "Chat", secondary=chat_tag_association, back_populates="tags", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<ChatTag id={self.id} name={self.name}>"
