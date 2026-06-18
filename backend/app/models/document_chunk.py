"""SupportPilot AI — Document Chunk Model"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.knowledge_source import KnowledgeSource
    from app.models.workspace import Workspace


class DocumentChunk(Base, TimestampMixin):
    """
    A chunk of text from a knowledge source, ready for embedding and vector search.
    In production with pgvector, an `embedding` column (vector type) would be added
    via migration.
    """
    __tablename__ = "document_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("knowledge_sources.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    token_count: Mapped[int | None] = mapped_column(Integer)
    metadata_: Mapped[str | None] = mapped_column("metadata", Text, default="{}")
    # In production with pgvector:
    # embedding: Mapped[list[float]] = mapped_column(Vector(1538))

    # Relationships
    workspace: Mapped[Workspace] = relationship("Workspace", back_populates="document_chunks")
    source: Mapped[KnowledgeSource] = relationship("KnowledgeSource", back_populates="chunks")

    def __repr__(self) -> str:
        return f"<DocumentChunk id={self.id} source={self.source_id} index={self.chunk_index}>"
