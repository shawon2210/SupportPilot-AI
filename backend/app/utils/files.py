"""SupportPilot AI — File Validation Utilities"""

from __future__ import annotations

from pathlib import Path

# Allowed MIME types for document uploads
ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain": ".txt",
    "text/markdown": ".md",
    "text/x-markdown": ".md",
}

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}


def validate_file_type(filename: str, content_type: str | None = None) -> bool:
    """
    Validate that a file type is allowed for upload.
    Checks both extension and MIME type.
    """
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False

    if content_type and content_type not in ALLOWED_MIME_TYPES:
        return False

    return True


def get_file_extension(content_type: str) -> str:
    """Get the file extension for a MIME type."""
    return ALLOWED_MIME_TYPES.get(content_type, ".bin")


def format_file_size(size_bytes: int) -> str:
    """Format file size in human-readable format."""
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"
