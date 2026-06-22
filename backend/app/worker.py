"""SupportPilot AI — Background Worker Runner

Entry point for the background worker process.
Handles document processing, knowledge gap detection, and other async tasks.
"""

from __future__ import annotations

import asyncio
import logging
import os

from app.core.database import async_session_factory, close_db, init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("supportpilot.worker")


async def process_document_task(workspace_id: str, source_id: str) -> None:
    """
    Background task to process a document.
    This runs outside the request cycle.
    """
    from sqlalchemy import select

    from app.models.knowledge_source import KnowledgeSource, KnowledgeSourceStatus

    async with async_session_factory() as db:
        try:
            # Get the source — scoped to workspace for tenant isolation
            stmt = select(KnowledgeSource).where(
                KnowledgeSource.id == source_id,
                KnowledgeSource.workspace_id == workspace_id,
            )
            result = await db.execute(stmt)
            source = result.scalar_one_or_none()

            if not source:
                logger.error("Source %s not found for processing", source_id)
                return

            source.status = KnowledgeSourceStatus.PROCESSING
            await db.flush()

            # Read the file
            if source.file_path and os.path.exists(source.file_path):
                with open(source.file_path, "rb") as f:
                    content = f.read()
            else:
                logger.error("File not found: %s", source.file_path)
                source.status = KnowledgeSourceStatus.ERROR
                source.error_message = "File not found on disk"
                await db.flush()
                return

            # Process using document service pipeline
            import json

            from app.core.security import generate_uuid
            from app.models.document_chunk import DocumentChunk
            from app.services.embedding_service import EmbeddingService, VectorStore
            from app.services.text_chunking import TextChunker
            from app.services.text_extraction import TextExtractorFactory

            extractor_factory = TextExtractorFactory()
            chunker = TextChunker(chunk_size=1000, chunk_overlap=200)
            embedding_service = EmbeddingService(batch_size=50)

            # Extract text
            extractor = extractor_factory.get(filename=source.name)
            text = extractor.extract_from_bytes(content, source.name)

            if not text.strip():
                source.status = KnowledgeSourceStatus.ERROR
                source.error_message = "No text content extracted"
                await db.flush()
                return

            # Chunk
            chunks = chunker.chunk_text(
                text,
                source_id=source.id,
                metadata={"filename": source.name, "source_type": source.source_type},
            )

            if not chunks:
                source.status = KnowledgeSourceStatus.ERROR
                source.error_message = "Text chunking produced no chunks"
                await db.flush()
                return

            # Embed
            chunk_texts = [chunk.content for chunk in chunks]
            embedding_result = await embedding_service.embed_texts(chunk_texts)

            # Store
            vector_store = VectorStore(db, source.workspace_id)
            for chunk, emb_result in zip(chunks, embedding_result.results, strict=False):
                chunk_record = DocumentChunk(
                    id=generate_uuid(),
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
                db.add(chunk_record)
                await db.flush()
                await vector_store.store_embedding(chunk_record.id, emb_result.embedding)

            source.status = KnowledgeSourceStatus.READY
            source.metadata_ = json.dumps({
                "total_chunks": len(chunks),
                "total_tokens": embedding_result.total_tokens,
                "embedding_model": embedding_result.model,
            })
            await db.commit()
            logger.info("Document processed: source=%s, chunks=%d", source_id, len(chunks))

        except Exception as e:
            logger.error("Document processing failed for source=%s: %s", source_id, e)
            try:
                stmt = select(KnowledgeSource).where(KnowledgeSource.id == source_id)
                result = await db.execute(stmt)
                source = result.scalar_one_or_none()
                if source:
                    source.status = KnowledgeSourceStatus.ERROR
                    source.error_message = str(e)
                    await db.commit()
            except Exception:
                pass


async def knowledge_gap_detection_task(workspace_id: str) -> None:
    """Periodic task to detect knowledge gaps in a workspace."""
    async with async_session_factory() as db:
        try:
            from app.services.ai_features_service import AIFeaturesService
            service = AIFeaturesService(db)
            gaps = await service.detect_knowledge_gaps(workspace_id)
            if gaps:
                logger.info("Detected %d knowledge gaps in workspace %s", len(gaps), workspace_id)
        except Exception as e:
            logger.error("Knowledge gap detection failed: %s", e)


async def main():
    """Main worker loop."""
    logger.info("Starting SupportPilot background worker")
    await init_db()

    # In a production setup, this would connect to a message broker
    # (Redis/RabbitMQ) and consume tasks. For now, run periodic tasks.
    while True:
        try:
            # Run knowledge gap detection periodically for all workspaces
            async with async_session_factory() as db:
                from sqlalchemy import select

                from app.models.workspace import Workspace
                stmt = select(Workspace).where(Workspace.is_active == True)  # noqa: E712
                result = await db.execute(stmt)
                workspaces = list(result.scalars().all())

                for ws in workspaces:
                    await knowledge_gap_detection_task(ws.id)

            # Sleep before next cycle (every 6 hours)
            await asyncio.sleep(21600)
        except KeyboardInterrupt:
            logger.info("Worker shutting down")
            break
        except Exception as e:
            logger.error("Worker error: %s", e)
            await asyncio.sleep(60)

    await close_db()


if __name__ == "__main__":
    asyncio.run(main())
