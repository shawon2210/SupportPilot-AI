"""SupportPilot AI — Member Endpoints"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.core.rbac import require_role
from app.schemas.base import PaginatedResponse, PaginationMeta, PaginationParams
from app.schemas.member import MemberInvite, MemberResponse, MemberUpdate
from app.services.member_service import MemberService

router = APIRouter()


@router.get("", response_model=PaginatedResponse[MemberResponse])
async def list_members(
    workspace_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    role: str | None = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("admin")),
):
    """List workspace members."""
    pagination = PaginationParams(page=page, per_page=per_page)
    service = MemberService(db)
    members = await service.list_members(
        workspace_id,
        current_user["id"],
        role=role,
        offset=pagination.offset,
        limit=pagination.limit,
    )

    # Enrich with user info
    result = []
    for m in members:
        resp = MemberResponse.model_validate(m)
        if m.user:
            resp.user_email = m.user.email
            resp.user_name = m.user.full_name
        result.append(resp)

    return PaginatedResponse(
        data=result,
        meta=PaginationMeta(page=page, per_page=per_page, total=len(result)),
    )


@router.post("", response_model=MemberResponse, status_code=201)
async def invite_member(
    workspace_id: str,
    data: MemberInvite,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("admin")),
):
    """Invite a member to the workspace. Requires admin role."""
    service = MemberService(db)
    member = await service.invite_member(workspace_id, current_user["id"], data)
    resp = MemberResponse.model_validate(member)
    if member.user:
        resp.user_email = member.user.email
        resp.user_name = member.user.full_name
    return resp


@router.patch("/{member_id}", response_model=MemberResponse)
async def update_member(
    workspace_id: str,
    member_id: str,
    data: MemberUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("admin")),
):
    """Update a member's role. Requires admin role."""
    service = MemberService(db)
    member = await service.update_member(workspace_id, member_id, current_user["id"], data)
    resp = MemberResponse.model_validate(member)
    if member.user:
        resp.user_email = member.user.email
        resp.user_name = member.user.full_name
    return resp


@router.delete("/{member_id}", status_code=204)
async def remove_member(
    workspace_id: str,
    member_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("admin")),
):
    """Remove a member from the workspace. Requires admin role."""
    service = MemberService(db)
    await service.remove_member(workspace_id, member_id, current_user["id"])
