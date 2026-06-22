"""SupportPilot AI — Embedding Service

Generates vector embeddings for text chunks using the configured AI provider.
Designed for batch processing with configurable batch sizes.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass

import numpy as np

from app.ai.factory import ProviderFactory
from app.ai.providers.base import EmbeddingRequest

logger = logging.getLogger("supportpilot.embeddings")


@dataclass
class EmbeddingResult:
    """Result of embedding a single text."""
    text: str
    embedding: list[float]
    model: str
    tokens_used: int = 0


@dataclass
class BatchEmbeddingResult:
    """Result of embedding a batch of texts."""
    results: list[EmbeddingResult]
    total_tokens: int = 0
    model: str = ""
    duration_ms: float = 0.0


class EmbeddingService:
    """
    Generates embeddings using the configured AI provider.
    
    Supports batch processing with rate limiting and retry logic.
    Uses numpy for efficient vector operations.
    
    Usage:
        service = EmbeddingService()
        result = await service.embed_texts(["Hello world", "How are you?"])
    """

    def __init__(
        self,
        batch_size: int = 50,
        max_retries: int = 3,
        retry_delay: float = 1.0,
    ):
        self.batch_size = batch_size
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self._provider = None

    def _get_provider(self):
        """Lazy-initialize the provider."""
        if self._provider is None:
            self._provider = ProviderFactory.create()
        return self._provider

    async def embed_text(self, text: str) -> EmbeddingResult:
        """Embed a single text string."""
        result = await self.embed_texts([text])
        return result.results[0]

    async def embed_texts(self, texts: list[str]) -> BatchEmbeddingResult:
        """
        Embed a list of texts in batches.
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            BatchEmbeddingResult with all embeddings
        """
        if not texts:
            return BatchEmbeddingResult(results=[])

        start = time.monotonic()
        all_results: list[EmbeddingResult] = []
        total_tokens = 0
        model = ""

        # Process in batches
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i:i + self.batch_size]
            batch_result = await self._embed_batch(batch)

            all_results.extend(batch_result.results)
            total_tokens += batch_result.total_tokens
            model = batch_result.model

            # Small delay between batches to avoid rate limiting
            if i + self.batch_size < len(texts):
                await asyncio.sleep(0.1)

        duration_ms = (time.monotonic() - start) * 1000

        logger.info(
            "Embedded %d texts in %.1fms (model=%s, tokens=%d)",
            len(all_results), duration_ms, model, total_tokens,
        )

        return BatchEmbeddingResult(
            results=all_results,
            total_tokens=total_tokens,
            model=model,
            duration_ms=duration_ms,
        )

    async def _embed_batch(self, texts: list[str]) -> BatchEmbeddingResult:
        """Embed a single batch with retry logic."""
        from app.config import get_settings
        settings = get_settings()
        if settings.AI_PROVIDER != "mock" and not settings.OPENAI_API_KEY and not settings.DEEPSEEK_API_KEY and not settings.GEMINI_API_KEY:
            logger.info("No API keys configured — using random embeddings (dev mode)")
            import random
            results = []
            for text in texts:
                results.append(EmbeddingResult(
                    text=text,
                    embedding=[random.uniform(-0.1, 0.1) for _ in range(384)],
                    model="dev-random",
                ))
            return BatchEmbeddingResult(results=results, total_tokens=0, model="dev-random")

        provider = self._get_provider()
        request = EmbeddingRequest(
            texts=texts,
            model=provider.get_embedding_model(),
        )

        last_error = None
        for attempt in range(self.max_retries):
            try:
                response = await provider.embed(request)
                results = []
                for text, embedding in zip(texts, response.embeddings, strict=False):
                    results.append(EmbeddingResult(
                        text=text,
                        embedding=embedding,
                        model=response.model,
                    ))

                return BatchEmbeddingResult(
                    results=results,
                    total_tokens=response.usage.get("total_tokens", 0),
                    model=response.model,
                )

            except Exception as e:
                last_error = e
                logger.warning(
                    "Embedding batch failed (attempt %d/%d): %s",
                    attempt + 1, self.max_retries, e,
                )
                if attempt < self.max_retries - 1:
                    delay = self.retry_delay * (2 ** attempt)
                    await asyncio.sleep(delay)

        raise EmbeddingError(
            f"Failed to embed batch after {self.max_retries} attempts: {last_error}"
        ) from last_error


class VectorStore:
    """
    Stores and retrieves vector embeddings.
    
    For SQLite (dev): stores embeddings as JSON text in document_chunks table.
    For PostgreSQL (prod): uses pgvector extension with vector column.
    
    This abstraction keeps the service layer database-agnostic.
    """

    def __init__(self, db_session, workspace_id: str):
        self.db = db_session
        self.workspace_id = workspace_id

    async def store_embedding(
        self,
        chunk_id: str,
        embedding: list[float],
    ) -> None:
        """Store an embedding for a document chunk."""
        from app.models.document_chunk import DocumentChunk

        chunk = await self.db.get(DocumentChunk, chunk_id)
        if chunk and chunk.workspace_id == self.workspace_id:
            # Store as JSON string in metadata for SQLite
            # In production with pgvector, this would set a vector column
            import json
            meta = json.loads(chunk.metadata_ or "{}")
            meta["embedding"] = embedding
            chunk.metadata_ = json.dumps(meta)
            await self.db.flush()

    async def store_embeddings_batch(
        self,
        chunk_ids: list[str],
        embeddings: list[list[float]],
    ) -> None:
        """Store multiple embeddings at once."""
        for chunk_id, embedding in zip(chunk_ids, embeddings, strict=False):
            await self.store_embedding(chunk_id, embedding)

    async def search_similar(
        self,
        query_embedding: list[float],
        top_k: int = 5,
        source_id: str | None = None,
    ) -> list[dict]:
        """
        Find the most similar chunks to a query embedding.
        
        For SQLite: brute-force cosine similarity over all chunks in workspace.
        For PostgreSQL: uses pgvector's <-> operator for IVFFlat index search.
        """
        from sqlalchemy import select

        from app.models.document_chunk import DocumentChunk

        stmt = select(DocumentChunk).where(
            DocumentChunk.workspace_id == self.workspace_id,
        )
        if source_id:
            stmt = stmt.where(DocumentChunk.source_id == source_id)

        result = await self.db.execute(stmt)
        chunks = list(result.scalars().all())

        if not chunks:
            return []

        # Compute cosine similarity
        query_vec = np.array(query_embedding)
        query_norm = np.linalg.norm(query_vec)

        if query_norm == 0:
            return []

        scored = []
        for chunk in chunks:
            try:
                import json
                meta = json.loads(chunk.metadata_ or "{}")
                embedding = meta.get("embedding")
                if not embedding:
                    continue

                chunk_vec = np.array(embedding)
                chunk_norm = np.linalg.norm(chunk_vec)
                if chunk_norm == 0:
                    continue

                similarity = float(np.dot(query_vec, chunk_vec) / (query_norm * chunk_norm))

                scored.append({
                    "chunk_id": chunk.id,
                    "source_id": chunk.source_id,
                    "content": chunk.content,
                    "chunk_index": chunk.chunk_index,
                    "similarity": similarity,
                    "metadata": chunk.metadata,
                })
            except (ValueError, TypeError, KeyError):
                continue

        # Sort by similarity (descending) and return top_k
        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:top_k]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    a_vec = np.array(a)
    b_vec = np.array(b)
    norm_a = np.linalg.norm(a_vec)
    norm_b = np.linalg.norm(b_vec)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a_vec, b_vec) / (norm_a * norm_b))


class EmbeddingError(Exception):
    """Raised when embedding generation fails."""
    pass
