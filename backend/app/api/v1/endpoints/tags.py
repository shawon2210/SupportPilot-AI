"""SupportPilot AI — Chat Tag Endpoints"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.core.rbac import require_role
from app.models.chat import Chat
from app.models.chat_tag import ChatTag
from app.schemas.tag import TagCreate, TagResponse, TagUpdate

router = APIRouter()


@router.post("/tags", response_model=TagResponse, status_code=201)
async def create_tag(
    body: TagCreate,
    workspace_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """Create a new tag for the workspace."""
    existing = await db.execute(select(ChatTag).where(
        ChatTag.workspace_id == workspace_id,
        ChatTag.name == body.name,
    ))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Tag with this name already exists")

    tag = ChatTag(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        name=body.name,
        color=body.color,
    )
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return TagResponse.model_validate(tag)


@router.get("/tags", response_model=list[TagResponse])
async def list_tags(
    workspace_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all tags in the workspace."""
    result = await db.execute(
        select(ChatTag).where(ChatTag.workspace_id == workspace_id).order_by(ChatTag.name)
    )
    return [TagResponse.model_validate(t) for t in result.scalars().all()]


@router.put("/tags/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: str,
    body: TagUpdate,
    workspace_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """Update a tag's name or color."""
    tag = await db.execute(select(ChatTag).where(ChatTag.id == tag_id, ChatTag.workspace_id == workspace_id))
    tag = tag.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    if body.name is not None:
        tag.name = body.name
    if body.color is not None:
        tag.color = body.color
    await db.commit()
    await db.refresh(tag)
    return TagResponse.model_validate(tag)


@router.delete("/tags/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: str,
    workspace_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """Delete a tag."""
    tag = await db.execute(select(ChatTag).where(ChatTag.id == tag_id, ChatTag.workspace_id == workspace_id))
    tag = tag.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    await db.delete(tag)
    await db.commit()


@router.post("/chats/{chat_id}/tags/{tag_id}", status_code=204)
async def assign_tag(
    chat_id: str,
    tag_id: str,
    workspace_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """Assign a tag to a chat."""
    chat = await db.execute(select(Chat).where(Chat.id == chat_id, Chat.workspace_id == workspace_id))
    chat = chat.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    tag = await db.execute(select(ChatTag).where(ChatTag.id == tag_id, ChatTag.workspace_id == workspace_id))
    tag = tag.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    if tag not in chat.tags:
        chat.tags.append(tag)
        await db.commit()


@router.delete("/chats/{chat_id}/tags/{tag_id}", status_code=204)
async def remove_tag(
    chat_id: str,
    tag_id: str,
    workspace_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """Remove a tag from a chat."""
    chat = await db.execute(select(Chat).where(Chat.id == chat_id, Chat.workspace_id == workspace_id))
    chat = chat.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    tag = next((t for t in chat.tags if t.id == tag_id), None)
    if tag:
        chat.tags.remove(tag)
        await db.commit()
