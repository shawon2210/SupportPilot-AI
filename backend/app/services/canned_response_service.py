"""SupportPilot AI — Canned Response Service"""

from __future__ import annotations

import json
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.canned_response import CannedResponse
from app.services.base import BaseService

logger = logging.getLogger("supportpilot.canned_responses")


class CannedResponseService(BaseService[CannedResponse]):
    """Service for managing canned response templates."""

    def __init__(self, db: AsyncSession):
        super().__init__(db)

    async def list_responses(
        self,
        workspace_id: str,
        category: str | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> list[CannedResponse]:
        stmt = select(CannedResponse).where(
            CannedResponse.workspace_id == workspace_id,
            CannedResponse.is_active == True,
        )
        if category:
            stmt = stmt.where(CannedResponse.category == category)
        stmt = stmt.order_by(CannedResponse.usage_count.desc()).offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_response(self, workspace_id: str, response_id: str) -> CannedResponse | None:
        stmt = select(CannedResponse).where(
            CannedResponse.id == response_id,
            CannedResponse.workspace_id == workspace_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_response(
        self,
        workspace_id: str,
        title: str,
        content: str,
        created_by: str,
        shortcut: str | None = None,
        category: str | None = None,
        tags: list[str] | None = None,
    ) -> CannedResponse:
        response = CannedResponse(
            id=self._generate_id(),
            workspace_id=workspace_id,
            title=title,
            content=content,
            shortcut=shortcut,
            category=category,
            tags=json.dumps(tags) if tags else None,
            created_by=created_by,
        )
        self.db.add(response)
        await self.db.flush()
        return response

    async def update_response(
        self,
        workspace_id: str,
        response_id: str,
        title: str | None = None,
        content: str | None = None,
        shortcut: str | None = None,
        category: str | None = None,
        tags: list[str] | None = None,
        is_active: bool | None = None,
    ) -> CannedResponse | None:
        response = await self.get_response(workspace_id, response_id)
        if not response:
            return None
        if title is not None:
            response.title = title
        if content is not None:
            response.content = content
        if shortcut is not None:
            response.shortcut = shortcut
        if category is not None:
            response.category = category
        if tags is not None:
            response.tags = json.dumps(tags)
        if is_active is not None:
            response.is_active = is_active
        await self.db.flush()
        return response

    async def delete_response(self, workspace_id: str, response_id: str) -> bool:
        response = await self.get_response(workspace_id, response_id)
        if not response:
            return False
        await self.db.delete(response)
        await self.db.flush()
        return True

    async def increment_usage(self, workspace_id: str, response_id: str) -> None:
        response = await self.get_response(workspace_id, response_id)
        if response:
            response.usage_count += 1
            await self.db.flush()

    async def get_categories(self, workspace_id: str) -> list[str]:
        stmt = select(CannedResponse.category).where(
            CannedResponse.workspace_id == workspace_id,
            CannedResponse.is_active == True,
            CannedResponse.category.isnot(None),
        ).distinct()
        result = await self.db.execute(stmt)
        return [r[0] for r in result.all() if r[0]]
