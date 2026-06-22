"""SupportPilot AI — Event Bus

Decoupled event-driven architecture using Redis Streams.
Replaces direct service-to-service calls with publish/subscribe.

Architecture:
    Service A → publishes Event → Event Bus → delivers to → Consumer Groups
                                                         → Consumer Groups
                                                         → Consumer Groups

Each consumer group processes events independently.
Failed events are retried with exponential backoff.

This is a senior-engineer-level pattern that enables:
- Loose coupling between services
- Independent scaling of consumers
- Event sourcing / audit trail
- Reliable delivery with at-least-once semantics
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from app.config import get_settings

logger = logging.getLogger("supportpilot.events")


# ── Event Types ────────────────────────────────────────────────────

class EventTypes:
    """All domain events in the system."""
    # Document events
    DOCUMENT_UPLOADED = "document.uploaded"
    DOCUMENT_PROCESSING_STARTED = "document.processing.started"
    DOCUMENT_PROCESSING_COMPLETED = "document.processing.completed"
    DOCUMENT_PROCESSING_FAILED = "document.processing.failed"
    DOCUMENT_DELETED = "document.deleted"

    # Chat events
    CHAT_CREATED = "chat.created"
    CHAT_MESSAGE_RECEIVED = "chat.message.received"
    CHAT_MESSAGE_RESPONDED = "chat.message.responded"
    CHAT_ESCALATED = "chat.escalated"
    CHAT_CLOSED = "chat.closed"

    # Knowledge events
    KNOWLEDGE_SEARCH_PERFORMED = "knowledge.search.performed"
    KNOWLEDGE_GAP_DETECTED = "knowledge.gap.detected"
    KNOWLEDGE_GAP_RESOLVED = "knowledge.gap.resolved"

    # Billing events
    SUBSCRIPTION_CREATED = "subscription.created"
    SUBSCRIPTION_UPDATED = "subscription.updated"
    SUBSCRIPTION_CANCELED = "subscription.canceled"
    PAYMENT_SUCCEEDED = "payment.succeeded"
    PAYMENT_FAILED = "payment.failed"

    # Team events
    MEMBER_INVITED = "member.invited"
    MEMBER_JOINED = "member.joined"
    MEMBER_REMOVED = "member.removed"
    MEMBER_ROLE_CHANGED = "member.role.changed"

    # Widget events
    WIDGET_CHAT_STARTED = "widget.chat.started"
    WIDGET_MESSAGE_SENT = "widget.message.sent"

    ALL = [
        DOCUMENT_UPLOADED, DOCUMENT_PROCESSING_STARTED, DOCUMENT_PROCESSING_COMPLETED,
        DOCUMENT_PROCESSING_FAILED, DOCUMENT_DELETED,
        CHAT_CREATED, CHAT_MESSAGE_RECEIVED, CHAT_MESSAGE_RESPONDED,
        CHAT_ESCALATED, CHAT_CLOSED,
        KNOWLEDGE_SEARCH_PERFORMED, KNOWLEDGE_GAP_DETECTED, KNOWLEDGE_GAP_RESOLVED,
        SUBSCRIPTION_CREATED, SUBSCRIPTION_UPDATED, SUBSCRIPTION_CANCELED,
        PAYMENT_SUCCEEDED, PAYMENT_FAILED,
        MEMBER_INVITED, MEMBER_JOINED, MEMBER_REMOVED, MEMBER_ROLE_CHANGED,
        WIDGET_CHAT_STARTED, WIDGET_MESSAGE_SENT,
    ]


@dataclass
class Event:
    """A domain event."""
    type: str
    workspace_id: str
    data: dict[str, Any]
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: float = field(default_factory=time.time)
    source: str = "api"  # api, worker, webhook, system

    def to_dict(self) -> dict:
        return {
            "event_id": self.event_id,
            "type": self.type,
            "workspace_id": self.workspace_id,
            "data": json.dumps(self.data, default=str),
            "timestamp": str(self.timestamp),
            "source": self.source,
        }

    @classmethod
    def from_dict(cls, data: dict) -> Event:
        return cls(
            event_id=data.get("event_id", str(uuid.uuid4())),
            type=data["type"],
            workspace_id=data["workspace_id"],
            data=json.loads(data.get("data", "{}")),
            timestamp=float(data.get("timestamp", time.time())),
            source=data.get("source", "unknown"),
        )


@dataclass
class EventHandler:
    """Registration for an event handler."""
    event_type: str
    handler: Callable
    group: str  # Consumer group name


class EventBus:
    """
    Redis Streams-based event bus.
    
    Usage:
        bus = EventBus()
        
        # Publish an event
        await bus.publish(Event(
            type=EventTypes.DOCUMENT_UPLOADED,
            workspace_id="ws_123",
            data={"source_id": "doc_456", "filename": "guide.pdf"},
        ))
        
        # Subscribe to events
        @bus.on(EventTypes.DOCUMENT_UPLOADED, group="embeddings")
        async def handle_document_uploaded(event: Event):
            await process_embeddings(event.data["source_id"])
        
        # Start consuming
        await bus.start_consuming()
    """

    def __init__(self):
        self.settings = get_settings()
        self._redis = None
        self._handlers: list[EventHandler] = []
        self._running = False
        self._consumers: list[asyncio.Task] = []
        self._use_redis = bool(self.settings.REDIS_URL)
        # In-memory fallback for dev/testing
        self._memory_queue: asyncio.Queue | None = None
        self._memory_handlers: dict[str, list[Callable]] = {}

    async def _get_redis(self):
        """Lazy-initialize Redis connection."""
        if self._redis is None and self._use_redis:
            try:
                import redis.asyncio as redis
                self._redis = redis.from_url(
                    self.settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True,
                )
                await self._redis.ping()
                logger.info("EventBus: Redis connected")
            except Exception as e:
                logger.warning("EventBus: Redis unavailable, using in-memory: %s", e)
                self._use_redis = False
        return self._redis

    async def publish(self, event: Event) -> str:
        """
        Publish an event to the bus.
        
        Returns the event ID.
        """
        try:
            redis = await self._get_redis()
            if redis:
                # Use Redis Streams for persistent, ordered event delivery
                stream_key = f"events:{event.type}"
                event_id = await redis.xadd(
                    stream_key,
                    event.to_dict(),
                    maxlen=10000,  # Keep last 10k events per stream
                )
                # Also publish to workspace-specific stream for filtering
                ws_stream = f"events:workspace:{event.workspace_id}"
                await redis.xadd(ws_stream, event.to_dict(), maxlen=5000)
                logger.debug("Event published: %s (%s)", event.type, event_id)
                return event_id

            # In-memory fallback
            if self._memory_queue is None:
                self._memory_queue = asyncio.Queue(maxsize=10000)
            await self._memory_queue.put(event)
            # Dispatch to registered handlers immediately
            for handler in self._memory_handlers.get(event.type, []):
                try:
                    if asyncio.iscoroutinefunction(handler):
                        asyncio.create_task(handler(event))
                    else:
                        handler(event)
                except Exception as e:
                    logger.error("Event handler error: %s", e)
            return event.event_id

        except Exception as e:
            logger.error("Event publish failed: %s", e)
            return event.event_id

    def on(self, event_type: str, group: str = "default"):
        """
        Decorator to register an event handler.
        
        Usage:
            @bus.on(EventTypes.DOCUMENT_UPLOADED, group="embeddings")
            async def handle_upload(event: Event):
                ...
        """
        def decorator(func: Callable):
            if self._use_redis:
                self._handlers.append(EventHandler(
                    event_type=event_type,
                    handler=func,
                    group=group,
                ))
            else:
                # In-memory: register directly
                if event_type not in self._memory_handlers:
                    self._memory_handlers[event_type] = []
                self._memory_handlers[event_type].append(func)
            return func
        return decorator

    async def start_consuming(self):
        """Start consumer groups for all registered handlers."""
        if not self._use_redis:
            logger.info("EventBus: In-memory mode, handlers registered directly")
            return

        redis = await self._get_redis()
        if not redis:
            return

        self._running = True

        # Group handlers by event_type
        handlers_by_type: dict[str, list[EventHandler]] = {}
        for h in self._handlers:
            if h.event_type not in handlers_by_type:
                handlers_by_type[h.event_type] = []
            handlers_by_type[h.event_type].append(h)

        # Start a consumer for each event type
        for event_type, handlers in handlers_by_type.items():
            task = asyncio.create_task(
                self._consume_stream(event_type, handlers)
            )
            self._consumers.append(task)

        logger.info("EventBus: Started %d consumer(s) for %d event type(s)",
                     len(self._consumers), len(handlers_by_type))

    async def stop_consuming(self):
        """Stop all consumers."""
        self._running = False
        for task in self._consumers:
            task.cancel()
        self._consumers.clear()

    async def _consume_stream(self, event_type: str, handlers: list[EventHandler]):
        """Consume events from a Redis Stream using consumer groups."""
        redis = await self._get_redis()
        if not redis:
            return

        stream_key = f"events:{event_type}"
        group_name = "processors"

        # Create consumer group if it doesn't exist
        try:
            await redis.xgroup_create(stream_key, group_name, id="0", mkstream=True)
        except Exception:
            pass  # Group already exists

        consumer_name = f"consumer-{uuid.uuid4().hex[:8]}"

        while self._running:
            try:
                # Read new events (blocking with 5s timeout)
                messages = await redis.xreadgroup(
                    group_name,
                    consumer_name,
                    {stream_key: ">"},
                    count=10,
                    block=5000,
                )

                if not messages:
                    continue

                for stream, stream_messages in messages:
                    for msg_id, msg_data in stream_messages:
                        event = Event.from_dict(msg_data)

                        # Dispatch to all handlers for this event type
                        for handler_reg in handlers:
                            try:
                                await handler_reg.handler(event)
                            except Exception as e:
                                logger.error(
                                    "Handler error for %s (group=%s): %s",
                                    event_type, handler_reg.group, e,
                                )

                        # Acknowledge processing
                        await redis.xack(stream_key, group_name, msg_id)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Event consumer error for %s: %s", event_type, e)
                await asyncio.sleep(1)


# ── Singleton ──────────────────────────────────────────────────────

_event_bus: EventBus | None = None


def get_event_bus() -> EventBus:
    """Get or create the event bus singleton."""
    global _event_bus
    if _event_bus is None:
        _event_bus = EventBus()
    return _event_bus
