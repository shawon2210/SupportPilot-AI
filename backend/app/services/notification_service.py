"""SupportPilot AI — Real-time Notification Service

In-memory pub/sub for pushing events to connected SSE clients.
Works without Redis — each workspace has a set of subscriber queues.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from collections import defaultdict

logger = logging.getLogger("supportpilot.notifications")


class NotificationService:
    """
    In-memory pub/sub for workspace events.
    
    Usage:
        service = NotificationService()
        
        # Subscribe (SSE endpoint)
        async for event in service.subscribe(workspace_id, user_id):
            yield event
        
        # Publish (from any service)
        await service.publish(workspace_id, {"type": "document.ready", ...})
    """

    def __init__(self):
        self._subscribers: dict[str, dict[str, asyncio.Queue]] = defaultdict(dict)

    async def subscribe(self, workspace_id: str, user_id: str) -> str:
        """Register a subscriber and return a subscription id."""
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        sub_id = f"{user_id}:{int(time.time() * 1000)}"
        self._subscribers[workspace_id][sub_id] = queue
        logger.debug("Subscribed %s to workspace %s", sub_id, workspace_id)
        return sub_id

    async def unsubscribe(self, workspace_id: str, sub_id: str) -> None:
        """Remove a subscriber."""
        ws_subs = self._subscribers.get(workspace_id, {})
        ws_subs.pop(sub_id, None)
        if not ws_subs:
            self._subscribers.pop(workspace_id, None)

    async def publish(self, workspace_id: str, event: dict) -> None:
        """Publish an event to all subscribers of a workspace."""
        ws_subs = self._subscribers.get(workspace_id, {})
        if not ws_subs:
            return
        event["_ts"] = time.time()
        payload = json.dumps(event)
        disconnected = []
        for sub_id, queue in ws_subs.items():
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                logger.warning("Queue full for subscriber %s, dropping event", sub_id)
            except Exception:
                disconnected.append(sub_id)
        for sub_id in disconnected:
            await self.unsubscribe(workspace_id, sub_id)

    async def event_stream(self, workspace_id: str, user_id: str, max_queue_wait: float = 30.0):
        """
        Async generator for SSE streaming.
        Yields SSE-formatted strings.
        """
        sub_id = await self.subscribe(workspace_id, user_id)
        queue = self._subscribers[workspace_id][sub_id]
        try:
            yield f"data: {json.dumps({'type': 'connected', 'sub_id': sub_id})}\n\n"
            while True:
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=max_queue_wait)
                    yield f"data: {payload}\n\n"
                except asyncio.TimeoutError:
                    yield f"data: {json.dumps({'type': 'ping'})}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            await self.unsubscribe(workspace_id, sub_id)


# Singleton
_notification_service: NotificationService | None = None


def get_notification_service() -> NotificationService:
    global _notification_service
    if _notification_service is None:
        _notification_service = NotificationService()
    return _notification_service
