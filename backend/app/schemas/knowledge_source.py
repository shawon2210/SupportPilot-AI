"""SupportPilot AI — Knowledge Source Schemas"""

from __future__ import annotations

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
    created_at: str | None = None
    updated_at: str | None = None
