"""SupportPilot AI — Widget Config Model"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.workspace import Workspace


class WidgetConfig(Base, TimestampMixin):
    """Configuration for the embeddable chat widget."""
    __tablename__ = "widget_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    theme: Mapped[str] = mapped_column(String(10), default="light", nullable=False)
    primary_color: Mapped[str] = mapped_column(String(7), default="#3B82F6")
    greeting_message: Mapped[str] = mapped_column(String(500), default="Hi! How can I help you?")
    placeholder_text: Mapped[str] = mapped_column(String(200), default="Type your message...")
    position: Mapped[str] = mapped_column(String(5), default="right", nullable=False)
    show_branding: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allowed_domains: Mapped[str | None] = mapped_column(Text, default="[]")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    workspace: Mapped[Workspace] = relationship("Workspace", back_populates="widget_config")

    def __repr__(self) -> str:
        return f"<WidgetConfig workspace={self.workspace_id} theme={self.theme}>"
