"""SupportPilot AI — Analytics Endpoints

Dashboard analytics and audit log access.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import get_current_user
from app.config import get_settings
from app.core.database import get_db
from app.core.rbac import require_role
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("/workspaces/{workspace_id}/analytics/overview")
async def get_workspace_analytics(
    workspace_id: str,
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("member")),
):
    """Get analytics overview for a workspace dashboard."""
    service = AnalyticsService(db)
    data = await service.get_workspace_analytics(workspace_id, days=days)
    return {"success": True, "data": data}


@router.get("/workspaces/{workspace_id}/analytics/usage")
async def get_usage_over_time(
    workspace_id: str,
    metric: str = Query("messages", description="Metric name"),
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("member")),
):
    """Get usage data over time for charts."""
    service = AnalyticsService(db)
    start_date = __import__("datetime").datetime.utcnow() - __import__("datetime").timedelta(days=days)

    if metric == "messages":
        from sqlalchemy import func, select

        from app.models.message import Message
        stmt = select(
            func.date(Message.created_at).label("date"),
            func.count().label("value"),
        ).where(
            Message.workspace_id == workspace_id,
            Message.created_at >= start_date,
        ).group_by(func.date(Message.created_at)).order_by(func.date(Message.created_at))
        result = await db.execute(stmt)
        data = [{"date": str(r.date), "value": r.value} for r in result.all()]
    else:
        data = await service._sum_metric(workspace_id, metric, start_date)
        data = [{"date": str(start_date.date()), "value": data}]

    return {"success": True, "data": data, "metric": metric}


@router.get("/workspaces/{workspace_id}/analytics/audit")
async def get_audit_logs(
    workspace_id: str,
    action: str | None = Query(None, description="Filter by action"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("member")),
):
    """Get audit logs for a workspace."""
    service = AnalyticsService(db)
    offset = (page - 1) * per_page
    logs = await service.get_audit_logs(
        workspace_id, action=action, offset=offset, limit=per_page,
    )

    return {
        "success": True,
        "data": [
            {
                "id": log.id,
                "action": log.action,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "user_id": log.user_id,
                "details": log.details,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        "meta": {"page": page, "per_page": per_page, "total": len(logs)},
    }


# ── Platform Analytics (Admin) ────────────────────────────────────

async def require_platform_admin(request: Request) -> dict:
    """Require an authenticated user explicitly configured as a platform admin."""
    current_user = await get_current_user(request)
    settings = get_settings()
    if current_user.get("id") in settings.PLATFORM_ADMIN_USER_IDS:
        return {**current_user, "platform_admin": True}

    raise HTTPException(status_code=403, detail="Platform admin access required")


@router.get("/admin/analytics/platform")
async def get_platform_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get platform-wide analytics for configured platform admins only."""
    service = AnalyticsService(db)
    data = await service.get_platform_analytics(days=days)
    return {"success": True, "data": data}
