"""SupportPilot AI — Member Repository"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.member import WorkspaceMember
from app.repositories.base import TenantRepository


class MemberRepository(TenantRepository[WorkspaceMember]):
    """Repository for workspace member operations."""

    def __init__(self, db: AsyncSession):
        super().__init__(WorkspaceMember, db)

    async def get_membership(
        self,
        workspace_id: str,
        user_id: str,
    ) -> WorkspaceMember | None:
        """Get a specific workspace membership."""
        stmt = select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_membership_or_404(
        self,
        workspace_id: str,
        user_id: str,
    ) -> WorkspaceMember:
        """Get membership or raise NotFoundError."""
        from app.core.exceptions import NotFoundError
        result = await self.get_membership(workspace_id, user_id)
        if result is None:
            raise NotFoundError("WorkspaceMember", f"{workspace_id}/{user_id}")
        return result

    async def list_members(
        self,
        workspace_id: str,
        *,
        role: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> list[WorkspaceMember]:
        """List workspace members with optional role filter."""
        from sqlalchemy.orm import selectinload

        stmt = (
            select(WorkspaceMember)
            .options(selectinload(WorkspaceMember.user))
            .where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.is_active == True,  # noqa: E712
            )
        )
        if role:
            stmt = stmt.where(WorkspaceMember.role == role)
        stmt = stmt.offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
