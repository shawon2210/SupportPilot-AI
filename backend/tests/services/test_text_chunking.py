"""SupportPilot AI — Text Chunking Tests"""

from __future__ import annotations

import pytest

from app.services.text_chunking import Chunk, TextChunker


class TestTextChunker:
    """Test the text chunking service."""

    def test_short_text_single_chunk(self):
        """Test that short text produces a single chunk."""
        chunker = TextChunker(chunk_size=1000, chunk_overlap=200)
        chunks = chunker.chunk_text("This is a short text.")
        assert len(chunks) == 1
        assert chunks[0].content == "This is a short text."
        assert chunks[0].chunk_index == 0

    def test_empty_text(self):
        """Test that empty text produces no chunks."""
        chunker = TextChunker()
        chunks = chunker.chunk_text("")
        assert len(chunks) == 0

    def test_whitespace_only(self):
        """Test that whitespace-only text produces no chunks."""
        chunker = TextChunker()
        chunks = chunker.chunk_text("   \n\n   \t\t   ")
        assert len(chunks) == 0

    def test_chunk_count_increases_with_text_size(self):
        """Test that larger text produces more chunks."""
        chunker = TextChunker(chunk_size=100, chunk_overlap=10)
        small_text = "Short text."
        large_text = "This is a much longer text that should produce multiple chunks when split with a small chunk size. " * 5

        small_chunks = chunker.chunk_text(small_text)
        large_chunks = chunker.chunk_text(large_text)

        assert len(large_chunks) >= len(small_chunks)

    def test_chunk_indices_are_sequential(self):
        """Test that chunk indices are sequential starting from 0."""
        chunker = TextChunker(chunk_size=50, chunk_overlap=5)
        text = "This is a test text that should be split into multiple chunks. " * 10
        chunks = chunker.chunk_text(text)

        for i, chunk in enumerate(chunks):
            assert chunk.chunk_index == i

    def test_chunk_overlap(self):
        """Test that chunks have overlap."""
        chunker = TextChunker(chunk_size=100, chunk_overlap=20)
        text = "Word " * 50  # 250 chars
        chunks = chunker.chunk_text(text)

        if len(chunks) > 1:
            # Check that consecutive chunks share some content
            for i in range(1, len(chunks)):
                prev_words = set(chunks[i - 1].content.split())
                curr_words = set(chunks[i].content.split())
                overlap = prev_words & curr_words
                assert len(overlap) > 0, f"Chunks {i-1} and {i} should have overlap"

    def test_chunk_size_respected(self):
        """Test that chunks don't exceed the max size significantly."""
        chunker = TextChunker(chunk_size=100, chunk_overlap=10)
        text = "A" * 1000
        chunks = chunker.chunk_text(text)

        for chunk in chunks:
            # Allow some overflow due to overlap
            assert len(chunk.content) <= 150, f"Chunk too large: {len(chunk.content)}"

    def test_source_id_propagated(self):
        """Test that source_id is set on chunks."""
        chunker = TextChunker(chunk_size=50, chunk_overlap=5)
        chunks = chunker.chunk_text("Test text " * 20, source_id="src-123")

        for chunk in chunks:
            assert chunk.source_id == "src-123"

    def test_metadata_propagated(self):
        """Test that metadata is set on chunks."""
        chunker = TextChunker(chunk_size=50, chunk_overlap=5)
        meta = {"filename": "test.pdf", "page": 1}
        chunks = chunker.chunk_text("Test text " * 20, metadata=meta)

        for chunk in chunks:
            assert chunk.metadata.get("filename") == "test.pdf"

    def test_token_count_estimated(self):
        """Test that token counts are estimated."""
        chunker = TextChunker(chunk_size=500, chunk_overlap=20)
        chunks = chunker.chunk_text("This is a test with some words to count tokens.")

        for chunk in chunks:
            assert chunk.token_count > 0

    def test_paragraph_boundary_preserved(self):
        """Test that paragraph boundaries are respected."""
        chunker = TextChunker(chunk_size=500, chunk_overlap=20)
        text = "First paragraph with some content.\n\nSecond paragraph with different content."
        chunks = chunker.chunk_text(text)

        # Both paragraphs should appear in the output
        all_content = " ".join(c.content for c in chunks)
        assert "First paragraph" in all_content
        assert "Second paragraph" in all_content

    def test_invalid_overlap_raises(self):
        """Test that overlap >= chunk_size raises ValueError."""
        with pytest.raises(ValueError, match="chunk_overlap.*must be less than"):
            TextChunker(chunk_size=100, chunk_overlap=100)

    def test_clean_text_normalization(self):
        """Test that text is cleaned before chunking."""
        chunker = TextChunker(chunk_size=500, chunk_overlap=20)
        text = "Line1\r\n\r\n\r\n\r\nLine2"  # Excessive blank lines
        chunks = chunker.chunk_text(text)

        all_content = " ".join(c.content for c in chunks)
        assert "Line1" in all_content
        assert "Line2" in all_content
