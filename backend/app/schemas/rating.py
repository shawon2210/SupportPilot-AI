"""SupportPilot AI — Rating Schemas"""

from __future__ import annotations

from datetime import datetime

from app.schemas.base import BaseSchema


class RatingCreate(BaseSchema):
    score: int  # 1–5
    comment: str | None = None


class RatingResponse(BaseSchema):
    id: str
    chat_id: str
    workspace_id: str
    score: int
    comment: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
