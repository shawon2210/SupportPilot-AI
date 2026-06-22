"""SupportPilot AI — Slack Integration Service

Handles Slack slash commands, interactive messages, and workspace linking.
Supports:
- /supportpilot chat <message> — Chat with the AI directly from Slack
- /supportpilot search <query> — Search the knowledge base
- Incoming webhook notifications for chat events
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import time
from dataclasses import dataclass
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("supportpilot.slack")


@dataclass
class SlackSlashCommand:
    """Parsed Slack slash command."""
    command: str
    text: str
    user_id: str
    user_name: str
    channel_id: str
    channel_name: str
    team_id: str
    response_url: str
    trigger_id: str | None = None


@dataclass
class SlackMessage:
    """A Slack message to be sent."""
    text: str
    channel: str | None = None
    blocks: list[dict] | None = None
    thread_ts: str | None = None


class SlackService:
    """
    Slack integration service.
    
    Handles:
    - Slash command verification and parsing
    - Sending messages to Slack channels
    - Interactive message responses
    
    Usage:
        service = SlackService(db)
        
        # Verify incoming request
        if service.verify_request(payload, signature, timestamp):
            cmd = service.parse_slash_command(payload)
            response = await service.handle_slash_command(workspace_id, cmd)
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Request Verification ─────────────────────────────────────────

    @staticmethod
    def verify_request(
        payload: bytes,
        signature: str,
        timestamp: str,
        signing_secret: str,
        max_age: int = 300,
    ) -> bool:
        """
        Verify a Slack request signature.
        
        Args:
            payload: Raw request body
            signature: X-Slack-Signature header value
            timestamp: X-Slack-Request-Timestamp header value
            signing_secret: Slack app signing secret
            max_age: Maximum age of request in seconds
            
        Returns:
            True if signature is valid
        """
        # Check timestamp to prevent replay attacks
        try:
            if abs(time.time() - int(timestamp)) > max_age:
                logger.warning("Slack request timestamp too old")
                return False
        except ValueError:
            return False

        basestring = f"v0:{timestamp}:{payload.decode()}"
        expected = "v0=" + hmac.new(
            signing_secret.encode(),
            basestring.encode(),
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected, signature)

    @staticmethod
    def parse_slash_command(form_data: dict) -> SlackSlashCommand:
        """Parse a Slack slash command from form data."""
        return SlackSlashCommand(
            command=form_data.get("command", ""),
            text=form_data.get("text", ""),
            user_id=form_data.get("user_id", ""),
            user_name=form_data.get("user_name", ""),
            channel_id=form_data.get("channel_id", ""),
            channel_name=form_data.get("channel_name", ""),
            team_id=form_data.get("team_id", ""),
            response_url=form_data.get("response_url", ""),
            trigger_id=form_data.get("trigger_id"),
        )

    # ── Slash Command Handlers ───────────────────────────────────────

    async def handle_slash_command(
        self,
        workspace_id: str,
        cmd: SlackSlashCommand,
    ) -> dict:
        """
        Handle a /supportpilot slash command.
        
        Supported commands:
        - /supportpilot chat <message> — Chat with AI
        - /supportpilot search <query> — Search knowledge base
        - /supportpilot help — Show help
        """
        text = cmd.text.strip()

        if text.startswith("chat "):
            message = text[5:].strip()
            return await self._handle_chat_command(workspace_id, cmd, message)

        if text.startswith("search "):
            query = text[7:].strip()
            return await self._handle_search_command(workspace_id, cmd, query)

        if text == "help":
            return self._help_response()

        return {
            "response_type": "ephemeral",
            "text": "Unknown command. Type `/supportpilot help` for usage.",
        }

    async def _handle_chat_command(
        self,
        workspace_id: str,
        cmd: SlackSlashCommand,
        message: str,
    ) -> dict:
        """Handle /supportpilot chat <message>."""
        from app.services.chat_service import ChatError, ChatService

        chat_service = ChatService(self.db)

        # Create or reuse a Slack-linked chat session
        chat = await chat_service.create_chat(
            workspace_id=workspace_id,
            user_id=cmd.user_id,
            title=f"Slack: {cmd.user_name}",
        )

        try:
            result = await chat_service.send_message(
                workspace_id=workspace_id,
                chat_id=chat.id,
                content=message,
                use_rag=True,
            )

            # Format sources
            sources_text = ""
            sources = result.sources
            if sources:
                source_links = []
                for i, src in enumerate(sources[:3], 1):
                    meta = src.get("metadata", {})
                    filename = meta.get("filename") or meta.get("url") or f"Source {i}"
                    source_links.append(f"  • {filename}")
                sources_text = "\n\n*Sources:*\n" + "\n".join(source_links)

            return {
                "response_type": "in_channel",
                "text": f"*{cmd.user_name} asked:* {message}",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"*{cmd.user_name} asked:* {message}",
                        },
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"*SupportPilot AI:*\n{result.assistant_message.content}{sources_text}",
                        },
                    },
                ],
            }
        except ChatError as e:
            return {
                "response_type": "ephemeral",
                "text": f"Error: {e}",
            }

    async def _handle_search_command(
        self,
        workspace_id: str,
        cmd: SlackSlashCommand,
        query: str,
    ) -> dict:
        """Handle /supportpilot search <query>."""
        from app.services.document_service import DocumentService

        service = DocumentService(self.db)
        results = await service.search_knowledge_base(
            workspace_id=workspace_id,
            query=query,
            top_k=5,
        )

        if not results:
            return {
                "response_type": "ephemeral",
                "text": f"No results found for: *{query}*",
            }

        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"Search results for: *{query}*",
                },
            },
            {"type": "divider"},
        ]

        for i, result in enumerate(results, 1):
            content = result["content"][:200] + "..." if len(result["content"]) > 200 else result["content"]
            similarity = result.get("similarity", 0)
            meta = result.get("metadata", {})
            source = meta.get("filename") or meta.get("url") or "Unknown"

            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*{i}. {source}* (relevance: {similarity:.0%})\n{content}",
                },
            })

        return {
            "response_type": "ephemeral",
            "text": f"Search results for: {query}",
            "blocks": blocks,
        }

    def _help_response(self) -> dict:
        """Return help text for the slash command."""
        return {
            "response_type": "ephemeral",
            "text": "*SupportPilot AI — Slack Integration*",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": (
                            "*SupportPilot AI — Slack Integration*\n\n"
                            "• `/supportpilot chat <message>` — Chat with your AI assistant\n"
                            "• `/supportpilot search <query>` — Search your knowledge base\n"
                            "• `/supportpilot help` — Show this help"
                        ),
                    },
                },
            ],
        }

    # ── Outgoing Webhook Notifications ───────────────────────────────

    async def send_notification(
        self,
        webhook_url: str,
        message: SlackMessage,
    ) -> bool:
        """
        Send a notification to a Slack incoming webhook URL.
        
        Used for event-driven notifications like:
        - New chat started
        - Ticket escalated
        - Knowledge gap detected
        """
        import httpx

        payload: dict[str, Any] = {"text": message.text}
        if message.blocks:
            payload["blocks"] = message.blocks
        if message.channel:
            payload["channel"] = message.channel
        if message.thread_ts:
            payload["thread_ts"] = message.thread_ts

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    webhook_url,
                    json=payload,
                    timeout=10.0,
                )
                return response.status_code == 200
        except Exception as e:
            logger.error("Slack notification failed: %s", e)
            return False

    async def send_chat_notification(
        self,
        webhook_url: str,
        chat_id: str,
        title: str,
        user_message: str,
        workspace_name: str,
    ) -> bool:
        """Send a new chat notification to Slack."""
        message = SlackMessage(
            text=f"💬 New chat in {workspace_name}",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": (
                            f"💬 *New chat in {workspace_name}*\n"
                            f"*{title}*\n"
                            f"> {user_message[:200]}"
                        ),
                    },
                },
            ],
        )
        return await self.send_notification(webhook_url, message)

    async def send_escalation_notification(
        self,
        webhook_url: str,
        chat_id: str,
        reason: str,
        workspace_name: str,
    ) -> bool:
        """Send an escalation alert to Slack."""
        message = SlackMessage(
            text=f"🚨 Chat escalated in {workspace_name}",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": (
                            f"🚨 *Chat Escalated — {workspace_name}*\n"
                            f"Reason: {reason}\n"
                            f"Chat ID: `{chat_id}`"
                        ),
                    },
                },
            ],
        )
        return await self.send_notification(webhook_url, message)
