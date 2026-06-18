"""SupportPilot AI — Widget Endpoints

Widget configuration (authenticated) and public chat endpoints.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.schemas.widget import WidgetConfigResponse, WidgetConfigUpdate
from app.services.widget_service import WidgetService, WidgetChatRequest

# ── Authenticated widget config router ─────────────────────────────

widget_router = APIRouter()


@widget_router.get("/widget", response_model=WidgetConfigResponse)
async def get_widget_config(
    workspace_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get widget configuration for a workspace."""
    service = WidgetService(db)
    config = await service.get_config(workspace_id)
    return WidgetConfigResponse.model_validate(config)


@widget_router.patch("/widget", response_model=WidgetConfigResponse)
async def update_widget_config(
    workspace_id: str,
    data: WidgetConfigUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update widget configuration."""
    service = WidgetService(db)
    update_data = data.model_dump(exclude_unset=True)
    config = await service.update_config(workspace_id, **update_data)
    return WidgetConfigResponse.model_validate(config)


# ── Public widget router (no auth) ─────────────────────────────────

public_widget_router = APIRouter()


@public_widget_router.get("/config/{workspace_id}")
async def get_public_widget_config(
    workspace_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get public widget configuration.
    No authentication required — loaded by the widget script on the client's website.
    """
    service = WidgetService(db)
    config = await service.get_config(workspace_id)
    return service.get_public_config(config)


class WidgetChatRequestBody(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: str | None = Field(None, description="Session ID for conversation continuity")
    visitor_id: str | None = Field(None, description="Visitor ID for lead tracking")


class WidgetChatResponseBody(BaseModel):
    message: str
    session_id: str
    sources: list[dict] = []
    tokens_used: int = 0


@public_widget_router.post("/chat/{workspace_id}", response_model=WidgetChatResponseBody)
async def widget_chat(
    workspace_id: str,
    data: WidgetChatRequestBody,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Public chat endpoint for the embeddable widget.
    No authentication required. Rate-limited by IP.
    """
    service = WidgetService(db)
    try:
        result = await service.public_chat(
            workspace_id=workspace_id,
            request=WidgetChatRequest(
                message=data.message,
                session_id=data.session_id,
                visitor_id=data.visitor_id,
            ),
        )
        return WidgetChatResponseBody(
            message=result.message,
            session_id=result.session_id,
            sources=result.sources,
            tokens_used=result.tokens_used,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {e}")


@public_widget_router.get("/{workspace_id}.js")
async def get_widget_script(
    workspace_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Generate the embeddable widget script for a workspace."""
    from fastapi.responses import Response

    service = WidgetService(db)
    script = service.generate_widget_script(
        workspace_id=workspace_id,
        base_url="",
    )
    return Response(content=script, media_type="application/javascript")
