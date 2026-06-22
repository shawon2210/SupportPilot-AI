"""SupportPilot AI — Background Task Queue

Lightweight async task queue for document processing.
In production, swap this for Celery/Dramatiq + Redis.
For now, uses FastAPI BackgroundTasks for immediate processing
and an in-memory async queue for heavier operations.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger("supportpilot.workers")


@dataclass
class Task:
    """A background task to be executed."""
    id: str
    name: str
    func: Callable
    args: tuple = ()
    kwargs: dict = field(default_factory=dict)
    status: str = "pending"  # pending, running, completed, failed
    result: Any = None
    error: str | None = None


class TaskQueue:
    """
    In-memory async task queue with configurable concurrency.
    
    Usage:
        queue = TaskQueue(max_workers=3)
        await queue.start()
        
        task_id = await queue.enqueue(
            name="process_document",
            func=process_document,
            args=(workspace_id, source_id),
        )
        
        # Check status later
        task = queue.get_task(task_id)
    
    This is a production-ready pattern that can be swapped for
    Celery/Dramatiq without changing the calling code.
    """

    def __init__(self, max_workers: int = 3):
        self.max_workers = max_workers
        self._queue: asyncio.Queue = None
        self._tasks: dict[str, Task] = {}
        self._workers: list[asyncio.Task] = []
        self._running = False

    async def start(self):
        """Start the worker pool."""
        if self._running:
            return
        self._running = True
        self._queue = asyncio.Queue()
        self._workers = [
            asyncio.create_task(self._worker(i))
            for i in range(self.max_workers)
        ]
        logger.info("TaskQueue started with %d workers", self.max_workers)

    async def stop(self):
        """Stop the worker pool."""
        self._running = False
        # Wait for queue to drain
        await self._queue.join()
        for w in self._workers:
            w.cancel()
        self._workers.clear()
        logger.info("TaskQueue stopped")

    async def enqueue(
        self,
        name: str,
        func: Callable,
        args: tuple = (),
        kwargs: dict | None = None,
    ) -> str:
        """
        Add a task to the queue.
        
        Returns the task ID for status checking.
        """
        import uuid
        task_id = str(uuid.uuid4())
        task = Task(
            id=task_id,
            name=name,
            func=func,
            args=args,
            kwargs=kwargs or {},
        )
        self._tasks[task_id] = task
        await self._queue.put(task)
        logger.info("Enqueued task %s: %s", task_id, name)
        return task_id

    def get_task(self, task_id: str) -> Task | None:
        """Get task by ID."""
        return self._tasks.get(task_id)

    async def _worker(self, worker_id: int):
        """Worker coroutine that processes tasks."""
        while self._running:
            try:
                task = await asyncio.wait_for(self._queue.get(), timeout=1.0)
            except TimeoutError:
                continue

            task.status = "running"
            logger.info("Worker %d processing task %s: %s", worker_id, task.id, task.name)

            try:
                if asyncio.iscoroutinefunction(task.func):
                    task.result = await task.func(*task.args, **task.kwargs)
                else:
                    task.result = task.func(*task.args, **task.kwargs)
                task.status = "completed"
                logger.info("Task %s completed", task.id)
            except Exception as e:
                task.status = "failed"
                task.error = str(e)
                logger.error("Task %s failed: %s", task.id, e)
            finally:
                self._queue.task_done()


# ── Singleton ──────────────────────────────────────────────────────

_queue: TaskQueue | None = None


def get_task_queue() -> TaskQueue:
    """Get or create the task queue singleton."""
    global _queue
    if _queue is None:
        _queue = TaskQueue(max_workers=3)
    return _queue
