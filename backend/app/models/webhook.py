"""SupportPilot AI — Webhook Model"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.workspace import Workspace


class WebhookEvent:
    """Webhook event types."""
    CHAT_CREATED = "chat.created"
    CHAT_MESSAGE = "chat.message"
    DOCUMENT_UPLOADED = "document.uploaded"
    DOCUMENT_PROCESSED = "document.processed"
    SUBSCRIPTION_UPDATED = "subscription.updated"
    SUBSCRIPTION_CREATED = "subscription.created"
    SUBSCRIPTION_CANCELED = "subscription.canceled"
    MEMBER_INVITED = "member.invited"
    KNOWLEDGE_GAP_DETECTED = "knowledge.gap_detected"
    TICKET_ESCALATED = "ticket.escalated"

    ALL = [
        CHAT_CREATED, CHAT_MESSAGE,
        DOCUMENT_UPLOADED, DOCUMENT_PROCESSED,
        SUBSCRIPTION_UPDATED, SUBSCRIPTION_CREATED, SUBSCRIPTION_CANCELED,
        MEMBER_INVITED, KNOWLEDGE_GAP_DETECTED, TICKET_ESCALATED,
    ]


class Webhook(Base, TimestampMixin):
    """Webhook configuration for a workspace."""
    __tablename__ = "webhooks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    url: Mapped[str] = mapped_column(String(2000), nullable=False)
    secret: Mapped[str] = mapped_column(String(255), nullable=False)
    events: Mapped[str] = mapped_column(Text, nullable=False)  # JSON array of event types
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500))
    failure_count: Mapped[int] = mapped_column(Integer, default=0)
    last_triggered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    workspace: Mapped[Workspace] = relationship("Workspace", back_populates="webhooks")

    def __repr__(self) -> str:
        return f"<Webhook id={self.id} workspace={self.workspace_id} url={self.url[:50]}>"
