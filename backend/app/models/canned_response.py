"""SupportPilot AI — Canned Response Model"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.workspace import Workspace


class CannedResponse(Base, TimestampMixin):
    """Pre-written response templates for support agents."""
    __tablename__ = "canned_responses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    shortcut: Mapped[str | None] = mapped_column(String(50))
    category: Mapped[str | None] = mapped_column(String(100))
    tags: Mapped[str | None] = mapped_column(Text)
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    created_by: Mapped[str | None] = mapped_column(String(36))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    workspace: Mapped[Workspace] = relationship("Workspace")

    def __repr__(self) -> str:
        return f"<CannedResponse id={self.id} title={self.title}>"
