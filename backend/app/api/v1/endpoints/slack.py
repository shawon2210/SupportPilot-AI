"""SupportPilot AI — Slack Integration Endpoints

Handles Slack slash commands and interactive messages.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.database import get_db
from app.models.workspace import Workspace
from app.services.slack_service import SlackService

router = APIRouter()


@router.post("/slack/command")
async def slack_command(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Slack slash commands.
    
    Supports:
    - /supportpilot chat <message>
    - /supportpilot search <query>
    - /supportpilot help
    """
    settings = get_settings()
    body = await request.form()
    form_data = dict(body)

    # Verify Slack signature
    if settings.SLACK_SIGNING_SECRET:
        signature = request.headers.get("X-Slack-Signature", "")
        timestamp = request.headers.get("X-Slack-Request-Timestamp", "")
        raw_body = await request.body()

        if not SlackService.verify_request(raw_body, signature, timestamp, settings.SLACK_SIGNING_SECRET):
            raise HTTPException(status_code=401, detail="Invalid Slack signature")

    cmd = SlackService.parse_slash_command(form_data)

    # Find workspace by team_id
    stmt = select(Workspace).where(Workspace.id == cmd.team_id)
    result = await db.execute(stmt)
    workspace = result.scalar_one_or_none()

    if not workspace:
        return {
            "response_type": "ephemeral",
            "text": "Workspace not linked. Please connect your SupportPilot workspace first.",
        }

    service = SlackService(db)
    return await service.handle_slash_command(workspace.id, cmd)


@router.post("/slack/events")
async def slack_events(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Slack Events API callbacks.
    Supports URL verification challenge.
    """
    body = await request.json()

    # URL verification challenge
    if body.get("type") == "url_verification":
        return {"challenge": body.get("challenge")}

    # Process events
    event = body.get("event", {})
    event_type = event.get("type", "")

    if event_type == "message":
        # Handle incoming messages if needed
        pass

    return {"ok": True}
