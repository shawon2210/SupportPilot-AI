"""SupportPilot AI — Knowledge Source Model"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.document_chunk import DocumentChunk
    from app.models.workspace import Workspace


class KnowledgeSourceType:
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    MARKDOWN = "markdown"
    WEBSITE = "website"

    ALL = [PDF, DOCX, TXT, MARKDOWN, WEBSITE]


class KnowledgeSourceStatus:
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"

    ALL = [PENDING, PROCESSING, READY, ERROR]


class KnowledgeSource(Base, TimestampMixin):
    """
    Represents an uploaded document or website that serves as a knowledge source.
    The actual text content is stored in document_chunks.
    """
    __tablename__ = "knowledge_sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_type: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default=KnowledgeSourceStatus.PENDING, nullable=False
    )
    file_path: Mapped[str | None] = mapped_column(String(500))
    file_size: Mapped[int | None] = mapped_column(Integer)
    mime_type: Mapped[str | None] = mapped_column(String(100))
    url: Mapped[str | None] = mapped_column(String(2000))  # for website sources
    metadata_: Mapped[str | None] = mapped_column("metadata", Text, default="{}")
    error_message: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str | None] = mapped_column(String(255), ForeignKey("users.id", ondelete="SET NULL"))

    # Relationships
    workspace: Mapped[Workspace] = relationship("Workspace", back_populates="knowledge_sources")
    chunks: Mapped[list[DocumentChunk]] = relationship(
        "DocumentChunk", back_populates="source", lazy="selectin", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<KnowledgeSource id={self.id} name={self.name} type={self.source_type}>"
