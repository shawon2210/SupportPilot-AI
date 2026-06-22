"""SupportPilot AI — FastAPI Application Entry Point"""

from __future__ import annotations

import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.api.v1.router import api_router
from app.config import get_settings
from app.core.cache import get_cache
from app.core.database import close_db, init_db
from app.core.event_bus import get_event_bus
from app.core.exceptions import (
    AuthenticationError,
    SupportPilotError,
)
from app.core.metrics import get_metrics_output
from app.core.middleware import (
    RequestIdMiddleware,
    TenantContextMiddleware,
    authentication_error_handler,
    global_exception_handler,
)
from app.core.monitoring import init_sentry
from app.core.outbox import OutboxProcessor
from app.core.rate_limit_middleware import RateLimitMiddleware
from app.core.task_queue import get_task_queue

settings = get_settings()

# ── Logging Setup ────────────────────────────────────────────────
log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
logging.basicConfig(
    level=log_level,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("supportpilot")


# ── Data directories ─────────────────────────────────────────────
os.makedirs("./data", exist_ok=True)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


# ── Lifespan ─────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("Starting %s v%s [%s]", settings.APP_NAME, settings.APP_VERSION, settings.APP_ENV.value)

    # Initialize Sentry
    init_sentry()

    # Initialize database
    await init_db()
    logger.info("Database initialized")

    # Start background task queue
    queue = get_task_queue()
    await queue.start()
    logger.info("Background task queue started")

    # Start event bus consumers
    bus = get_event_bus()
    await bus.start_consuming()
    logger.info("Event bus started")

    # Start outbox processor
    outbox = OutboxProcessor()
    outbox_task = asyncio.create_task(outbox.run_periodic(interval_seconds=30))
    logger.info("Outbox processor started")

    yield

    logger.info("Shutting down...")
    await close_db()

    # Stop task queue
    queue = get_task_queue()
    await queue.stop()

    # Stop event bus
    bus = get_event_bus()
    await bus.stop_consuming()

    # Stop outbox processor
    outbox.stop()
    outbox_task.cancel()

    # Close cache
    cache = get_cache()
    await cache.close()


# ── Application ──────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Multi-tenant AI Customer Support Platform",
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    lifespan=lifespan,
)

# ── Middleware (order matters — first added = outermost) ─────────
app.add_middleware(RequestIdMiddleware)
app.add_middleware(TenantContextMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID", "X-User-ID", "X-Workspace-ID"],
)

# ── Exception Handlers ───────────────────────────────────────────
app.add_exception_handler(SupportPilotError, global_exception_handler)
app.add_exception_handler(AuthenticationError, authentication_error_handler)

# ── Routes ───────────────────────────────────────────────────────
app.include_router(api_router)


# ── Root ─────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "endpoints": {
            "health": "/api/v1/health",
            "openapi": "/openapi.json",
            "adminAnalytics": "/api/v1/admin/analytics/platform",
        },
    }


# ── Prometheus Metrics Endpoint ──────────────────────────────────
@app.get("/metrics", include_in_schema=False)
async def metrics():
    """Prometheus metrics endpoint for monitoring."""
    output, content_type = get_metrics_output()
    return Response(content=output, media_type=content_type)
