"""SupportPilot AI — Billing Service Tests"""

from __future__ import annotations

import pytest

from app.services.billing_service import BillingService, BillingError, PLAN_DETAILS
from app.models.workspace import WorkspacePlan


class TestPlanDetails:
    """Test plan definitions."""

    def test_all_plans_defined(self):
        """Test that all plans have details."""
        assert WorkspacePlan.FREE in PLAN_DETAILS
        assert WorkspacePlan.STARTER in PLAN_DETAILS
        assert WorkspacePlan.PRO in PLAN_DETAILS
        assert WorkspacePlan.ENTERPRISE in PLAN_DETAILS

    def test_free_plan(self):
        """Test free plan details."""
        plan = PLAN_DETAILS[WorkspacePlan.FREE]
        assert plan["price_monthly"] == 0
        assert plan["limits"]["max_members"] == 2
        assert plan["limits"]["max_documents"] == 10
        assert plan["limits"]["max_messages_per_day"] == 50

    def test_starter_plan(self):
        """Test starter plan details."""
        plan = PLAN_DETAILS[WorkspacePlan.STARTER]
        assert plan["price_monthly"] == 29
        assert plan["limits"]["max_members"] == 5
        assert plan["limits"]["max_documents"] == 100

    def test_pro_plan(self):
        """Test pro plan details."""
        plan = PLAN_DETAILS[WorkspacePlan.PRO]
        assert plan["price_monthly"] == 99
        assert plan["limits"]["max_members"] == 25
        assert plan["limits"]["max_documents"] == 1000

    def test_enterprise_plan(self):
        """Test enterprise plan details."""
        plan = PLAN_DETAILS[WorkspacePlan.ENTERPRISE]
        assert plan["price_monthly"] == -1  # Custom
        assert plan["limits"]["max_members"] == -1  # Unlimited

    def test_all_plans_have_required_fields(self):
        """Test that all plans have required fields."""
        for plan_id, details in PLAN_DETAILS.items():
            assert "name" in details
            assert "price_monthly" in details
            assert "features" in details
            assert "limits" in details
            assert isinstance(details["features"], list)
            assert isinstance(details["limits"], dict)


class TestBillingService:
    """Test the billing service."""

    def test_get_plan_details(self):
        """Test getting plan details."""
        service = BillingService.__new__(BillingService)
        details = service.get_plan_details(WorkspacePlan.PRO)
        assert details["name"] == "Pro"
        assert details["price_monthly"] == 99

    def test_get_all_plans(self):
        """Test getting all plans."""
        service = BillingService.__new__(BillingService)
        plans = service.get_all_plans()
        assert len(plans) == 4
        plan_ids = [p["id"] for p in plans]
        assert WorkspacePlan.FREE in plan_ids
        assert WorkspacePlan.STARTER in plan_ids
        assert WorkspacePlan.PRO in plan_ids
        assert WorkspacePlan.ENTERPRISE in plan_ids

    def test_get_price_id_without_settings(self):
        """Test price ID lookup without full settings."""
        from app.config import get_settings
        service = BillingService.__new__(BillingService)
        service.settings = get_settings()
        price_id = service._get_price_id(WorkspacePlan.STARTER)
        # May be None if Stripe price IDs not configured
        assert price_id is None or isinstance(price_id, str)
