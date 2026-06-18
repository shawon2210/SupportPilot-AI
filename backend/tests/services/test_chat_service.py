"""SupportPilot AI — Chat Service Tests"""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.chat_service import ChatService, ChatError, ChatContext


class TestChatService:
    """Test the chat service."""

    def test_create_chat(self, db):
        """Test creating a chat session."""
        import asyncio

        async def _test():
            service = ChatService(db)
            chat = await service.create_chat("ws-123", "user-456", "Test Chat")
            assert chat.id is not None
            assert chat.workspace_id == "ws-123"
            assert chat.user_id == "user-456"
            assert chat.title == "Test Chat"
            assert chat.status == "active"

        asyncio.get_event_loop().run_until_complete(_test())

    def test_generate_title(self):
        """Test default title generation."""
        service = ChatService.__new__(ChatService)
        title = service._generate_title()
        assert "Chat" in title

    def test_build_system_prompt_with_context(self):
        """Test system prompt building with retrieved chunks."""
        service = ChatService.__new__(ChatService)
        chunks = [
            {"content": "Refund policy: 30 days.", "metadata": '{"filename": "policy.pdf"}'},
            {"content": "Contact support at help@example.com.", "metadata": '{"url": "https://example.com"}'},
        ]
        prompt = service._build_system_prompt(chunks)
        assert "Refund policy" in prompt
        assert "Contact support" in prompt
        assert "policy.pdf" in prompt
        assert "example.com" in prompt

    def test_build_system_prompt_empty(self):
        """Test system prompt with no chunks."""
        service = ChatService.__new__(ChatService)
        prompt = service._build_system_prompt([])
        assert "No relevant context" in prompt

    def test_build_system_prompt_with_empty_metadata(self):
        """Test system prompt with chunks that have no metadata."""
        service = ChatService.__new__(ChatService)
        chunks = [{"content": "Some content", "metadata": "{}"}]
        prompt = service._build_system_prompt(chunks)
        assert "Some content" in prompt


class TestChatContext:
    """Test the ChatContext dataclass."""

    def test_default_values(self):
        """Test default context values."""
        ctx = ChatContext(messages=[])
        assert ctx.messages == []
        assert ctx.retrieved_chunks == []
        assert ctx.system_prompt == ""
        assert ctx.workspace_id == ""
        assert ctx.chat_id == ""

    def test_with_values(self):
        """Test context with values."""
        from app.ai.providers.base import ChatMessage, MessageRole
        msg = ChatMessage(role=MessageRole.USER, content="Hello")
        ctx = ChatContext(
            messages=[msg],
            workspace_id="ws-1",
            chat_id="chat-1",
        )
        assert len(ctx.messages) == 1
        assert ctx.workspace_id == "ws-1"
