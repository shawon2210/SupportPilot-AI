"""SupportPilot AI — Knowledge Source Schemas"""

from __future__ import annotations

from datetime import datetime

from app.schemas.base import BaseSchema


class KnowledgeSourceResponse(BaseSchema):
    id: str
    workspace_id: str
    name: str
    source_type: str
    status: str = "pending"
    file_size: int | None = None
    mime_type: str | None = None
    url: str | None = None
    error_message: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
