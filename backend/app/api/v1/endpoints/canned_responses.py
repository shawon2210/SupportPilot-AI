"""SupportPilot AI — Canned Response Endpoints"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.core.rbac import require_role
from app.services.canned_response_service import CannedResponseService

router = APIRouter()


class CannedResponseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    shortcut: str | None = None
    category: str | None = None
    tags: list[str] | None = None


class CannedResponseUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    shortcut: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    is_active: bool | None = None


class CannedResponseOut(BaseModel):
    id: str
    title: str
    content: str
    shortcut: str | None
    category: str | None
    tags: list[str] | None
    usage_count: int
    is_active: bool
    created_at: str | None
    updated_at: str | None


@router.get("/canned-responses", response_model=list[CannedResponseOut])
async def list_canned_responses(
    workspace_id: str,
    category: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """List canned response templates for the workspace."""
    service = CannedResponseService(db)
    responses = await service.list_responses(workspace_id, category=category)
    return [
        CannedResponseOut(
            id=r.id,
            title=r.title,
            content=r.content,
            shortcut=r.shortcut,
            category=r.category,
            tags=__import__("json").loads(r.tags) if r.tags else [],
            usage_count=r.usage_count,
            is_active=r.is_active,
            created_at=r.created_at.isoformat() if r.created_at else None,
            updated_at=r.updated_at.isoformat() if r.updated_at else None,
        )
        for r in responses
    ]


@router.post("/canned-responses", response_model=CannedResponseOut, status_code=201)
async def create_canned_response(
    workspace_id: str,
    data: CannedResponseCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("admin")),
):
    """Create a canned response template."""
    service = CannedResponseService(db)
    r = await service.create_response(
        workspace_id=workspace_id,
        title=data.title,
        content=data.content,
        created_by=current_user["id"],
        shortcut=data.shortcut,
        category=data.category,
        tags=data.tags,
    )
    return CannedResponseOut(
        id=r.id, title=r.title, content=r.content, shortcut=r.shortcut,
        category=r.category, tags=__import__("json").loads(r.tags) if r.tags else [],
        usage_count=r.usage_count, is_active=r.is_active,
        created_at=r.created_at.isoformat() if r.created_at else None,
        updated_at=r.updated_at.isoformat() if r.updated_at else None,
    )


@router.patch("/canned-responses/{response_id}", response_model=CannedResponseOut)
async def update_canned_response(
    workspace_id: str,
    response_id: str,
    data: CannedResponseUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("admin")),
):
    """Update a canned response template."""
    service = CannedResponseService(db)
    r = await service.update_response(
        workspace_id, response_id,
        title=data.title, content=data.content,
        shortcut=data.shortcut, category=data.category,
        tags=data.tags, is_active=data.is_active,
    )
    if not r:
        raise HTTPException(status_code=404, detail="Canned response not found")
    return CannedResponseOut(
        id=r.id, title=r.title, content=r.content, shortcut=r.shortcut,
        category=r.category, tags=__import__("json").loads(r.tags) if r.tags else [],
        usage_count=r.usage_count, is_active=r.is_active,
        created_at=r.created_at.isoformat() if r.created_at else None,
        updated_at=r.updated_at.isoformat() if r.updated_at else None,
    )


@router.delete("/canned-responses/{response_id}", status_code=204)
async def delete_canned_response(
    workspace_id: str,
    response_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("admin")),
):
    """Delete a canned response template."""
    service = CannedResponseService(db)
    deleted = await service.delete_response(workspace_id, response_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Canned response not found")


@router.post("/canned-responses/{response_id}/use", status_code=200)
async def use_canned_response(
    workspace_id: str,
    response_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """Increment usage count for a canned response."""
    service = CannedResponseService(db)
    await service.increment_usage(workspace_id, response_id)
    return {"success": True}


@router.get("/canned-responses/categories", response_model=list[str])
async def list_canned_response_categories(
    workspace_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """List all canned response categories."""
    service = CannedResponseService(db)
    return await service.get_categories(workspace_id)
