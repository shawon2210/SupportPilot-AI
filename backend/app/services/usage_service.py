"""SupportPilot AI — Usage Tracking Service

Tracks and enforces usage limits per workspace based on their plan.
Used for billing, analytics, and plan limit enforcement.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.usage_metric import UsageMetric
from app.models.workspace import Workspace, WorkspacePlan

logger = logging.getLogger("supportpilot.usage")


class UsageService:
    """
    Tracks and queries usage metrics for workspaces.
    
    Enforces plan limits:
    - Free: 2 members, 10 docs, 50 messages/day, 100MB storage
    - Starter: 5 members, 100 docs, 500 messages/day, 1GB storage
    - Pro: 25 members, 1000 docs, 5000 messages/day, 10GB storage
    - Enterprise: unlimited
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Recording Metrics ───────────────────────────────────────────

    async def record(
        self,
        workspace_id: str,
        metric_name: str,
        value: int = 1,
    ) -> None:
        """Record a usage metric."""
        metric = UsageMetric(
            id=str(__import__("uuid").uuid4()),
            workspace_id=workspace_id,
            metric_name=metric_name,
            metric_value=value,
        )
        self.db.add(metric)

    # ── Querying Metrics ───────────────────────────────────────────

    async def get_usage(
        self,
        workspace_id: str,
        metric_name: str,
        *,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> int:
        """Get total usage for a metric in a date range."""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()

        stmt = select(func.sum(UsageMetric.metric_value)).where(
            UsageMetric.workspace_id == workspace_id,
            UsageMetric.metric_name == metric_name,
            UsageMetric.recorded_at >= start_date,
            UsageMetric.recorded_at <= end_date,
        )
        result = await self.db.execute(stmt)
        return int(result.scalar_one() or 0)

    async def get_daily_usage(
        self,
        workspace_id: str,
        metric_name: str,
        days: int = 30,
    ) -> list[dict]:
        """Get daily usage breakdown for the last N days."""
        start_date = datetime.utcnow() - timedelta(days=days)

        stmt = select(
            func.date(UsageMetric.recorded_at).label("date"),
            func.sum(UsageMetric.metric_value).label("total"),
        ).where(
            UsageMetric.workspace_id == workspace_id,
            UsageMetric.metric_name == metric_name,
            UsageMetric.recorded_at >= start_date,
        ).group_by(
            func.date(UsageMetric.recorded_at),
        ).order_by(
            func.date(UsageMetric.recorded_at),
        )

        result = await self.db.execute(stmt)
        rows = result.all()

        return [
            {"date": str(row.date), "value": int(row.total)}
            for row in rows
        ]

    async def get_overview(
        self,
        workspace_id: str,
        days: int = 30,
    ) -> dict:
        """Get a usage overview for the dashboard."""
        metrics = ["messages", "tokens", "documents", "searches"]
        overview = {}

        for metric in metrics:
            overview[metric] = await self.get_usage(
                workspace_id, metric,
                start_date=datetime.utcnow() - timedelta(days=days),
            )

        return overview

    # ── Plan Limit Enforcement ─────────────────────────────────────

    async def check_limit(
        self,
        workspace_id: str,
        limit_name: str,
        current_value: int | None = None,
    ) -> dict:
        """
        Check if a workspace is within its plan limit.
        
        Args:
            workspace_id: Workspace to check
            limit_name: One of: max_members, max_documents, max_messages_per_day, max_storage_mb
            current_value: Current usage (if None, will be queried)
            
        Returns:
            Dict with limit info: {allowed, limit, remaining, within_limit}
        """
        stmt = select(Workspace).where(Workspace.id == workspace_id)
        result = await self.db.execute(stmt)
        workspace = result.scalar_one_or_none()

        if not workspace:
            return {"allowed": False, "limit": 0, "remaining": 0, "within_limit": False}

        limits = workspace.get_plan_limits()
        limit = limits.get(limit_name, 0)

        # -1 means unlimited
        if limit == -1:
            return {"allowed": True, "limit": -1, "remaining": -1, "within_limit": True}

        if current_value is None:
            # Query current usage based on limit type
            if limit_name == "max_messages_per_day":
                current_value = await self.get_usage(
                    workspace_id, "messages",
                    start_date=datetime.utcnow().replace(hour=0, minute=0, second=0),
                )
            elif limit_name == "max_documents":
                from app.models.knowledge_source import KnowledgeSource
                stmt = select(func.count()).select_from(KnowledgeSource).where(
                    KnowledgeSource.workspace_id == workspace_id,
                )
                result = await self.db.execute(stmt)
                current_value = result.scalar_one() or 0
            elif limit_name == "max_members":
                from app.models.member import WorkspaceMember
                stmt = select(func.count()).select_from(WorkspaceMember).where(
                    WorkspaceMember.workspace_id == workspace_id,
                    WorkspaceMember.is_active == True,  # noqa: E712
                )
                result = await self.db.execute(stmt)
                current_value = result.scalar_one() or 0

        remaining = max(0, limit - current_value)
        within_limit = current_value < limit

        return {
            "allowed": within_limit,
            "limit": limit,
            "remaining": remaining,
            "current": current_value,
            "within_limit": within_limit,
        }

    async def enforce_limit(
        self,
        workspace_id: str,
        limit_name: str,
    ) -> None:
        """
        Enforce a plan limit. Raises HTTPException if exceeded.
        """
        from fastapi import HTTPException

        check = await self.check_limit(workspace_id, limit_name)

        if not check["within_limit"]:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "PLAN_LIMIT_EXCEEDED",
                    "message": f"Plan limit exceeded for '{limit_name}'. "
                               f"Current: {check['current']}, Limit: {check['limit']}. "
                               f"Upgrade your plan for higher limits.",
                    "limit_name": limit_name,
                    "current": check["current"],
                    "limit": check["limit"],
                },
            )
