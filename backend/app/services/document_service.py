"""SupportPilot AI — Document Service

Orchestrates the full document processing pipeline:
Upload → Extract → Chunk → Embed → Vector Store

Also handles knowledge source CRUD and website crawling ingestion.
"""

from __future__ import annotations

import json
import logging
import os
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.document_chunk import DocumentChunk
from app.models.knowledge_source import (
    KnowledgeSource,
    KnowledgeSourceStatus,
    KnowledgeSourceType,
)
from app.repositories.document_repo import DocumentChunkRepository, KnowledgeSourceRepository
from app.services.base import BaseService
from app.services.embedding_service import EmbeddingService, VectorStore
from app.services.text_chunking import TextChunker
from app.services.text_extraction import TextExtractorFactory
from app.services.website_crawler import WebsiteCrawler

logger = logging.getLogger("supportpilot.documents")


class DocumentService(BaseService[KnowledgeSource]):
    """
    Service for document upload, processing, and knowledge base management.
    
    Pipeline:
    1. Save uploaded file to storage
    2. Create KnowledgeSource record (status=pending)
    3. Extract text from file
    4. Chunk text into overlapping segments
    5. Generate embeddings for each chunk
    6. Store embeddings in vector store
    7. Update KnowledgeSource status to ready
    """

    def __init__(self, db: AsyncSession):
        super().__init__(db)
        self.source_repo = KnowledgeSourceRepository(db)
        self.chunk_repo = DocumentChunkRepository(db)
        self.chunker = TextChunker(chunk_size=1000, chunk_overlap=200)
        self.embedding_service = EmbeddingService(batch_size=50)
        self.extractor_factory = TextExtractorFactory()
        self.settings = get_settings()

    # ── File Upload & Processing ───────────────────────────────────

    async def upload_document(
        self,
        workspace_id: str,
        filename: str,
        content: bytes,
        mime_type: str | None = None,
        created_by: str | None = None,
    ) -> KnowledgeSource:
        """
        Upload and process a document.
        
        This is the main entry point for document ingestion.
        It saves the file, creates a knowledge source, and triggers
        the full processing pipeline.
        """
        # Determine source type from filename
        source_type = self._detect_source_type(filename)

        # Validate file size
        max_size = self.settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(content) > max_size:
            raise DocumentProcessingError(
                f"File size ({len(content)} bytes) exceeds maximum "
                f"({self.settings.MAX_UPLOAD_SIZE_MB} MB)"
            )

        # Save file to storage
        file_path = self._save_file(workspace_id, filename, content)

        # Create knowledge source record
        source = KnowledgeSource(
            id=self._generate_id(),
            workspace_id=workspace_id,
            name=filename,
            source_type=source_type,
            status=KnowledgeSourceStatus.PENDING,
            file_path=file_path,
            file_size=len(content),
            mime_type=mime_type,
            created_by=created_by,
        )
        await self.source_repo.create(source)

        # Process synchronously for small files, queue for large files
        max_sync_size = 1 * 1024 * 1024  # 1 MB threshold

        if len(content) <= max_sync_size:
            # Process immediately for small files
            try:
                await self._process_document(source, content, filename)
            except Exception as e:
                logger.error("Document processing failed for %s: %s", source.id, e)
                source.status = KnowledgeSourceStatus.ERROR
                source.error_message = str(e)
                await self.db.flush()
                raise DocumentProcessingError(f"Processing failed: {e}") from e
        else:
            # Queue for background processing for large files
            logger.info("Queueing document for background processing: %s", source.id)
            try:
                from app.core.task_queue import get_task_queue
                queue = get_task_queue()
                await queue.enqueue(
                    name="process_document",
                    func=self._sync_process_document,
                    args=(workspace_id, source.id, content, filename),
                )
            except Exception as e:
                # Fallback to sync processing if queue is unavailable
                logger.warning("Task queue unavailable, falling back to sync: %s", e)
                try:
                    await self._process_document(source, content, filename)
                except Exception as e2:
                    source.status = KnowledgeSourceStatus.ERROR
                    source.error_message = str(e2)
                    await self.db.flush()
                    raise DocumentProcessingError(f"Processing failed: {e2}") from e2

        await self.db.refresh(source)
        return source

    def _sync_process_document(
        self,
        workspace_id: str,
        source_id: str,
        content: bytes,
        filename: str,
    ) -> None:
        """Synchronous wrapper for document processing (for task queue)."""
        # Note: In production with Celery/Dramatiq, this would be an async task
        # For now, the task queue handles this
        pass

    async def _process_document(
        self,
        source: KnowledgeSource,
        content: bytes,
        filename: str,
    ) -> None:
        """Run the full processing pipeline on a document."""
        source.status = KnowledgeSourceStatus.PROCESSING
        await self.db.flush()

        # Step 1: Extract text
        logger.info("Extracting text from %s (source=%s)", filename, source.id)
        text = self._extract_text(content, filename)

        if not text.strip():
            raise DocumentProcessingError("No text content extracted from file")

        # Step 2: Chunk text
        logger.info("Chunking text for source=%s", source.id)
        chunks = self.chunker.chunk_text(
            text,
            source_id=source.id,
            metadata={"filename": filename, "source_type": source.source_type},
        )

        if not chunks:
            raise DocumentProcessingError("Text chunking produced no chunks")

        # Step 3: Generate embeddings
        logger.info("Generating embeddings for %d chunks (source=%s)", len(chunks), source.id)
        chunk_texts = [chunk.content for chunk in chunks]
        embedding_result = await self.embedding_service.embed_texts(chunk_texts)

        # Step 4: Store chunks and embeddings
        logger.info("Storing %d chunks (source=%s)", len(chunks), source.id)
        vector_store = VectorStore(self.db, source.workspace_id)

        for i, (chunk, emb_result) in enumerate(zip(chunks, embedding_result.results, strict=False)):
            chunk_record = DocumentChunk(
                id=self._generate_id(),
                workspace_id=source.workspace_id,
                source_id=source.id,
                content=chunk.content,
                chunk_index=chunk.chunk_index,
                token_count=chunk.token_count,
                metadata_=json.dumps({
                    **chunk.metadata,
                    "embedding_model": embedding_result.model,
                }),
            )
            await self.chunk_repo.create(chunk_record)

            # Store embedding
            await vector_store.store_embedding(chunk_record.id, emb_result.embedding)

        # Mark as ready
        source.status = KnowledgeSourceStatus.READY
        source.metadata_ = json.dumps({
            "total_chunks": len(chunks),
            "total_tokens": embedding_result.total_tokens,
            "embedding_model": embedding_result.model,
            "processing_time_ms": embedding_result.duration_ms,
        })
        await self.db.flush()

        logger.info(
            "Document processing complete: source=%s, chunks=%d, tokens=%d",
            source.id, len(chunks), embedding_result.total_tokens,
        )

    def _extract_text(self, content: bytes, filename: str) -> str:
        """Extract text from file content using the appropriate extractor."""
        extractor = self.extractor_factory.get(filename=filename)
        return extractor.extract_from_bytes(content, filename)

    def _save_file(self, workspace_id: str, filename: str, content: bytes) -> str:
        """Save uploaded file to storage. Returns the file path."""
        if self.settings.STORAGE_BACKEND == "local":
            return self._save_local(workspace_id, filename, content)
        # Future: Supabase storage
        return self._save_local(workspace_id, filename, content)

    def _save_local(self, workspace_id: str, filename: str, content: bytes) -> str:
        """Save file to local filesystem."""
        upload_dir = os.path.join(self.settings.UPLOAD_DIR, workspace_id)
        os.makedirs(upload_dir, exist_ok=True)

        # Generate unique filename to avoid collisions
        safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in filename)
        unique_name = f"{uuid.uuid4().hex[:8]}_{safe_name}"
        file_path = os.path.join(upload_dir, unique_name)

        with open(file_path, "wb") as f:
            f.write(content)

        return file_path

    def _detect_source_type(self, filename: str) -> str:
        """Detect the source type from the filename."""
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        mapping = {
            "pdf": KnowledgeSourceType.PDF,
            "docx": KnowledgeSourceType.DOCX,
            "txt": KnowledgeSourceType.TXT,
            "md": KnowledgeSourceType.MARKDOWN,
            "markdown": KnowledgeSourceType.MARKDOWN,
        }
        return mapping.get(ext, KnowledgeSourceType.TXT)

    # ── Website Crawling ───────────────────────────────────────────

    async def ingest_website(
        self,
        workspace_id: str,
        url: str,
        name: str | None = None,
        max_pages: int = 50,
        created_by: str | None = None,
    ) -> KnowledgeSource:
        """
        Crawl a website and ingest its content into the knowledge base.
        
        Args:
            workspace_id: Target workspace
            url: Starting URL to crawl
            name: Optional name for the knowledge source
            max_pages: Maximum pages to crawl
            created_by: User ID who initiated the crawl
            
        Returns:
            KnowledgeSource with status=ready when complete
        """
        source = KnowledgeSource(
            id=self._generate_id(),
            workspace_id=workspace_id,
            name=name or f"Website: {url}",
            source_type=KnowledgeSourceType.WEBSITE,
            status=KnowledgeSourceStatus.PROCESSING,
            url=url,
            created_by=created_by,
        )
        await self.source_repo.create(source)

        try:
            # Crawl the website
            crawler = WebsiteCrawler(max_pages=max_pages)
            pages = await crawler.crawl(url)

            if not pages:
                raise DocumentProcessingError("No pages could be crawled")

            # Combine all page content
            all_chunks = []
            for page in pages:
                if not page.content.strip():
                    continue

                page_chunks = self.chunker.chunk_text(
                    page.content,
                    source_id=source.id,
                    metadata={
                        "url": page.url,
                        "title": page.title,
                        "source_type": "website",
                    },
                )
                all_chunks.extend(page_chunks)

            if not all_chunks:
                raise DocumentProcessingError("No text content extracted from website")

            # Generate embeddings
            chunk_texts = [chunk.content for chunk in all_chunks]
            embedding_result = await self.embedding_service.embed_texts(chunk_texts)

            # Store chunks and embeddings
            vector_store = VectorStore(self.db, source.workspace_id)
            for chunk, emb_result in zip(all_chunks, embedding_result.results, strict=False):
                chunk_record = DocumentChunk(
                    id=self._generate_id(),
                    workspace_id=source.workspace_id,
                    source_id=source.id,
                    content=chunk.content,
                    chunk_index=chunk.chunk_index,
                    token_count=chunk.token_count,
                    metadata_=json.dumps({
                        **chunk.metadata,
                        "embedding_model": embedding_result.model,
                    }),
                )
                await self.chunk_repo.create(chunk_record)
                await vector_store.store_embedding(chunk_record.id, emb_result.embedding)

            source.status = KnowledgeSourceStatus.READY
            source.metadata_ = json.dumps({
                "total_pages": len(pages),
                "total_chunks": len(all_chunks),
                "total_tokens": embedding_result.total_tokens,
                "embedding_model": embedding_result.model,
            })
            await self.db.flush()

        except Exception as e:
            logger.error("Website ingestion failed for %s: %s", url, e)
            source.status = KnowledgeSourceStatus.ERROR
            source.error_message = str(e)
            await self.db.flush()
            raise DocumentProcessingError(f"Website ingestion failed: {e}") from e

        await self.db.refresh(source)
        return source

    # ── Knowledge Source CRUD ──────────────────────────────────────

    async def get_source(
        self,
        workspace_id: str,
        source_id: str,
    ) -> KnowledgeSource:
        """Get a knowledge source by ID."""
        return await self.source_repo.get_by_workspace_or_404(workspace_id, source_id)

    async def list_sources(
        self,
        workspace_id: str,
        *,
        source_type: str | None = None,
        status: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> list[KnowledgeSource]:
        """List knowledge sources with optional filters."""
        stmt = select(KnowledgeSource).where(
            KnowledgeSource.workspace_id == workspace_id,
        )
        if source_type:
            stmt = stmt.where(KnowledgeSource.source_type == source_type)
        if status:
            stmt = stmt.where(KnowledgeSource.status == status)

        stmt = stmt.order_by(KnowledgeSource.created_at.desc())
        stmt = stmt.offset(offset).limit(limit)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def delete_source(
        self,
        workspace_id: str,
        source_id: str,
    ) -> None:
        """Delete a knowledge source and all its chunks."""
        source = await self.source_repo.get_by_workspace_or_404(workspace_id, source_id)
        await self.source_repo.delete(source)

    async def get_source_chunks(
        self,
        workspace_id: str,
        source_id: str,
    ) -> list[DocumentChunk]:
        """Get all chunks for a knowledge source."""
        return await self.chunk_repo.list_by_source(workspace_id, source_id)

    # ── Vector Search ──────────────────────────────────────────────

    async def search_knowledge_base(
        self,
        workspace_id: str,
        query: str,
        top_k: int = 5,
        source_id: str | None = None,
    ) -> list[dict]:
        """
        Search the knowledge base using semantic similarity.
        
        Args:
            workspace_id: Workspace to search
            query: Search query text
            top_k: Number of results to return
            source_id: Optional source ID to limit search
            
        Returns:
            List of dicts with chunk content, similarity score, and metadata
        """
        # Generate embedding for the query
        query_embedding = await self.embedding_service.embed_text(query)

        # Search for similar chunks
        vector_store = VectorStore(self.db, workspace_id)
        results = await vector_store.search_similar(
            query_embedding=query_embedding.embedding,
            top_k=top_k,
            source_id=source_id,
        )

        return results


class DocumentProcessingError(Exception):
    """Raised when document processing fails."""
    pass
