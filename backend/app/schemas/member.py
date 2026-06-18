"""SupportPilot AI — Member Schemas"""

from __future__ import annotations

from datetime import datetime

from app.schemas.base import BaseSchema


class MemberInvite(BaseSchema):
    email: str
    role: str = "member"


class MemberUpdate(BaseSchema):
    role: str | None = None
    is_active: bool | None = None


class MemberResponse(BaseSchema):
    id: str
    workspace_id: str
    user_id: str
    role: str
    is_active: bool = True
    joined_at: datetime | None = None
    user_email: str | None = None
    user_name: str | None = None
