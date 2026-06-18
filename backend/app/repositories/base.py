"""SupportPilot AI — Base Repository"""

from __future__ import annotations

from typing import Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    """
    Generic repository providing common CRUD operations.
    All queries are tenant-aware when workspace_id is provided.
    """

    def __init__(self, model: type[ModelT], db: AsyncSession):
        self.model = model
        self.db = db

    async def get_by_id(self, id: str) -> ModelT | None:
        """Get a single record by primary key."""
        return await self.db.get(self.model, id)

    async def get_by_id_or_404(self, id: str) -> ModelT:
        """Get by ID or raise NotFoundError."""
        from app.core.exceptions import NotFoundError
        result = await self.get_by_id(id)
        if result is None:
            raise NotFoundError(self.model.__name__, id)
        return result

    async def list_all(
        self,
        *,
        offset: int = 0,
        limit: int = 20,
    ) -> list[ModelT]:
        """List records with pagination."""
        stmt = select(self.model).offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count(self) -> int:
        """Count total records."""
        from sqlalchemy import func
        stmt = select(func.count()).select_from(self.model)
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def create(self, obj: ModelT) -> ModelT:
        """Create a new record."""
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def update(self, obj: ModelT) -> ModelT:
        """Update an existing record."""
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def delete(self, obj: ModelT) -> None:
        """Delete a record."""
        await self.db.delete(obj)
        await self.db.flush()


class TenantRepository(BaseRepository[ModelT]):
    """
    Repository with tenant (workspace) filtering.
    All queries automatically filter by workspace_id.
    """

    async def get_by_workspace(
        self,
        workspace_id: str,
        id: str,
    ) -> ModelT | None:
        """Get a record by ID, scoped to workspace."""
        stmt = select(self.model).where(
            self.model.id == id,
            self.model.workspace_id == workspace_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_workspace_or_404(
        self,
        workspace_id: str,
        id: str,
    ) -> ModelT:
        """Get by ID scoped to workspace, or raise NotFoundError."""
        from app.core.exceptions import NotFoundError
        result = await self.get_by_workspace(workspace_id, id)
        if result is None:
            raise NotFoundError(self.model.__name__, id)
        return result

    async def list_by_workspace(
        self,
        workspace_id: str,
        *,
        offset: int = 0,
        limit: int = 20,
    ) -> list[ModelT]:
        """List records filtered by workspace."""
        stmt = (
            select(self.model)
            .where(self.model.workspace_id == workspace_id)
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_by_workspace(self, workspace_id: str) -> int:
        """Count records in a workspace."""
        from sqlalchemy import func
        stmt = (
            select(func.count())
            .select_from(self.model)
            .where(self.model.workspace_id == workspace_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()
