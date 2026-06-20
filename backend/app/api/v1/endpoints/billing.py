"""SupportPilot AI — Billing Endpoints

Plan management, checkout, webhooks, and subscription management.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.core.rbac import require_role
from app.services.billing_service import BillingService, BillingError

router = APIRouter()


# ── Plans ─────────────────────────────────────────────────────────

@router.get("/billing/plans")
async def list_plans():
    """List all available plans with pricing and features."""
    service = BillingService(None)  # No DB needed for plan listing
    return {"success": True, "data": service.get_all_plans()}


@router.get("/billing/plans/{plan_id}")
async def get_plan(plan_id: str):
    """Get details for a specific plan."""
    service = BillingService(None)
    details = service.get_plan_details(plan_id)
    return {"success": True, "data": {"id": plan_id, **details}}


# ── Subscription Management ───────────────────────────────────────

@router.get("/workspaces/{workspace_id}/billing/subscription")
async def get_subscription(
    workspace_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("admin")),
):
    """Get current subscription details for a workspace."""
    service = BillingService(db)
    sub = await service.get_current_subscription(workspace_id)
    if not sub:
        return {"success": True, "data": None}

    return {
        "success": True,
        "data": {
            "id": sub.id,
            "plan": sub.plan,
            "status": sub.status,
            "current_period_start": sub.current_period_start.isoformat() if sub.current_period_start else None,
            "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
            "cancel_at_period_end": sub.cancel_at_period_end,
        },
    }


# ── Checkout ──────────────────────────────────────────────────────

@router.post("/workspaces/{workspace_id}/billing/checkout")
async def create_checkout(
    workspace_id: str,
    plan: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("admin")),
):
    """
    Create a Stripe checkout session for upgrading a plan.
    
    Returns a URL to redirect the user to Stripe's checkout page.
    """
    from app.config import get_settings
    settings = get_settings()

    service = BillingService(db)
    try:
        result = await service.create_checkout_session(
            workspace_id=workspace_id,
            plan=plan,
            user_email=current_user.get("email", ""),
            success_url=f"{settings.APP_URL}/dashboard/billing?success=true",
            cancel_url=f"{settings.APP_URL}/dashboard/billing?canceled=true",
        )
        return {"success": True, "data": result}
    except BillingError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Customer Portal ───────────────────────────────────────────────

@router.post("/workspaces/{workspace_id}/billing/portal")
async def create_portal(
    workspace_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("admin")),
):
    """
    Create a Stripe customer portal session.
    Allows users to manage their subscription, payment methods, etc.
    """
    from app.config import get_settings
    settings = get_settings()

    service = BillingService(db)
    try:
        result = await service.create_portal_session(
            workspace_id=workspace_id,
            return_url=f"{settings.APP_URL}/dashboard/billing",
        )
        return {"success": True, "data": result}
    except BillingError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Stripe Webhook ────────────────────────────────────────────────

@router.post("/billing/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Stripe webhook events.
    No authentication — verified via Stripe signature.
    """
    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")

    service = BillingService(db)
    try:
        result = await service.handle_webhook(payload, sig_header)
        return result
    except BillingError as e:
        raise HTTPException(status_code=400, detail=str(e))
