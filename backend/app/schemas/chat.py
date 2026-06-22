"""SupportPilot AI — Chat Schemas"""

from __future__ import annotations

from datetime import datetime

from app.schemas.base import BaseSchema


class ChatCreate(BaseSchema):
    title: str | None = None


class ChatUpdate(BaseSchema):
    title: str | None = None
    status: str | None = None


class ChatResponse(BaseSchema):
    id: str
    workspace_id: str
    user_id: str | None = None
    title: str | None = None
    status: str = "active"
    mode: str = "ai"
    assigned_to: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class MessageCreate(BaseSchema):
    content: str


class MessageResponse(BaseSchema):
    id: str
    chat_id: str
    workspace_id: str
    role: str
    content: str
    sources: list | None = None
    tokens_used: int | None = None
    created_at: datetime | None = None


class ChatWithMessages(ChatResponse):
    messages: list[MessageResponse] = []
