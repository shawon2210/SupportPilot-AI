"""SupportPilot AI — Real-time Notifications Endpoint"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.core.rbac import require_role
from app.services.notification_service import get_notification_service

router = APIRouter()


@router.get("/notifications/stream")
async def stream_notifications(
    workspace_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """SSE endpoint for real-time workspace notifications."""
    service = get_notification_service()
    return StreamingResponse(
        service.event_stream(workspace_id, current_user["id"]),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
