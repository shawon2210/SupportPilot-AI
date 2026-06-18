"""SupportPilot AI — Usage Service Tests"""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.services.usage_service import UsageService
from app.models.workspace import WorkspacePlan


class TestUsageService:
    """Test the usage tracking service."""

    def test_service_initialization(self, db):
        """Test service initializes correctly."""
        import asyncio

        async def _test():
            service = UsageService(db)
            assert service.db is not None

        asyncio.get_event_loop().run_until_complete(_test())


class TestPlanLimits:
    """Test plan limit definitions."""

    def test_free_plan_limits(self):
        """Test free plan limits."""
        limits = WorkspacePlan.LIMITS[WorkspacePlan.FREE]
        assert limits["max_members"] == 2
        assert limits["max_documents"] == 10
        assert limits["max_messages_per_day"] == 50
        assert limits["max_storage_mb"] == 100

    def test_enterprise_unlimited(self):
        """Test enterprise plan has unlimited (-1) limits."""
        limits = WorkspacePlan.LIMITS[WorkspacePlan.ENTERPRISE]
        assert limits["max_members"] == -1
        assert limits["max_documents"] == -1
        assert limits["max_messages_per_day"] == -1
        assert limits["max_storage_mb"] == -1

    def test_plan_limits_progression(self):
        """Test that limits increase with plan tier."""
        free = WorkspacePlan.LIMITS[WorkspacePlan.FREE]
        starter = WorkspacePlan.LIMITS[WorkspacePlan.STARTER]
        pro = WorkspacePlan.LIMITS[WorkspacePlan.PRO]

        assert free["max_members"] < starter["max_members"] < pro["max_members"]
        assert free["max_documents"] < starter["max_documents"] < pro["max_documents"]
        assert free["max_messages_per_day"] < starter["max_messages_per_day"] < pro["max_messages_per_day"]
