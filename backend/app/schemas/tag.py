"""SupportPilot AI — Chat Tag Schemas"""

from __future__ import annotations

from datetime import datetime

from app.schemas.base import BaseSchema


class TagCreate(BaseSchema):
    name: str
    color: str = "#6366f1"


class TagUpdate(BaseSchema):
    name: str | None = None
    color: str | None = None


class TagResponse(BaseSchema):
    id: str
    workspace_id: str
    name: str
    color: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
