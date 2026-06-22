"""SupportPilot AI — CSAT Ratings Endpoints"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.core.rbac import require_role
from app.models.chat import Chat, ChatStatus
from app.models.conversation_rating import ConversationRating
from app.schemas.rating import RatingCreate, RatingResponse

router = APIRouter()


@router.post("/chats/{chat_id}/rating", response_model=RatingResponse, status_code=201)
async def submit_rating(
    chat_id: str,
    body: RatingCreate,
    workspace_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a CSAT rating for a closed chat."""
    if body.score < 1 or body.score > 5:
        raise HTTPException(status_code=422, detail="Score must be between 1 and 5")

    chat = await db.execute(select(Chat).where(Chat.id == chat_id, Chat.workspace_id == workspace_id))
    chat = chat.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if chat.status != ChatStatus.CLOSED:
        raise HTTPException(status_code=400, detail="Can only rate closed chats")

    existing = await db.execute(select(ConversationRating).where(ConversationRating.chat_id == chat_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Chat already has a rating")

    rating = ConversationRating(
        id=str(uuid.uuid4()),
        chat_id=chat_id,
        workspace_id=workspace_id,
        score=body.score,
        comment=body.comment,
    )
    db.add(rating)
    await db.commit()
    await db.refresh(rating)
    return RatingResponse.model_validate(rating)


@router.get("/chats/{chat_id}/rating")
async def get_rating(
    chat_id: str,
    workspace_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the CSAT rating for a chat."""
    rating = await db.execute(select(ConversationRating).where(
        ConversationRating.chat_id == chat_id,
        ConversationRating.workspace_id == workspace_id,
    ))
    rating = rating.scalar_one_or_none()
    if not rating:
        return {"success": True, "data": None}
    return {"success": True, "data": RatingResponse.model_validate(rating).model_dump()}
