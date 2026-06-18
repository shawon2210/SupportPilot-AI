"""SupportPilot AI — Member Service"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthorizationError, NotFoundError, ValidationError
from app.models.member import WorkspaceMember, WorkspaceRole
from app.repositories.member_repo import MemberRepository
from app.repositories.workspace_repo import WorkspaceRepository
from app.schemas.member import MemberInvite, MemberUpdate
from app.services.base import BaseService


class MemberService(BaseService[WorkspaceMember]):
    """Service for workspace member management."""

    def __init__(self, db: AsyncSession):
        super().__init__(db)
        self.member_repo = MemberRepository(db)
        self.workspace_repo = WorkspaceRepository(db)

    async def _check_permission(
        self,
        workspace_id: str,
        user_id: str,
        required_role: str,
    ) -> WorkspaceMember:
        """Verify user has required role in workspace."""
        membership = await self.member_repo.get_membership(workspace_id, user_id)
        if not membership or not membership.is_active:
            raise NotFoundError("WorkspaceMember", f"user {user_id} in workspace {workspace_id}")

        if not WorkspaceRole.has_permission(membership.role, required_role):
            raise AuthorizationError(
                f"Role '{membership.role}' does not have permission for this action. "
                f"Required: '{required_role}'"
            )
        return membership

    async def invite_member(
        self,
        workspace_id: str,
        invited_by: str,
        data: MemberInvite,
    ) -> WorkspaceMember:
        """Invite a new member to a workspace."""
        # Check inviter has admin permission
        await self._check_permission(workspace_id, invited_by, WorkspaceRole.ADMIN)

        # Validate role
        if data.role not in WorkspaceRole.ALL:
            raise ValidationError(f"Invalid role: {data.role}. Must be one of: {WorkspaceRole.ALL}")

        # Check workspace member limit
        workspace = await self.workspace_repo.get_by_id_or_404(workspace_id)
        limits = workspace.get_plan_limits()
        current_count = await self.member_repo.count_by_workspace(workspace_id)
        max_members = limits.get("max_members", 2)
        if max_members != -1 and current_count >= max_members:
            raise ValidationError(
                f"Workspace has reached the maximum member limit ({max_members}) for the '{workspace.plan}' plan"
            )

        # Find user by email (in production, this would send an invite email)
        from sqlalchemy import select

        from app.models.user import User
        stmt = select(User).where(User.email == data.email)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            raise NotFoundError("User", data.email)

        # Check if already a member
        existing = await self.member_repo.get_membership(workspace_id, user.id)
        if existing:
            raise ValidationError(f"User {data.email} is already a member of this workspace")

        member = WorkspaceMember(
            id=self._generate_id(),
            workspace_id=workspace_id,
            user_id=user.id,
            role=data.role,
        )
        await self.member_repo.create(member)
        return member

    async def update_member(
        self,
        workspace_id: str,
        member_id: str,
        updated_by: str,
        data: MemberUpdate,
    ) -> WorkspaceMember:
        """Update a member's role or status."""
        # Check updater has admin permission
        await self._check_permission(workspace_id, updated_by, WorkspaceRole.ADMIN)

        member = await self.member_repo.get_by_workspace_or_404(workspace_id, member_id)

        # Prevent changing owner role (only one owner allowed)
        if member.role == WorkspaceRole.OWNER and data.role and data.role != WorkspaceRole.OWNER:
            raise AuthorizationError("Cannot change the owner's role. Transfer ownership first.")

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(member, key, value)

        await self.member_repo.update(member)
        return member

    async def remove_member(
        self,
        workspace_id: str,
        member_id: str,
        removed_by: str,
    ) -> None:
        """Remove a member from a workspace."""
        # Check remover has admin permission
        await self._check_permission(workspace_id, removed_by, WorkspaceRole.ADMIN)

        member = await self.member_repo.get_by_workspace_or_404(workspace_id, member_id)

        # Cannot remove the owner
        if member.role == WorkspaceRole.OWNER:
            raise AuthorizationError("Cannot remove the workspace owner")

        await self.member_repo.delete(member)

    async def list_members(
        self,
        workspace_id: str,
        user_id: str,
        *,
        role: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> list[WorkspaceMember]:
        """List workspace members."""
        # Verify user is a member
        await self._check_permission(workspace_id, user_id, WorkspaceRole.MEMBER)
        return await self.member_repo.list_members(workspace_id, role=role, offset=offset, limit=limit)
