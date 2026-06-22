"""SupportPilot AI — Widget Service

Manages the embeddable chat widget configuration and public chat endpoint.
The widget allows businesses to embed an AI chatbot on their website.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import generate_uuid
from app.models.chat import Chat
from app.models.widget_config import WidgetConfig
from app.services.chat_service import ChatService

logger = logging.getLogger("supportpilot.widget")


@dataclass
class WidgetChatRequest:
    """Request from the widget to send a message."""
    message: str
    session_id: str | None = None  # For conversation continuity
    visitor_id: str | None = None  # For lead tracking


@dataclass
class WidgetChatResponse:
    """Response from the widget chat endpoint."""
    message: str
    session_id: str
    sources: list[dict] = field(default_factory=list)
    tokens_used: int = 0


class WidgetService:
    """
    Service for the embeddable chat widget.
    
    Provides:
    - Widget configuration management
    - Public chat endpoint (no auth required, rate-limited)
    - Lead capture
    - Conversation history for widget sessions
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Widget Config CRUD ─────────────────────────────────────────

    async def get_config(self, workspace_id: str) -> WidgetConfig:
        """Get or create widget config for a workspace."""
        stmt = select(WidgetConfig).where(
            WidgetConfig.workspace_id == workspace_id,
        )
        result = await self.db.execute(stmt)
        config = result.scalar_one_or_none()

        if not config:
            config = WidgetConfig(
                id=generate_uuid(),
                workspace_id=workspace_id,
            )
            self.db.add(config)
            await self.db.flush()

        return config

    async def update_config(
        self,
        workspace_id: str,
        **kwargs,
    ) -> WidgetConfig:
        """Update widget configuration."""
        config = await self.get_config(workspace_id)

        allowed_fields = {
            "theme", "primary_color", "greeting_message",
            "placeholder_text", "position", "show_branding",
            "allowed_domains", "is_active",
        }

        for key, value in kwargs.items():
            if key in allowed_fields and value is not None:
                if key == "allowed_domains" and isinstance(value, list):
                    value = json.dumps(value)
                setattr(config, key, value)

        await self.db.flush()
        return config

    def get_public_config(self, config: WidgetConfig) -> dict:
        """
        Get the public-facing widget config (safe to expose to anyone).
        Excludes internal fields.
        """
        return {
            "theme": config.theme,
            "primary_color": config.primary_color,
            "greeting_message": config.greeting_message,
            "placeholder_text": config.placeholder_text,
            "position": config.position,
            "show_branding": config.show_branding,
        }

    # ── Public Chat ────────────────────────────────────────────────

    async def public_chat(
        self,
        workspace_id: str,
        request: WidgetChatRequest,
    ) -> WidgetChatResponse:
        """
        Handle a chat message from the public widget.
        
        This endpoint requires no authentication but is rate-limited.
        It creates a temporary chat session for the widget visitor.
        """
        chat_service = ChatService(self.db)

        # Get or create a chat session for this widget visitor
        chat_id = request.session_id
        if chat_id:
            # Verify the chat exists and belongs to this workspace
            stmt = select(Chat).where(
                Chat.id == chat_id,
                Chat.workspace_id == workspace_id,
            )
            result = await self.db.execute(stmt)
            chat = result.scalar_one_or_none()
            if not chat:
                chat = await chat_service.create_chat(workspace_id)
                chat_id = chat.id
        else:
            chat = await chat_service.create_chat(workspace_id)
            chat_id = chat.id

        # Send message with RAG
        result = await chat_service.send_message(
            workspace_id=workspace_id,
            chat_id=chat_id,
            content=request.message,
            use_rag=True,
        )

        return WidgetChatResponse(
            message=result.assistant_message.content,
            session_id=chat_id,
            sources=result.sources,
            tokens_used=result.tokens_used,
        )

    # ── Widget Script Generation ───────────────────────────────────

    def generate_widget_script(self, workspace_id: str, base_url: str) -> str:
        """
        Generate the embeddable widget script tag.
        
        Business users paste this into their HTML:
        <script src="{base_url}/widget/{workspace_id}.js"></script>
        """
        return f"""<!-- SupportPilot AI Chat Widget -->
<script>
(function() {{
  var config = {{
    workspaceId: '{workspace_id}',
    apiUrl: '{base_url}',
    theme: 'light',
    primaryColor: '#3B82F6',
    greetingMessage: 'Hi! How can I help you?',
    placeholderText: 'Type your message...',
    position: 'right',
    showBranding: true
  }};

  var s = document.createElement('script');
  s.src = '{base_url}/static/widget.js';
  s.async = true;
  s.onload = function() {{
    if (window.SupportPilotWidget) {{
      window.SupportPilotWidget.init(config);
    }}
  }};
  document.head.appendChild(s);
}})();
</script>"""
