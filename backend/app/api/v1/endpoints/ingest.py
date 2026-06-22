"""SupportPilot AI — Email Ingest Endpoint

Creates a chat (ticket) from an inbound email and optionally drafts an AI reply.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.chat import Chat, ChatStatus
from app.models.message import Message, MessageRole
from app.models.workspace import Workspace
from app.services.email_service import EmailService

router = APIRouter()


@router.post("/ingest/email", status_code=201)
async def ingest_email(
    workspace_id: str,
    sender: str,
    subject: str = "Untitled",
    body: str = "",
    db: AsyncSession = Depends(get_db),
):
    """Ingest an inbound email as a new chat ticket.

    This endpoint is intentionally low-auth (no login required) so that
    webhooks from email providers (SendGrid, SES, Mailgun) can hit it.
    The workspace_id identifies the target workspace.
    """
    ws = await db.execute(select(Workspace).where(Workspace.id == workspace_id, Workspace.is_active == True))
    if not ws.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Workspace not found")

    chat = Chat(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        title=f"[Email] {subject[:200]}",
        status=ChatStatus.ACTIVE,
        mode="hybrid",
    )
    db.add(chat)

    msg = Message(
        id=str(uuid.uuid4()),
        chat_id=chat.id,
        workspace_id=workspace_id,
        role=MessageRole.USER,
        content=f"From: {sender}\nSubject: {subject}\n\n{body}",
    )
    db.add(msg)
    await db.commit()
    await db.refresh(chat)

    service = EmailService()
    draft = ""
    if service.enabled:
        draft = await service.draft_reply(body)

    return {
        "success": True,
        "data": {
            "chat_id": chat.id,
            "draft_reply": draft,
        },
    }
