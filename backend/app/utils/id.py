"""SupportPilot AI — Utility Functions"""

from __future__ import annotations

import uuid


def generate_uuid4() -> str:
    """Generate a UUID4 string."""
    return str(uuid.uuid4())
