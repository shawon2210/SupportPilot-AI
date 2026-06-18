"""SupportPilot AI — Embedding Service Tests"""

from __future__ import annotations

import pytest

from app.services.embedding_service import (
    EmbeddingService,
    VectorStore,
    cosine_similarity,
)


class TestCosineSimilarity:
    """Test cosine similarity computation."""

    def test_identical_vectors(self):
        """Identical vectors should have similarity 1.0."""
        v = [1.0, 2.0, 3.0]
        assert cosine_similarity(v, v) == pytest.approx(1.0, abs=1e-6)

    def test_orthogonal_vectors(self):
        """Orthogonal vectors should have similarity 0.0."""
        a = [1.0, 0.0, 0.0]
        b = [0.0, 1.0, 0.0]
        assert cosine_similarity(a, b) == pytest.approx(0.0, abs=1e-6)

    def test_opposite_vectors(self):
        """Opposite vectors should have similarity -1.0."""
        a = [1.0, 2.0, 3.0]
        b = [-1.0, -2.0, -3.0]
        assert cosine_similarity(a, b) == pytest.approx(-1.0, abs=1e-6)

    def test_zero_vector(self):
        """Zero vector should return 0.0 similarity."""
        a = [1.0, 2.0, 3.0]
        b = [0.0, 0.0, 0.0]
        assert cosine_similarity(a, b) == 0.0

    def test_similar_vectors(self):
        """Similar vectors should have high similarity."""
        a = [1.0, 2.0, 3.0]
        b = [1.1, 2.1, 2.9]
        sim = cosine_similarity(a, b)
        assert sim > 0.9

    def test_dissimilar_vectors(self):
        """Dissimilar vectors should have low similarity."""
        a = [1.0, 0.0, 0.0]
        b = [0.0, 0.0, 1.0]
        sim = cosine_similarity(a, b)
        assert sim < 0.1


class TestEmbeddingService:
    """Test the embedding service."""

    def test_service_initialization(self):
        """Test that the service initializes with correct defaults."""
        service = EmbeddingService()
        assert service.batch_size == 50
        assert service.max_retries == 3
        assert service.retry_delay == 1.0

    def test_custom_batch_size(self):
        """Test custom batch size."""
        service = EmbeddingService(batch_size=10)
        assert service.batch_size == 10

    def test_custom_retries(self):
        """Test custom retry settings."""
        service = EmbeddingService(max_retries=5, retry_delay=2.0)
        assert service.max_retries == 5
        assert service.retry_delay == 2.0
