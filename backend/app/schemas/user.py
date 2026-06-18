"""SupportPilot AI — User Schemas"""

from __future__ import annotations

from datetime import datetime

from app.schemas.base import BaseSchema


class UserCreate(BaseSchema):
    id: str
    email: str
    first_name: str | None = None
    last_name: str | None = None
    avatar_url: str | None = None


class UserUpdate(BaseSchema):
    first_name: str | None = None
    last_name: str | None = None
    avatar_url: str | None = None


class UserResponse(BaseSchema):
    id: str
    email: str
    first_name: str | None = None
    last_name: str | None = None
    avatar_url: str | None = None
    is_active: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None
