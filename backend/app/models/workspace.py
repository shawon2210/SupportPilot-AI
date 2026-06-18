"""SupportPilot AI — Workspace Model"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.api_key import ApiKey
    from app.models.audit_log import AuditLog
    from app.models.chat import Chat
    from app.models.document_chunk import DocumentChunk
    from app.models.knowledge_gap import KnowledgeGap
    from app.models.knowledge_source import KnowledgeSource
    from app.models.member import WorkspaceMember
    from app.models.subscription import Subscription
    from app.models.usage_metric import UsageMetric
    from app.models.webhook import Webhook
    from app.models.widget_config import WidgetConfig


class WorkspacePlan:
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"

    ALL = [FREE, STARTER, PRO, ENTERPRISE]

    # Default limits per plan
    LIMITS = {
        FREE: {
            "max_members": 2,
            "max_documents": 10,
            "max_messages_per_day": 50,
            "max_storage_mb": 100,
        },
        STARTER: {
            "max_members": 5,
            "max_documents": 100,
            "max_messages_per_day": 500,
            "max_storage_mb": 1024,
        },
        PRO: {
            "max_members": 25,
            "max_documents": 1000,
            "max_messages_per_day": 5000,
            "max_storage_mb": 10240,
        },
        ENTERPRISE: {
            "max_members": -1,  # unlimited
            "max_documents": -1,
            "max_messages_per_day": -1,
            "max_storage_mb": -1,
        },
    }


class Workspace(Base, TimestampMixin):
    """
    Workspace — the top-level tenant container.
    Every resource in the system belongs to a workspace.
    """
    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    logo_url: Mapped[str | None] = mapped_column(String(500))
    settings: Mapped[str | None] = mapped_column(Text, default="{}")
    plan: Mapped[str] = mapped_column(String(20), default=WorkspacePlan.FREE, nullable=False)
    plan_limits: Mapped[str | None] = mapped_column(Text, default="{}")
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), index=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    members: Mapped[list[WorkspaceMember]] = relationship(
        "WorkspaceMember", back_populates="workspace", lazy="selectin", cascade="all, delete-orphan"
    )
    knowledge_sources: Mapped[list[KnowledgeSource]] = relationship(
        "KnowledgeSource", back_populates="workspace", lazy="selectin", cascade="all, delete-orphan"
    )
    document_chunks: Mapped[list[DocumentChunk]] = relationship(
        "DocumentChunk", back_populates="workspace", lazy="selectin", cascade="all, delete-orphan"
    )
    chats: Mapped[list[Chat]] = relationship(
        "Chat", back_populates="workspace", lazy="selectin", cascade="all, delete-orphan"
    )
    widget_config: Mapped[WidgetConfig | None] = relationship(
        "WidgetConfig", back_populates="workspace", lazy="selectin", cascade="all, delete-orphan", uselist=False
    )
    api_keys: Mapped[list[ApiKey]] = relationship(
        "ApiKey", back_populates="workspace", lazy="selectin", cascade="all, delete-orphan"
    )
    usage_metrics: Mapped[list[UsageMetric]] = relationship(
        "UsageMetric", back_populates="workspace", lazy="selectin", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[list[AuditLog]] = relationship(
        "AuditLog", back_populates="workspace", lazy="selectin", cascade="all, delete-orphan"
    )
    webhooks: Mapped[list[Webhook]] = relationship(
        "Webhook", back_populates="workspace", lazy="selectin", cascade="all, delete-orphan"
    )
    knowledge_gaps: Mapped[list[KnowledgeGap]] = relationship(
        "KnowledgeGap", back_populates="workspace", lazy="selectin", cascade="all, delete-orphan"
    )
    subscription: Mapped[Subscription | None] = relationship(
        "Subscription", back_populates="workspace", lazy="selectin", cascade="all, delete-orphan", uselist=False
    )

    def get_plan_limits(self) -> dict:
        """Get plan limits, merging defaults with any custom overrides."""
        import json
        defaults = WorkspacePlan.LIMITS.get(self.plan, WorkspacePlan.LIMITS[WorkspacePlan.FREE]).copy()
        if self.plan_limits:
            try:
                overrides = json.loads(self.plan_limits)
                defaults.update(overrides)
            except (json.JSONDecodeError, TypeError):
                pass
        return defaults

    def __repr__(self) -> str:
        return f"<Workspace id={self.id} name={self.name} slug={self.slug}>"
