"""SupportPilot AI — Document Repository"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document_chunk import DocumentChunk
from app.models.knowledge_source import KnowledgeSource
from app.repositories.base import TenantRepository


class KnowledgeSourceRepository(TenantRepository[KnowledgeSource]):
    """Repository for knowledge source operations."""

    def __init__(self, db: AsyncSession):
        super().__init__(KnowledgeSource, db)


class DocumentChunkRepository(TenantRepository[DocumentChunk]):
    """Repository for document chunk operations."""

    def __init__(self, db: AsyncSession):
        super().__init__(DocumentChunk, db)

    async def list_by_source(
        self,
        workspace_id: str,
        source_id: str,
    ) -> list[DocumentChunk]:
        """Get all chunks for a knowledge source."""
        stmt = (
            select(DocumentChunk)
            .where(
                DocumentChunk.workspace_id == workspace_id,
                DocumentChunk.source_id == source_id,
            )
            .order_by(DocumentChunk.chunk_index)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
