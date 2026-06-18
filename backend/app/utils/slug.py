"""SupportPilot AI — Slug Generation Utility"""

from __future__ import annotations

import re


def generate_slug(name: str, max_length: int = 128) -> str:
    """
    Generate a URL-safe slug from a name.
    Example: "Acme Corp Support" -> "acme-corp-support"
    """
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug[:max_length]
