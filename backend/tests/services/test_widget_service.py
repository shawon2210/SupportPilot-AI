"""SupportPilot AI — Widget Service Tests"""

from __future__ import annotations

import pytest

from app.services.widget_service import WidgetService, WidgetChatRequest


class TestWidgetChatRequest:
    """Test widget chat request dataclass."""

    def test_defaults(self):
        """Test default values."""
        req = WidgetChatRequest(message="Hello")
        assert req.message == "Hello"
        assert req.session_id is None
        assert req.visitor_id is None

    def test_with_session(self):
        """Test with session ID."""
        req = WidgetChatRequest(message="Hello", session_id="sess-123")
        assert req.session_id == "sess-123"


class TestWidgetService:
    """Test the widget service."""

    def test_generate_widget_script(self):
        """Test widget script generation."""
        service = WidgetService.__new__(WidgetService)
        script = service.generate_widget_script("ws-123", "https://api.example.com")
        assert "ws-123" in script
        assert "https://api.example.com" in script
        assert "SupportPilot" in script
        assert "<script>" in script

    def test_get_public_config(self):
        """Test public config excludes internal fields."""
        from app.models.widget_config import WidgetConfig
        config = WidgetConfig(
            id="cfg-1",
            workspace_id="ws-1",
            theme="dark",
            primary_color="#FF0000",
            greeting_message="Hello!",
            placeholder_text="Type here...",
            position="left",
            show_branding=False,
        )

        service = WidgetService.__new__(WidgetService)
        public = service.get_public_config(config)

        # Should include public fields
        assert public["theme"] == "dark"
        assert public["primary_color"] == "#FF0000"
        assert public["greeting_message"] == "Hello!"
        assert public["position"] == "left"
        assert public["show_branding"] is False

        # Should NOT include internal fields
        assert "id" not in public
        assert "workspace_id" not in public
        assert "allowed_domains" not in public
