"""SupportPilot AI — Workspace Schemas"""

from __future__ import annotations

import json
from datetime import datetime

from pydantic import field_validator

from app.schemas.base import BaseSchema


class WorkspaceCreate(BaseSchema):
    name: str
    slug: str | None = None  # auto-generated from name if not provided


class WorkspaceUpdate(BaseSchema):
    name: str | None = None
    logo_url: str | None = None
    settings: dict | None = None


class WorkspaceResponse(BaseSchema):
    id: str
    name: str
    slug: str
    logo_url: str | None = None
    plan: str = "free"
    is_active: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None


class WorkspaceDetailResponse(WorkspaceResponse):
    plan_limits: dict | None = None
    member_count: int = 0
    document_count: int = 0

    @field_validator("plan_limits", mode="before")
    @classmethod
    def parse_plan_limits(cls, v):
        """Parse plan_limits from JSON string if needed."""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return {}
        return v
