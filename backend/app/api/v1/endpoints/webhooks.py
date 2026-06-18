"""SupportPilot AI — Webhook Endpoints

Webhook management (authenticated) and incoming webhook receiver.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.models.webhook import WebhookEvent
from app.services.webhook_service import WebhookService, WebhookError

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────

class WebhookCreate(BaseModel):
    url: str = Field(..., max_length=2000)
    events: list[str] = Field(..., min_length=1)
    description: str | None = Field(None, max_length=500)


class WebhookUpdate(BaseModel):
    url: str | None = Field(None, max_length=2000)
    events: list[str] | None = None
    description: str | None = Field(None, max_length=500)
    is_active: bool | None = None


class WebhookResponse(BaseModel):
    id: str
    workspace_id: str
    url: str
    events: list[str]
    is_active: bool
    description: str | None
    failure_count: int
    created_at: str

    @classmethod
    def from_model(cls, webhook, secret: str | None = None) -> "WebhookResponse":
        import json
        data = {
            "id": webhook.id,
            "workspace_id": webhook.workspace_id,
            "url": webhook.url,
            "events": json.loads(webhook.events) if webhook.events else [],
            "is_active": webhook.is_active,
            "description": webhook.description,
            "failure_count": webhook.failure_count,
            "created_at": webhook.created_at.isoformat() if webhook.created_at else None,
        }
        if secret:
            data["secret"] = secret  # Only shown on creation
        return cls(**data)


class WebhookEventListResponse(BaseModel):
    events: list[str]


# ── Endpoints ──────────────────────────────────────────────────────

@router.get("/events", response_model=WebhookEventListResponse)
async def list_webhook_events():
    """List all available webhook event types."""
    return WebhookEventListResponse(events=WebhookEvent.ALL)


@router.get("/", response_model=list[WebhookResponse])
async def list_webhooks(
    workspace_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all webhooks for a workspace."""
    service = WebhookService(db)
    webhooks = await service.list_webhooks(workspace_id)
    return [WebhookResponse.from_model(w) for w in webhooks]


@router.post("/", response_model=WebhookResponse, status_code=201)
async def create_webhook(
    workspace_id: str,
    data: WebhookCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new webhook subscription."""
    service = WebhookService(db)
    try:
        webhook, secret = await service.create_webhook(
            workspace_id=workspace_id,
            url=data.url,
            events=data.events,
            description=data.description,
        )
        return WebhookResponse.from_model(webhook, secret=secret)
    except WebhookError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{webhook_id}", response_model=WebhookResponse)
async def get_webhook(
    workspace_id: str,
    webhook_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get webhook details."""
    service = WebhookService(db)
    webhook = await service.get_webhook(workspace_id, webhook_id)
    return WebhookResponse.from_model(webhook)


@router.patch("/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    workspace_id: str,
    webhook_id: str,
    data: WebhookUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update webhook configuration."""
    service = WebhookService(db)
    try:
        webhook = await service.update_webhook(
            workspace_id=workspace_id,
            webhook_id=webhook_id,
            **data.model_dump(exclude_unset=True),
        )
        return WebhookResponse.from_model(webhook)
    except WebhookError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{webhook_id}", status_code=204)
async def delete_webhook(
    workspace_id: str,
    webhook_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a webhook."""
    service = WebhookService(db)
    await service.delete_webhook(workspace_id, webhook_id)
