"""SupportPilot AI — Workspace Service"""

from __future__ import annotations

import json

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import generate_slug
from app.models.member import WorkspaceMember, WorkspaceRole
from app.models.subscription import Subscription
from app.models.workspace import Workspace, WorkspacePlan
from app.repositories.workspace_repo import WorkspaceRepository
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate
from app.services.base import BaseService


class WorkspaceService(BaseService[Workspace]):
    """Service for workspace business logic."""

    def __init__(self, db: AsyncSession):
        super().__init__(db)
        self.repo = WorkspaceRepository(db)

    async def create_workspace(
        self,
        data: WorkspaceCreate,
        user_id: str,
    ) -> Workspace:
        """
        Create a new workspace and assign the creator as owner.
        Auto-generates slug from name if not provided.
        """
        # Generate slug
        slug = data.slug or generate_slug(data.name)

        # Ensure slug uniqueness
        base_slug = slug
        counter = 1
        while await self.repo.slug_exists(slug):
            slug = f"{base_slug}-{counter}"
            counter += 1

        # Create workspace
        workspace = Workspace(
            id=self._generate_id(),
            name=data.name,
            slug=slug,
            plan=WorkspacePlan.FREE,
            plan_limits=json.dumps(WorkspacePlan.LIMITS[WorkspacePlan.FREE]),
        )
        await self.repo.create(workspace)

        # Add creator as owner
        member = WorkspaceMember(
            id=self._generate_id(),
            workspace_id=workspace.id,
            user_id=user_id,
            role=WorkspaceRole.OWNER,
        )
        self.db.add(member)
        await self.db.flush()

        # Create default subscription
        subscription = Subscription(
            id=self._generate_id(),
            workspace_id=workspace.id,
            plan=WorkspacePlan.FREE,
        )
        self.db.add(subscription)
        await self.db.flush()

        # Create default widget config
        from app.models.widget_config import WidgetConfig
        widget_config = WidgetConfig(
            id=self._generate_id(),
            workspace_id=workspace.id,
        )
        self.db.add(widget_config)
        await self.db.flush()

        await self.db.refresh(workspace)
        return workspace

    async def get_workspace(self, workspace_id: str) -> Workspace:
        """Get workspace by ID."""
        return await self.repo.get_by_id_or_404(workspace_id)

    async def get_user_workspaces(
        self,
        user_id: str,
        *,
        offset: int = 0,
        limit: int = 20,
    ) -> list[Workspace]:
        """Get all workspaces for a user."""
        return await self.repo.get_user_workspaces(user_id, offset=offset, limit=limit)

    async def update_workspace(
        self,
        workspace_id: str,
        data: WorkspaceUpdate,
    ) -> Workspace:
        """Update workspace details."""
        workspace = await self.repo.get_by_id_or_404(workspace_id)

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if key == "settings" and isinstance(value, dict):
                value = json.dumps(value)
            setattr(workspace, key, value)

        await self.repo.update(workspace)
        return workspace

    async def delete_workspace(self, workspace_id: str) -> None:
        """Delete a workspace and all associated data."""
        workspace = await self.repo.get_by_id_or_404(workspace_id)
        await self.repo.delete(workspace)
