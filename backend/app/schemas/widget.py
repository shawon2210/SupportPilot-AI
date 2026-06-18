"""SupportPilot AI — Widget Schemas"""

from __future__ import annotations

from app.schemas.base import BaseSchema


class WidgetConfigUpdate(BaseSchema):
    theme: str | None = None
    primary_color: str | None = None
    greeting_message: str | None = None
    placeholder_text: str | None = None
    position: str | None = None
    show_branding: bool | None = None
    allowed_domains: list[str] | None = None
    is_active: bool | None = None


class WidgetConfigResponse(BaseSchema):
    id: str
    workspace_id: str
    theme: str = "light"
    primary_color: str = "#3B82F6"
    greeting_message: str = "Hi! How can I help you?"
    placeholder_text: str = "Type your message..."
    position: str = "right"
    show_branding: bool = True
    is_active: bool = True
