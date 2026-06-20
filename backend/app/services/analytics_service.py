"""SupportPilot AI — Analytics Service

Tracks and reports on key SaaS metrics:
- Signups, active users
- Documents uploaded, messages sent
- Widget usage, knowledge searches
- Conversion events (plan upgrades)
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.audit_log import AuditLog
from app.models.chat import Chat
from app.models.knowledge_source import KnowledgeSource
from app.models.message import Message
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.usage_metric import UsageMetric
from app.models.user import User
from app.models.workspace import Workspace

logger = logging.getLogger("supportpilot.analytics")


class AnalyticsService:
    """
    Service for tracking and querying analytics data.
    
    Integrates with PostHog for product analytics.
    Falls back to local tracking if PostHog is not configured.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.settings = get_settings()

    # ── Event Tracking ─────────────────────────────────────────────

    async def track_event(
        self,
        workspace_id: str,
        event_name: str,
        properties: dict | None = None,
        user_id: str | None = None,
    ) -> None:
        """
        Track an analytics event.
        
        Records locally in audit_logs and optionally sends to PostHog.
        """
        # Local tracking
        log = AuditLog(
            id=str(__import__("uuid").uuid4()),
            workspace_id=workspace_id,
            user_id=user_id,
            action=f"analytics.{event_name}",
            resource_type="event",
            details=__import__("json").dumps(properties or {}),
        )
        self.db.add(log)

        # PostHog tracking (async fire-and-forget)
        if self.settings.POSTHOG_API_KEY:
            try:
                await self._send_to_posthog(
                    event=event_name,
                    properties=properties or {},
                    distinct_id=user_id or workspace_id,
                )
            except Exception as e:
                logger.warning("PostHog tracking failed: %s", e)

    async def _send_to_posthog(
        self,
        event: str,
        properties: dict,
        distinct_id: str,
    ) -> None:
        """Send an event to PostHog."""
        import httpx

        await httpx.AsyncClient().post(
            f"{self.settings.POSTHOG_HOST}/capture/",
            json={
                "api_key": self.settings.POSTHOG_API_KEY,
                "event": event,
                "properties": properties,
                "distinct_id": distinct_id,
                "timestamp": datetime.utcnow().isoformat(),
            },
            timeout=5.0,
        )

    # ── Dashboard Metrics ──────────────────────────────────────────

    async def get_workspace_analytics(
        self,
        workspace_id: str,
        days: int = 30,
    ) -> dict:
        """
        Get comprehensive analytics for a workspace dashboard.
        
        Returns metrics for:
        - Messages sent
        - Chats created
        - Documents uploaded
        - Knowledge searches
        - Token usage
        - Active users
        """
        start_date = datetime.utcnow() - timedelta(days=days)

        # Messages
        messages_count = await self._count(
            Message, Message.workspace_id == workspace_id,
            Message.created_at >= start_date,
        )

        # Chats
        chats_count = await self._count(
            Chat, Chat.workspace_id == workspace_id,
            Chat.created_at >= start_date,
        )

        # Documents
        documents_count = await self._count(
            KnowledgeSource, KnowledgeSource.workspace_id == workspace_id,
            KnowledgeSource.created_at >= start_date,
        )

        # Total documents (not just new)
        total_documents = await self._count(
            KnowledgeSource, KnowledgeSource.workspace_id == workspace_id,
        )

        # Token usage
        token_usage = await self._sum_metric(workspace_id, "tokens", start_date)

        # Messages per day
        messages_per_day = await self._daily_counts(
            Message, workspace_id, "messages", days,
        )

        # Average response time (from message metadata)
        avg_response_time = await self._avg_response_time(workspace_id, start_date)

        return {
            "period_days": days,
            "messages_sent": messages_count,
            "chats_created": chats_count,
            "documents_uploaded": documents_count,
            "total_documents": total_documents,
            "token_usage": token_usage,
            "messages_per_day": messages_per_day,
            "avg_response_time_ms": avg_response_time,
        }

    async def get_platform_analytics(
        self,
        days: int = 30,
    ) -> dict:
        """
        Get platform-wide analytics (admin only).
        
        Returns:
        - Total workspaces
        - Total users
        - Total messages
        - Plan distribution
        - Recent signups
        """
        start_date = datetime.utcnow() - timedelta(days=days)

        # Total workspaces
        total_workspaces = await self._count(Workspace)

        # Total users
        total_users = await self._count(User)

        # Total messages in period
        messages_count = await self._count(
            Message, Message.created_at >= start_date,
        )

        # Plan distribution
        plan_dist = await self._plan_distribution()

        # Recent signups
        recent_signups = await self._count(
            Workspace, Workspace.created_at >= start_date,
        )

        # Active subscriptions
        active_subscriptions = await self._count(
            Subscription,
            Subscription.status.in_([
                SubscriptionStatus.ACTIVE,
                SubscriptionStatus.TRIALING,
                SubscriptionStatus.PAST_DUE,
            ]),
        )

        # Revenue is not stored in the current schema; keep the admin metric explicit.
        total_revenue = 0.0

        return {
            "period_days": days,
            "total_workspaces": total_workspaces,
            "total_users": total_users,
            "messages_sent": messages_count,
            "plan_distribution": plan_dist,
            "recent_signups": recent_signups,
            "active_subscriptions": active_subscriptions,
            "total_revenue": total_revenue,
        }

    # ── Audit Log Querying ─────────────────────────────────────────

    async def get_audit_logs(
        self,
        workspace_id: str,
        *,
        action: str | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> list[AuditLog]:
        """Get audit logs for a workspace."""
        stmt = select(AuditLog).where(
            AuditLog.workspace_id == workspace_id,
        )
        if action:
            stmt = stmt.where(AuditLog.action == action)

        stmt = stmt.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # ── Internal Helpers ───────────────────────────────────────────

    async def _count(self, model, *conditions) -> int:
        """Count records matching conditions."""
        stmt = select(func.count()).select_from(model)
        for condition in conditions:
            stmt = stmt.where(condition)
        result = await self.db.execute(stmt)
        return result.scalar_one() or 0

    async def _sum_metric(
        self,
        workspace_id: str,
        metric_name: str,
        start_date: datetime,
    ) -> int:
        """Sum a usage metric."""
        stmt = select(func.sum(UsageMetric.metric_value)).where(
            UsageMetric.workspace_id == workspace_id,
            UsageMetric.metric_name == metric_name,
            UsageMetric.recorded_at >= start_date,
        )
        result = await self.db.execute(stmt)
        return int(result.scalar_one() or 0)

    async def _daily_counts(
        self,
        model,
        workspace_id: str,
        metric_name: str,
        days: int,
    ) -> list[dict]:
        """Get daily counts for a model."""
        start_date = datetime.utcnow() - timedelta(days=days)

        stmt = select(
            func.date(model.created_at).label("date"),
            func.count().label("count"),
        ).where(
            model.workspace_id == workspace_id,
            model.created_at >= start_date,
        ).group_by(
            func.date(model.created_at),
        ).order_by(
            func.date(model.created_at),
        )

        result = await self.db.execute(stmt)
        return [
            {"date": str(row.date), "value": row.count}
            for row in result.all()
        ]

    async def _avg_response_time(
        self,
        workspace_id: str,
        start_date: datetime,
    ) -> float:
        """Calculate average response time from message metadata."""
        stmt = select(Message).where(
            Message.workspace_id == workspace_id,
            Message.role == "assistant",
            Message.created_at >= start_date,
        ).limit(100)

        result = await self.db.execute(stmt)
        messages = list(result.scalars().all())

        response_times = []
        for msg in messages:
            try:
                import json
                meta = json.loads(msg.metadata_ or "{}")
                if "response_time_ms" in meta:
                    response_times.append(meta["response_time_ms"])
            except (json.JSONDecodeError, TypeError):
                continue

        if not response_times:
            return 0.0

        return sum(response_times) / len(response_times)

    async def _plan_distribution(self) -> dict:
        """Get distribution of workspaces across plans."""
        stmt = select(
            Workspace.plan,
            func.count().label("count"),
        ).group_by(Workspace.plan)

        result = await self.db.execute(stmt)
        return {row.plan: row.count for row in result.all()}
