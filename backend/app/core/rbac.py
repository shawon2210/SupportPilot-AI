"""SupportPilot AI — RBAC (Role-Based Access Control) Middleware

Enforces workspace-level permissions on every authenticated request.
Integrates with the workspace_members table to check user roles.
"""

from __future__ import annotations

import logging
from functools import wraps
from typing import Callable

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select

from app.models.member import WorkspaceMember, WorkspaceRole

logger = logging.getLogger("supportpilot.rbac")


class RBACMiddleware:
    """
    Role-Based Access Control for workspace-scoped endpoints.
    
    Usage in endpoints:
        @router.get("/workspaces/{workspace_id}/documents")
        async def list_docs(
            workspace_id: str,
            rbac: dict = Depends(require_role("member")),
            ...
        ):
            ...
    
    The middleware:
    1. Extracts user_id from the authenticated request state
    2. Looks up the user's membership in the workspace
    3. Checks if the user's role meets the required minimum
    4. Raises 403 if insufficient permissions
    """

    @staticmethod
    async def check_permission(
        db,
        workspace_id: str,
        user_id: str,
        required_role: str = "member",
    ) -> WorkspaceMember:
        """
        Check if a user has the required role in a workspace.
        
        Args:
            db: Database session
            workspace_id: Workspace to check
            user_id: User ID to check
            required_role: Minimum required role (owner, admin, agent, member)
            
        Returns:
            WorkspaceMember if authorized
            
        Raises:
            HTTPException 404 if not a member
            HTTPException 403 if insufficient permissions
        """
        stmt = select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
            WorkspaceMember.is_active == True,  # noqa: E712
        )
        result = await db.execute(stmt)
        membership = result.scalar_one_or_none()

        if not membership:
            raise HTTPException(
                status_code=404,
                detail="You are not a member of this workspace",
            )

        if not WorkspaceRole.has_permission(membership.role, required_role):
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Insufficient permissions. Your role: '{membership.role}'. "
                    f"Required: '{required_role}' or higher."
                ),
            )

        return membership


def require_role(minimum_role: str) -> Callable:
    """
    FastAPI dependency factory for role-based access control.
    
    Usage:
        @router.post("/workspaces/{workspace_id}/members")
        async def invite_member(
            workspace_id: str,
            rbac: dict = Depends(require_role("admin")),
            ...
        ):
    """
    from app.core.database import get_db

    async def dependency(
        request: Request,
        db=Depends(get_db),
    ) -> dict:
        # Extract user_id from request state (set by auth middleware)
        user_id = getattr(request.state, "user_id", None)
        if not user_id:
            # Fallback to header for dev
            user_id = request.headers.get("X-User-ID")
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")

        workspace_id = request.path_params.get("workspace_id")
        if not workspace_id:
            raise HTTPException(status_code=400, detail="Workspace ID required")

        await RBACMiddleware.check_permission(db, workspace_id, user_id, minimum_role)

        return {"user_id": user_id, "workspace_id": workspace_id}

    return dependency


# ── Permission shortcuts ───────────────────────────────────────────

require_owner = require_role(WorkspaceRole.OWNER)
require_admin = require_role(WorkspaceRole.ADMIN)
require_agent = require_role(WorkspaceRole.AGENT)
require_member = require_role(WorkspaceRole.MEMBER)
