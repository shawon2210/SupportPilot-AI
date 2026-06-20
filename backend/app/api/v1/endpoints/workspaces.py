"""SupportPilot AI — Workspace Endpoints"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.core.rbac import require_role
from app.schemas.base import PaginatedResponse, PaginationMeta, PaginationParams
from app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceDetailResponse,
    WorkspaceResponse,
    WorkspaceUpdate,
)
from app.services.workspace_service import WorkspaceService

router = APIRouter()


@router.get("", response_model=PaginatedResponse[WorkspaceResponse])
async def list_workspaces(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all workspaces for the current user."""
    pagination = PaginationParams(page=page, per_page=per_page)
    service = WorkspaceService(db)
    workspaces = await service.get_user_workspaces(
        current_user["id"],
        offset=pagination.offset,
        limit=pagination.limit,
    )

    return PaginatedResponse(
        data=[WorkspaceResponse.model_validate(w) for w in workspaces],
        meta=PaginationMeta(
            page=page,
            per_page=per_page,
            total=len(workspaces),
        ),
    )


@router.post("", response_model=WorkspaceResponse, status_code=201)
async def create_workspace(
    data: WorkspaceCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new workspace. Creator becomes the owner."""
    service = WorkspaceService(db)
    workspace = await service.create_workspace(data, current_user["id"])
    return WorkspaceResponse.model_validate(workspace)


@router.get("/{workspace_id}", response_model=WorkspaceDetailResponse)
async def get_workspace(
    workspace_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("admin")),
):
    """Get workspace details."""
    service = WorkspaceService(db)
    workspace = await service.get_workspace(workspace_id)

    # Build detailed response
    response = WorkspaceDetailResponse.model_validate(workspace)
    response.member_count = len([m for m in workspace.members if m.is_active])
    response.document_count = len(workspace.knowledge_sources)
    return response


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: str,
    data: WorkspaceUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("admin")),
):
    """Update workspace details. Requires admin role."""
    # TODO: Add RBAC check
    service = WorkspaceService(db)
    workspace = await service.update_workspace(workspace_id, data)
    return WorkspaceResponse.model_validate(workspace)


@router.delete("/{workspace_id}", status_code=204)
async def delete_workspace(
    workspace_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("admin")),
):
    """Delete a workspace. Requires owner role."""
    # TODO: Add RBAC check
    service = WorkspaceService(db)
    await service.delete_workspace(workspace_id)
