"""SupportPilot AI — Text Chunking Service

Splits extracted text into overlapping chunks for embedding.
Uses a character-based approach with configurable chunk size and overlap.
In production, this can be swapped for LangChain's RecursiveCharacterTextSplitter.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field

logger = logging.getLogger("supportpilot.chunking")


@dataclass
class Chunk:
    """A single text chunk with metadata."""
    content: str
    chunk_index: int
    source_id: str = ""
    start_char: int = 0
    end_char: int = 0
    token_count: int = 0
    metadata: dict = field(default_factory=dict)


class TextChunker:
    """
    Splits text into overlapping chunks.
    
    Strategy:
    1. Split on paragraph boundaries (double newline) first
    2. If a paragraph exceeds max_chunk_size, split on sentences
    3. If a sentence exceeds max_chunk_size, split on words
    4. Apply overlap between consecutive chunks
    
    This preserves semantic boundaries as much as possible.
    """

    # Approximate tokens per character (rough estimate for greedy counting)
    CHARS_PER_TOKEN = 4

    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        separators: list[str] | None = None,
    ):
        """
        Args:
            chunk_size: Maximum characters per chunk
            chunk_overlap: Number of characters to overlap between chunks
            separators: Ordered list of separator strings to split on.
                       Defaults to paragraph, sentence, then word boundaries.
        """
        if chunk_overlap >= chunk_size:
            raise ValueError(
                f"chunk_overlap ({chunk_overlap}) must be less than chunk_size ({chunk_size})"
            )

        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n\n", "\n", ". ", "! ", "? ", " "]

    def chunk_text(
        self,
        text: str,
        source_id: str = "",
        metadata: dict | None = None,
    ) -> list[Chunk]:
        """
        Split text into chunks.
        
        Args:
            text: The text to chunk
            source_id: ID of the source document
            metadata: Optional metadata to attach to each chunk
            
        Returns:
            List of Chunk objects
        """
        if not text or not text.strip():
            return []

        # Clean the text
        text = self._clean_text(text)

        # Split into raw chunks respecting boundaries
        raw_chunks = self._split_text(text)

        # Apply overlap
        overlapped = self._apply_overlap(raw_chunks)

        # Build Chunk objects
        chunks = []
        current_pos = 0
        for i, content in enumerate(overlapped):
            start = text.find(content, current_pos) if content else current_pos
            end = start + len(content) if content else current_pos
            current_pos = start + max(1, len(content) - self.chunk_overlap)

            chunk_meta = {
                **(metadata or {}),
                "char_start": start,
                "char_end": end,
            }

            chunks.append(Chunk(
                content=content,
                chunk_index=i,
                source_id=source_id,
                start_char=start,
                end_char=end,
                token_count=self._estimate_tokens(content),
                metadata=chunk_meta,
            ))

        logger.info(
            "Chunked text into %d chunks (source=%s, total_chars=%d)",
            len(chunks), source_id, len(text),
        )
        return chunks

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text before chunking."""
        # Normalize whitespace
        text = re.sub(r"\r\n", "\n", text)
        text = re.sub(r"\r", "\n", text)
        # Remove excessive blank lines (keep at most 2)
        text = re.sub(r"\n{3,}", "\n\n", text)
        # Remove excessive spaces
        text = re.sub(r" {2,}", " ", text)
        return text.strip()

    def _split_text(self, text: str) -> list[str]:
        """Recursively split text respecting semantic boundaries."""
        return self._recursive_split(text, self.separators)

    def _recursive_split(self, text: str, separators: list[str]) -> list[str]:
        """
        Recursively split text using the given separators.
        Uses the first separator that produces valid chunks.
        Falls back to character-level splitting if all else fails.
        """
        if len(text) <= self.chunk_size:
            return [text] if text.strip() else []

        if not separators:
            # Character-level fallback
            return self._hard_split(text)

        separator = separators[0]
        remaining_separators = separators[1:]

        parts = text.split(separator)
        chunks: list[str] = []
        current = ""

        for part in parts:
            addition = (separator + part) if current else part

            if len(current) + len(addition) <= self.chunk_size:
                current += addition
            else:
                # Save current chunk if it has content
                if current.strip():
                    chunks.append(current.strip())

                # If the part itself is too big, recurse with next separator
                if len(part) > self.chunk_size:
                    if remaining_separators:
                        sub_chunks = self._recursive_split(part, remaining_separators)
                        chunks.extend(sub_chunks)
                        current = ""
                    else:
                        # Hard split this oversized part
                        hard_chunks = self._hard_split(part)
                        chunks.extend(hard_chunks)
                        current = ""
                else:
                    current = part

        # Don't forget the last chunk
        if current.strip():
            chunks.append(current.strip())

        return chunks

    def _hard_split(self, text: str) -> list[str]:
        """Split text at exact character boundaries (last resort)."""
        chunks = []
        for i in range(0, len(text), self.chunk_size):
            chunk = text[i:i + self.chunk_size].strip()
            if chunk:
                chunks.append(chunk)
        return chunks

    def _apply_overlap(self, chunks: list[str]) -> list[str]:
        """Add overlap between consecutive chunks."""
        if len(chunks) <= 1 or self.chunk_overlap == 0:
            return chunks

        result = [chunks[0]]

        for i in range(1, len(chunks)):
            prev = chunks[i - 1]
            current = chunks[i]

            # Take the end of the previous chunk as prefix
            overlap_text = prev[-self.chunk_overlap:] if len(prev) > self.chunk_overlap else prev
            merged = overlap_text + " " + current

            # Only add overlap if it doesn't exceed chunk_size too much
            if len(merged) <= self.chunk_size * 1.5:
                result.append(merged)
            else:
                result.append(current)

        return result

    def _estimate_tokens(self, text: str) -> int:
        """Rough token estimation using character count."""
        return max(1, len(text) // self.CHARS_PER_TOKEN)
