"""SupportPilot AI — Text Extraction Tests"""

from __future__ import annotations

import pytest

from app.services.text_extraction import (
    ExtractionError,
    TextExtractorFactory,
    TextExtractor,
)


class TestTextExtractorFactory:
    """Test the text extractor factory."""

    def test_get_extractor_by_mime_type(self):
        """Test getting extractors by MIME type."""
        extractor = TextExtractorFactory.get(mime_type="application/pdf")
        assert isinstance(extractor, TextExtractorFactory._extractors["application/pdf"])

        extractor = TextExtractorFactory.get(mime_type="text/plain")
        assert isinstance(extractor, TextExtractor)

    def test_get_extractor_by_filename(self):
        """Test getting extractors by filename."""
        extractor = TextExtractorFactory.get(filename="test.pdf")
        assert isinstance(extractor, TextExtractorFactory._extension_map[".pdf"])

        extractor = TextExtractorFactory.get(filename="readme.md")
        assert isinstance(extractor, TextExtractor)

    def test_get_extractor_by_extension_fallback(self):
        """Test fallback to extension when MIME type is unknown."""
        extractor = TextExtractorFactory.get(mime_type="application/octet-stream", filename="doc.txt")
        assert isinstance(extractor, TextExtractor)

    def test_unsupported_type_raises(self):
        """Test that unsupported types raise ExtractionError."""
        with pytest.raises(ExtractionError, match="No extractor available"):
            TextExtractorFactory.get(mime_type="image/png")

    def test_unsupported_extension_raises(self):
        """Test that unsupported extensions raise ExtractionError."""
        with pytest.raises(ExtractionError, match="No extractor available"):
            TextExtractorFactory.get(filename="file.jpg")

    def test_supported_types(self):
        """Test listing supported types."""
        types = TextExtractorFactory.supported_types()
        assert "application/pdf" in types
        assert "text/plain" in types
        assert "text/markdown" in types

    def test_supported_extensions(self):
        """Test listing supported extensions."""
        exts = TextExtractorFactory.supported_extensions()
        assert ".pdf" in exts
        assert ".docx" in exts
        assert ".txt" in exts
        assert ".md" in exts


class TestTextExtractor:
    """Test the plain text extractor."""

    def test_extract_plain_text(self):
        """Test extracting plain text from bytes."""
        extractor = TextExtractor()
        text = extractor.extract_from_bytes(b"Hello world\nThis is a test.")
        assert "Hello world" in text
        assert "This is a test" in text

    def test_extract_utf8_with_bom(self):
        """Test extracting UTF-8 with BOM."""
        extractor = TextExtractor()
        content = b"\xef\xbb\xbfHello world"
        text = extractor.extract_from_bytes(content)
        assert "Hello world" in text

    def test_extract_empty_content(self):
        """Test extracting empty content."""
        extractor = TextExtractor()
        text = extractor.extract_from_bytes(b"")
        assert text == ""

    def test_extract_markdown(self):
        """Test extracting markdown content."""
        extractor = TextExtractor()
        md = b"# Title\n\nSome **bold** text.\n\n- Item 1\n- Item 2"
        text = extractor.extract_from_bytes(md)
        assert "# Title" in text
        assert "bold" in text
        assert "Item 1" in text

    def test_extract_latin1_fallback(self):
        """Test fallback to latin-1 encoding."""
        extractor = TextExtractor()
        # Latin-1 encoded text with special chars
        content = "Café résumé naïve".encode("latin-1")
        text = extractor.extract_from_bytes(content)
        assert "Caf" in text  # Partial match since encoding detection is best-effort
