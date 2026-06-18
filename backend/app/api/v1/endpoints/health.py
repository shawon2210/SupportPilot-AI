"""SupportPilot AI — Health Endpoints"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.core.database import get_db

router = APIRouter()


@router.get("")
async def health_check(settings: Settings = Depends(get_settings)):
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV.value,
    }


@router.get("/ready")
async def readiness_check(
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """
    Readiness probe — checks all service dependencies.
    Returns 200 when ready, 503 when any dependency is down.
    """
    from fastapi import HTTPException

    checks = {}
    all_healthy = True

    # Check database
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "connected"
    except Exception as e:
        checks["database"] = f"error: {e}"
        all_healthy = False

    # Check Redis
    try:
        from app.core.cache import get_cache
        cache = get_cache()
        redis = await cache._get_redis()
        if redis:
            await redis.ping()
            checks["redis"] = "connected"
        else:
            checks["redis"] = "disabled"
    except Exception as e:
        checks["redis"] = f"error: {e}"
        # Redis is optional, don't fail readiness

    # Check task queue
    try:
        from app.core.task_queue import get_task_queue
        queue = get_task_queue()
        checks["task_queue"] = "running" if queue._running else "stopped"
    except Exception as e:
        checks["task_queue"] = f"error: {e}"

    status_code = 200 if all_healthy else 503
    status_text = "ready" if all_healthy else "not_ready"

    result = {
        "status": status_text,
        "checks": checks,
        "version": settings.APP_VERSION,
    }

    if not all_healthy:
        raise HTTPException(status_code=status_code, detail=result)

    return result


@router.get("/live")
async def liveness_check():
    """Liveness probe — lightweight check that the process is running."""
    return {"status": "alive"}
