"""SupportPilot AI — Webhook Service

Manages webhook subscriptions and dispatches events.
Supports HMAC signature verification for security.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import secrets
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import generate_uuid
from app.models.webhook import Webhook, WebhookEvent
from app.repositories.base import TenantRepository
from app.services.base import BaseService

logger = logging.getLogger("supportpilot.webhooks")


class WebhookService(BaseService[Webhook]):
    """
    Service for webhook management and event dispatching.
    
    Usage:
        service = WebhookService(db)
        
        # Create webhook
        webhook = await service.create_webhook(
            workspace_id="...",
            url="https://example.com/webhook",
            events=[WebhookEvent.CHAT_CREATED, WebhookEvent.DOCUMENT_UPLOADED],
        )
        
        # Dispatch event
        await service.dispatch_event(
            workspace_id="...",
            event=WebhookEvent.CHAT_CREATED,
            data={"chat_id": "...", "title": "..."},
        )
    """

    def __init__(self, db: AsyncSession):
        super().__init__(db)
        self._repo = TenantRepository(Webhook, self.db)

    # ── Webhook CRUD ─────────────────────────────────────────────────

    async def create_webhook(
        self,
        workspace_id: str,
        url: str,
        events: list[str],
        description: str | None = None,
    ) -> tuple[Webhook, str]:
        """
        Create a new webhook subscription.
        
        Returns:
            Tuple of (webhook, secret) — the secret is shown only once.
        """
        # Validate events
        for event in events:
            if event not in WebhookEvent.ALL:
                raise WebhookError(f"Invalid event type: {event}")

        # Generate secret for HMAC signing
        secret = secrets.token_hex(32)

        webhook = Webhook(
            id=generate_uuid(),
            workspace_id=workspace_id,
            url=url,
            secret=secret,
            events=json.dumps(events),
            description=description,
            is_active=True,
        )
        await self._repo.create(webhook)
        logger.info("Created webhook %s for workspace %s", webhook.id, workspace_id)
        return webhook, secret

    async def list_webhooks(self, workspace_id: str) -> list[Webhook]:
        """List all webhooks for a workspace."""
        return await self._repo.list_by_workspace(workspace_id)

    async def get_webhook(self, workspace_id: str, webhook_id: str) -> Webhook:
        """Get a webhook by ID."""
        return await self._repo.get_by_workspace_or_404(workspace_id, webhook_id)

    async def delete_webhook(self, workspace_id: str, webhook_id: str) -> None:
        """Delete a webhook."""
        webhook = await self._repo.get_by_workspace_or_404(workspace_id, webhook_id)
        await self._repo.delete(webhook)

    async def update_webhook(
        self,
        workspace_id: str,
        webhook_id: str,
        **kwargs,
    ) -> Webhook:
        """Update webhook configuration."""
        webhook = await self._repo.get_by_workspace_or_404(workspace_id, webhook_id)

        allowed = {"url", "events", "description", "is_active"}
        for key, value in kwargs.items():
            if key in allowed and value is not None:
                if key == "events":
                    for event in value:
                        if event not in WebhookEvent.ALL:
                            raise WebhookError(f"Invalid event type: {event}")
                    value = json.dumps(value)
                setattr(webhook, key, value)

        await self.db.flush()
        return webhook

    # ── Event Dispatch ───────────────────────────────────────────────

    async def dispatch_event(
        self,
        workspace_id: str,
        event: str,
        data: dict,
    ) -> int:
        """
        Dispatch an event to all matching webhooks in a workspace.
        
        Returns the number of webhooks the event was sent to.
        """
        webhooks = await self._get_active_webhooks_for_event(workspace_id, event)
        if not webhooks:
            return 0

        payload = {
            "event": event,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data,
        }

        sent_count = 0
        for webhook in webhooks:
            try:
                await self._send_webhook(webhook, payload)
                sent_count += 1
            except Exception as e:
                logger.warning("Webhook delivery failed for %s: %s", webhook.id, e)
                webhook.failure_count += 1
                # Disable after 10 consecutive failures
                if webhook.failure_count >= 10:
                    webhook.is_active = False
                    logger.warning("Webhook %s disabled after 10 failures", webhook.id)

        await self.db.flush()
        return sent_count

    async def _get_active_webhooks_for_event(
        self,
        workspace_id: str,
        event: str,
    ) -> list[Webhook]:
        """Get active webhooks subscribed to a specific event."""
        stmt = select(Webhook).where(
            Webhook.workspace_id == workspace_id,
            Webhook.is_active == True,  # noqa: E712
        )
        result = await self.db.execute(stmt)
        webhooks = list(result.scalars().all())

        # Filter by event subscription
        matching = []
        for webhook in webhooks:
            try:
                events = json.loads(webhook.events)
                if event in events:
                    matching.append(webhook)
            except (json.JSONDecodeError, TypeError):
                continue

        return matching

    async def _send_webhook(self, webhook: Webhook, payload: dict) -> None:
        """Send a webhook payload with HMAC signature."""
        import httpx

        payload_bytes = json.dumps(payload, default=str).encode()
        signature = hmac.new(
            webhook.secret.encode(),
            payload_bytes,
            hashlib.sha256,
        ).hexdigest()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                webhook.url,
                content=payload_bytes,
                headers={
                    "Content-Type": "application/json",
                    "X-SupportPilot-Signature": f"sha256={signature}",
                    "X-SupportPilot-Event": payload["event"],
                    "User-Agent": "SupportPilot-Webhook/1.0",
                },
                timeout=10.0,
            )
            response.raise_for_status()

        webhook.last_triggered_at = datetime.utcnow()
        webhook.failure_count = 0  # Reset on success

    def verify_signature(self, payload: bytes, signature: str, secret: str) -> bool:
        """
        Verify a webhook signature from an incoming request.
        Used when receiving webhooks (e.g., from Stripe).
        """
        expected = hmac.new(
            secret.encode(),
            payload,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(f"sha256={expected}", signature)


class WebhookError(Exception):
    """Raised when webhook operations fail."""
    pass
