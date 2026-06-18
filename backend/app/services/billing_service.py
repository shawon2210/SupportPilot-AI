"""SupportPilot AI — Billing Service

Handles Stripe integration for subscriptions, plans, and payments.
Supports: checkout sessions, webhook handling, plan management.
"""

from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import generate_uuid
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.workspace import Workspace, WorkspacePlan

logger = logging.getLogger("supportpilot.billing")


# ── Plan Definitions ──────────────────────────────────────────────

PLAN_DETAILS = {
    WorkspacePlan.FREE: {
        "name": "Free",
        "price_monthly": 0,
        "price_yearly": 0,
        "features": [
            "2 team members",
            "10 documents",
            "50 messages/day",
            "100MB storage",
            "Basic support",
        ],
        "limits": {
            "max_members": 2,
            "max_documents": 10,
            "max_messages_per_day": 50,
            "max_storage_mb": 100,
        },
    },
    WorkspacePlan.STARTER: {
        "name": "Starter",
        "price_monthly": 29,
        "price_yearly": 290,
        "features": [
            "5 team members",
            "100 documents",
            "500 messages/day",
            "1GB storage",
            "Email support",
            "Custom branding",
        ],
        "limits": {
            "max_members": 5,
            "max_documents": 100,
            "max_messages_per_day": 500,
            "max_storage_mb": 1024,
        },
    },
    WorkspacePlan.PRO: {
        "name": "Pro",
        "price_monthly": 99,
        "price_yearly": 990,
        "features": [
            "25 team members",
            "1,000 documents",
            "5,000 messages/day",
            "10GB storage",
            "Priority support",
            "API access",
            "Analytics",
        ],
        "limits": {
            "max_members": 25,
            "max_documents": 1000,
            "max_messages_per_day": 5000,
            "max_storage_mb": 10240,
        },
    },
    WorkspacePlan.ENTERPRISE: {
        "name": "Enterprise",
        "price_monthly": -1,  # Custom pricing
        "price_yearly": -1,
        "features": [
            "Unlimited members",
            "Unlimited documents",
            "Unlimited messages",
            "Unlimited storage",
            "Dedicated support",
            "SLA guarantee",
            "Custom integrations",
        ],
        "limits": {
            "max_members": -1,
            "max_documents": -1,
            "max_messages_per_day": -1,
            "max_storage_mb": -1,
        },
    },
}


class BillingService:
    """
    Service for billing and subscription management.
    
    Handles:
    - Plan information and pricing
    - Stripe checkout session creation
    - Webhook event processing
    - Subscription lifecycle management
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.settings = get_settings()

    # ── Plan Information ───────────────────────────────────────────

    def get_plan_details(self, plan: str) -> dict:
        """Get plan details including pricing and features."""
        return PLAN_DETAILS.get(plan, PLAN_DETAILS[WorkspacePlan.FREE])

    def get_all_plans(self) -> list[dict]:
        """Get all available plans."""
        result = []
        for plan_id, details in PLAN_DETAILS.items():
            result.append({
                "id": plan_id,
                **details,
            })
        return result

    async def get_current_subscription(self, workspace_id: str) -> Subscription | None:
        """Get the current subscription for a workspace."""
        stmt = select(Subscription).where(
            Subscription.workspace_id == workspace_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    # ── Stripe Checkout ────────────────────────────────────────────

    async def create_checkout_session(
        self,
        workspace_id: str,
        plan: str,
        user_email: str,
        success_url: str,
        cancel_url: str,
    ) -> dict:
        """
        Create a Stripe checkout session for upgrading a plan.
        
        Returns a dict with the checkout URL and session ID.
        """
        try:
            import stripe
        except ImportError:
            raise BillingError("Stripe library not installed. Run: pip install stripe")

        stripe.api_key = self.settings.STRIPE_SECRET_KEY

        if not stripe.api_key:
            raise BillingError("Stripe API key not configured")

        plan_details = self.get_plan_details(plan)

        # Get or create Stripe customer
        workspace = await self._get_workspace(workspace_id)
        customer_id = workspace.stripe_customer_id

        if not customer_id:
            customer = stripe.Customer.create(
                email=user_email,
                metadata={"workspace_id": workspace_id},
            )
            customer_id = customer.id
            workspace.stripe_customer_id = customer_id
            await self.db.flush()

        # Get price ID from settings
        price_id = self._get_price_id(plan)
        if not price_id:
            raise BillingError(f"No Stripe price ID configured for plan '{plan}'")

        # Create checkout session
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "workspace_id": workspace_id,
                "plan": plan,
            },
            subscription_data={
                "metadata": {
                    "workspace_id": workspace_id,
                    "plan": plan,
                },
            },
        )

        return {
            "checkout_url": session.url,
            "session_id": session.id,
        }

    async def create_portal_session(
        self,
        workspace_id: str,
        return_url: str,
    ) -> dict:
        """
        Create a Stripe customer portal session for managing subscriptions.
        """
        try:
            import stripe
        except ImportError:
            raise BillingError("Stripe library not installed")

        stripe.api_key = self.settings.STRIPE_SECRET_KEY

        workspace = await self._get_workspace(workspace_id)
        if not workspace.stripe_customer_id:
            raise BillingError("No Stripe customer found for this workspace")

        session = stripe.billing_portal.Session.create(
            customer=workspace.stripe_customer_id,
            return_url=return_url,
        )

        return {"portal_url": session.url}

    # ── Webhook Handling ───────────────────────────────────────────

    async def handle_webhook(self, payload: bytes, sig_header: str) -> dict:
        """
        Handle Stripe webhook events.
        
        Events handled:
        - checkout.session.completed: New subscription created
        - customer.subscription.updated: Plan changed
        - customer.subscription.deleted: Subscription cancelled
        - invoice.payment_failed: Payment failed
        """
        try:
            import stripe
        except ImportError:
            raise BillingError("Stripe library not installed")

        stripe.api_key = self.settings.STRIPE_SECRET_KEY

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, self.settings.STRIPE_WEBHOOK_SECRET
            )
        except Exception as e:
            raise BillingError(f"Webhook signature verification failed: {e}")

        event_type = event["type"]
        data = event["data"]["object"]

        logger.info("Processing Stripe webhook: %s", event_type)

        if event_type == "checkout.session.completed":
            await self._handle_checkout_completed(data)
        elif event_type == "customer.subscription.updated":
            await self._handle_subscription_updated(data)
        elif event_type == "customer.subscription.deleted":
            await self._handle_subscription_deleted(data)
        elif event_type == "invoice.payment_failed":
            await self._handle_payment_failed(data)

        return {"status": "ok", "event": event_type}

    async def _handle_checkout_completed(self, data: dict) -> None:
        """Handle new subscription after checkout."""
        workspace_id = data.get("metadata", {}).get("workspace_id")
        subscription_id = data.get("subscription")

        if not workspace_id:
            return

        workspace = await self._get_workspace(workspace_id)
        if not workspace:
            return

        # Get subscription details from Stripe
        import stripe
        stripe.api_key = self.settings.STRIPE_SECRET_KEY
        stripe_sub = stripe.Subscription.retrieve(subscription_id)

        plan = stripe_sub.metadata.get("plan", WorkspacePlan.STARTER)

        # Update or create subscription
        subscription = await self.get_current_subscription(workspace_id)
        if subscription:
            subscription.stripe_subscription_id = subscription_id
            subscription.plan = plan
            subscription.status = SubscriptionStatus.ACTIVE
            subscription.current_period_start = datetime.fromtimestamp(
                stripe_sub.current_period_start
            )
            subscription.current_period_end = datetime.fromtimestamp(
                stripe_sub.current_period_end
            )
        else:
            subscription = Subscription(
                id=generate_uuid(),
                workspace_id=workspace_id,
                stripe_subscription_id=subscription_id,
                plan=plan,
                status=SubscriptionStatus.ACTIVE,
                current_period_start=datetime.fromtimestamp(
                    stripe_sub.current_period_start
                ),
                current_period_end=datetime.fromtimestamp(
                    stripe_sub.current_period_end
                ),
            )
            self.db.add(subscription)

        # Update workspace plan
        workspace.plan = plan
        workspace.stripe_subscription_id = subscription_id
        workspace.plan_limits = __import__("json").dumps(
            PLAN_DETAILS.get(plan, {}).get("limits", {})
        )

        await self.db.flush()
        logger.info("Subscription activated for workspace %s: %s", workspace_id, plan)

    async def _handle_subscription_updated(self, data: dict) -> None:
        """Handle subscription updates (plan changes, renewals)."""
        workspace_id = data.get("metadata", {}).get("workspace_id")
        if not workspace_id:
            return

        subscription = await self.get_current_subscription(workspace_id)
        if not subscription:
            return

        # Update status and period
        stripe_status = data.get("status", "active")
        status_map = {
            "active": SubscriptionStatus.ACTIVE,
            "canceled": SubscriptionStatus.CANCELED,
            "past_due": SubscriptionStatus.PAST_DUE,
            "trialing": SubscriptionStatus.TRIALING,
        }
        subscription.status = status_map.get(stripe_status, SubscriptionStatus.ACTIVE)
        subscription.current_period_start = datetime.fromtimestamp(
            data.get("current_period_start", 0)
        )
        subscription.current_period_end = datetime.fromtimestamp(
            data.get("current_period_end", 0)
        )
        subscription.cancel_at_period_end = data.get("cancel_at_period_end", False)

        await self.db.flush()

    async def _handle_subscription_deleted(self, data: dict) -> None:
        """Handle subscription cancellation."""
        workspace_id = data.get("metadata", {}).get("workspace_id")
        if not workspace_id:
            return

        subscription = await self.get_current_subscription(workspace_id)
        if subscription:
            subscription.status = SubscriptionStatus.CANCELED
            await self.db.flush()

        # Downgrade workspace to free
        workspace = await self._get_workspace(workspace_id)
        if workspace:
            workspace.plan = WorkspacePlan.FREE
            workspace.plan_limits = __import__("json").dumps(
                PLAN_DETAILS[WorkspacePlan.FREE]["limits"]
            )
            await self.db.flush()

    async def _handle_payment_failed(self, data: dict) -> None:
        """Handle failed payment."""
        subscription_id = data.get("subscription")
        if not subscription_id:
            return

        # Find the subscription
        stmt = select(Subscription).where(
            Subscription.stripe_subscription_id == subscription_id,
        )
        result = await self.db.execute(stmt)
        subscription = result.scalar_one_or_none()

        if subscription:
            subscription.status = SubscriptionStatus.PAST_DUE
            await self.db.flush()
            logger.warning(
                "Payment failed for workspace %s", subscription.workspace_id
            )

    # ── Helpers ────────────────────────────────────────────────────

    async def _get_workspace(self, workspace_id: str) -> Workspace | None:
        """Get workspace by ID."""
        stmt = select(Workspace).where(Workspace.id == workspace_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    def _get_price_id(self, plan: str) -> str | None:
        """Get the Stripe price ID for a plan."""
        price_map = {
            WorkspacePlan.STARTER: self.settings.STRIPE_PRICE_STARTER,
            WorkspacePlan.PRO: self.settings.STRIPE_PRICE_PRO,
        }
        return price_map.get(plan)


class BillingError(Exception):
    """Raised when billing operations fail."""
    pass
