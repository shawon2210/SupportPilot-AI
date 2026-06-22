"""SupportPilot AI — Knowledge Source Schemas"""

from __future__ import annotations

import json
from datetime import datetime

from pydantic import field_validator

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
    metadata_: dict | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @field_validator("metadata_", mode="before")
    @classmethod
    def parse_metadata(cls, v: object) -> object:
        if isinstance(v, str):
            return json.loads(v) if v else {}
        return v
