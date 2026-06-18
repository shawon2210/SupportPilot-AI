"""SupportPilot AI — Knowledge Gap Model"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.workspace import Workspace


class KnowledgeGap(Base, TimestampMixin):
    """
    Tracks questions that the AI couldn't answer well from the knowledge base.
    Used to identify content gaps and improve the knowledge base over time.
    """
    __tablename__ = "knowledge_gaps"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    query: Mapped[str] = mapped_column(Text, nullable=False)
    chat_id: Mapped[str | None] = mapped_column(String(36), index=True)
    message_id: Mapped[str | None] = mapped_column(String(36))
    confidence_score: Mapped[float | None] = mapped_column()  # The AI's confidence (0-1)
    occurrence_count: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="open", nullable=False)
    # open, resolved, ignored
    suggested_action: Mapped[str | None] = mapped_column(Text)
    resolved_by: Mapped[str | None] = mapped_column(String(255))
    resolution_notes: Mapped[str | None] = mapped_column(Text)

    # Relationships
    workspace: Mapped[Workspace] = relationship("Workspace", back_populates="knowledge_gaps")

    def __repr__(self) -> str:
        return f"<KnowledgeGap id={self.id} query={self.query[:50]} occurrences={self.occurrence_count}>"
