"""SupportPilot AI — Usage Metric Model"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.workspace import Workspace


class UsageMetric(Base, TimestampMixin):
    """Tracks usage metrics per workspace for billing and analytics."""
    __tablename__ = "usage_metrics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    metric_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    metric_value: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    # Relationships
    workspace: Mapped[Workspace] = relationship("Workspace", back_populates="usage_metrics")

    def __repr__(self) -> str:
        return f"<UsageMetric workspace={self.workspace_id} name={self.metric_name} value={self.metric_value}>"
