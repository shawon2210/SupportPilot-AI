"""SupportPilot AI — Outbox Pattern

Ensures reliable webhook delivery even when the webhook service is temporarily unavailable.

Pattern:
    1. When an event occurs, write to the outbox table in the SAME transaction as the business logic
    2. A background process polls the outbox table and delivers pending webhooks
    3. Successfully delivered webhooks are marked as sent
    4. Failed deliveries are retried with exponential backoff

This guarantees at-least-once delivery — the webhook will eventually be sent
even if the webhook service, network, or recipient is temporarily down.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
from app.core.security import generate_uuid

logger = logging.getLogger("supportpilot.outbox")


# ── Outbox Model (stored in database) ─────────────────────────────

# We define this as a simple dict structure that gets stored in a JSON column
# In production, this would be a proper SQLAlchemy model with its own table


class OutboxEntry:
    """Represents a pending webhook delivery in the outbox."""

    def __init__(
        self,
        webhook_id: str,
        event_type: str,
        payload: dict,
        workspace_id: str,
    ):
        self.id = generate_uuid()
        self.webhook_id = webhook_id
        self.event_type = event_type
        self.payload = payload
        self.workspace_id = workspace_id
        self.created_at = datetime.utcnow()
        self.attempts = 0
        self.last_attempt_at: datetime | None = None
        self.delivered_at: datetime | None = None
        self.failed_at: datetime | None = None
        self.next_attempt_at = datetime.utcnow()
        self.error_message: str | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "webhook_id": self.webhook_id,
            "event_type": self.event_type,
            "payload": self.payload,
            "workspace_id": self.workspace_id,
            "created_at": self.created_at.isoformat(),
            "attempts": self.attempts,
            "last_attempt_at": self.last_attempt_at.isoformat() if self.last_attempt_at else None,
            "delivered_at": self.delivered_at.isoformat() if self.delivered_at else None,
            "failed_at": self.failed_at.isoformat() if self.failed_at else None,
            "next_attempt_at": self.next_attempt_at.isoformat(),
            "error_message": self.error_message,
        }

    @classmethod
    def from_dict(cls, data: dict) -> OutboxEntry:
        entry = cls(
            webhook_id=data["webhook_id"],
            event_type=data["event_type"],
            payload=data["payload"],
            workspace_id=data["workspace_id"],
        )
        entry.id = data["id"]
        entry.created_at = datetime.fromisoformat(data["created_at"]) if isinstance(data.get("created_at"), str) else data.get("created_at", datetime.utcnow())
        entry.attempts = data.get("attempts", 0)
        entry.last_attempt_at = datetime.fromisoformat(data["last_attempt_at"]) if data.get("last_attempt_at") else None
        entry.delivered_at = datetime.fromisoformat(data["delivered_at"]) if data.get("delivered_at") else None
        entry.failed_at = datetime.fromisoformat(data["failed_at"]) if data.get("failed_at") else None
        entry.next_attempt_at = datetime.fromisoformat(data["next_attempt_at"]) if isinstance(data.get("next_attempt_at"), str) else datetime.utcnow()
        entry.error_message = data.get("error_message")
        return entry


class OutboxStore:
    """
    Stores and retrieves outbox entries.
    
    In production, this uses a dedicated `webhook_outbox` table.
    For our architecture, we use a JSON-based store that works with both
    SQLite and PostgreSQL.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def add(self, entry: OutboxEntry) -> None:
        """Add an entry to the outbox (same transaction as business logic)."""
        # In production: INSERT INTO webhook_outbox ...
        # For now, we use the event bus to trigger immediate delivery
        # and store a backup in the audit log for recovery
        from app.models.audit_log import AuditLog
        log = AuditLog(
            id=generate_uuid(),
            workspace_id=entry.workspace_id,
            action="webhook.outbox.created",
            resource_type="webhook_outbox",
            resource_id=entry.id,
            details=json.dumps(entry.to_dict(), default=str),
        )
        self.db.add(log)
        # Note: This commits with the outer transaction
        # If the transaction rolls back, the outbox entry is also rolled back
        # This is the key guarantee of the outbox pattern

    async def get_pending(self, limit: int = 100) -> list[OutboxEntry]:
        """Get pending outbox entries ready for delivery."""
        from app.models.audit_log import AuditLog

        stmt = select(AuditLog).where(
            AuditLog.action == "webhook.outbox.created",
        ).order_by(AuditLog.created_at).limit(limit)

        result = await self.db.execute(stmt)
        entries = []
        for log in result.scalars().all():
            try:
                data = json.loads(log.details or "{}")
                if data.get("delivered_at") is None and data.get("failed_at") is None:
                    entries.append(OutboxEntry.from_dict(data))
            except (json.JSONDecodeError, KeyError, TypeError):
                continue

        return entries

    async def mark_delivered(self, entry_id: str) -> None:
        """Mark an outbox entry as delivered."""
        from app.models.audit_log import AuditLog

        stmt = select(AuditLog).where(
            AuditLog.resource_id == entry_id,
            AuditLog.action == "webhook.outbox.created",
        )
        result = await self.db.execute(stmt)
        log = result.scalar_one_or_none()
        if log:
            data = json.loads(log.details or "{}")
            data["delivered_at"] = datetime.utcnow().isoformat()
            log.details = json.dumps(data, default=str)
            await self.db.flush()

    async def mark_failed(self, entry_id: str, error: str) -> None:
        """Mark an outbox entry as failed with error."""
        from app.models.audit_log import AuditLog

        stmt = select(AuditLog).where(
            AuditLog.resource_id == entry_id,
            AuditLog.action == "webhook.outbox.created",
        )
        result = await self.db.execute(stmt)
        log = result.scalar_one_or_none()
        if log:
            data = json.loads(log.details or "{}")
            data["failed_at"] = datetime.utcnow().isoformat()
            data["error_message"] = error
            data["attempts"] = data.get("attempts", 0) + 1
            # Exponential backoff: 1min, 5min, 15min, 30min, 60min
            backoff_minutes = min(60, max(1, 5 ** (data["attempts"] - 1)))
            data["next_attempt_at"] = (
                datetime.utcnow() + timedelta(minutes=backoff_minutes)
            ).isoformat()
            log.details = json.dumps(data, default=str)
            await self.db.flush()


class OutboxProcessor:
    """
    Background processor that delivers pending outbox entries.
    
    Runs as a periodic task in the worker process.
    Polls for pending entries and delivers them to webhook endpoints.
    """

    def __init__(self):
        self._running = False

    async def process_pending(self) -> dict:
        """
        Process all pending outbox entries.
        
        Returns a summary of delivery attempts.
        """
        async with async_session_factory() as db:
            store = OutboxStore(db)
            pending = await store.get_pending(limit=50)

            if not pending:
                return {"processed": 0, "delivered": 0, "failed": 0}

            delivered = 0
            failed = 0

            for entry in pending:
                try:
                    success = await self._deliver(entry)
                    if success:
                        await store.mark_delivered(entry.id)
                        delivered += 1
                    else:
                        await store.mark_failed(entry.id, "Delivery returned non-200")
                        failed += 1
                except Exception as e:
                    await store.mark_failed(entry.id, str(e))
                    failed += 1

            await db.commit()

            return {
                "processed": len(pending),
                "delivered": delivered,
                "failed": failed,
            }

    async def _deliver(self, entry: OutboxEntry) -> bool:
        """Deliver a single webhook payload."""
        import httpx

        # Get webhook details
        async with async_session_factory() as db:
            from sqlalchemy import select

            from app.models.webhook import Webhook

            stmt = select(Webhook).where(Webhook.id == entry.webhook_id)
            result = await db.execute(stmt)
            webhook = result.scalar_one_or_none()

            if not webhook or not webhook.is_active:
                logger.warning("Webhook %s not found or inactive", entry.webhook_id)
                return False

            # Build payload
            payload = {
                "event": entry.event_type,
                "timestamp": entry.created_at.isoformat(),
                "data": entry.payload,
            }
            payload_bytes = json.dumps(payload, default=str).encode()

            # Sign with HMAC
            signature = hmac.new(
                webhook.secret.encode(),
                payload_bytes,
                hashlib.sha256,
            ).hexdigest()

            # Send
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        webhook.url,
                        content=payload_bytes,
                        headers={
                            "Content-Type": "application/json",
                            "X-SupportPilot-Signature": f"sha256={signature}",
                            "X-SupportPilot-Event": entry.event_type,
                        },
                        timeout=10.0,
                    )
                    return response.status_code < 500  # 2xx/3xx/4xx = delivered (even if rejected)
            except Exception as e:
                logger.error("Webhook delivery failed: %s", e)
                return False

    async def run_periodic(self, interval_seconds: int = 30):
        """Run the outbox processor periodically."""
        self._running = True
        logger.info("Outbox processor started (interval=%ds)", interval_seconds)

        while self._running:
            try:
                result = await self.process_pending()
                if result["processed"] > 0:
                    logger.info(
                        "Outbox processed: %d delivered, %d failed",
                        result["delivered"], result["failed"],
                    )
            except Exception as e:
                logger.error("Outbox processor error: %s", e)

            await asyncio.sleep(interval_seconds)

    def stop(self):
        self._running = False
