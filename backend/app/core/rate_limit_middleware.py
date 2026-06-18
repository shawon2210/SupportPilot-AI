"""SupportPilot AI — Rate Limiting Middleware

Applies rate limits to all authenticated and public endpoints.
Uses tier-based limits from the workspace's subscription plan.
"""

from __future__ import annotations

import logging

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.rate_limit import RateLimitService

logger = logging.getLogger("supportpilot.middleware.rate_limit")

# Paths exempt from rate limiting
EXEMPT_PATHS = {
    "/api/v1/health",
    "/api/v1/health/ready",
    "/api/v1/health/live",
    "/api/v1/auth/webhook",
    "/api/v1/billing/webhook",
    "/api/v1/slack",
    "/api/v1/widget/chat",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/metrics",
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware.
    
    Applies different limits based on:
    - Authenticated user (from JWT)
    - API key (from header)
    - IP address (fallback for public endpoints)
    
    Limits are tier-based (free/starter/pro/enterprise).
    Disabled in testing mode.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        from app.config import get_settings
        settings = get_settings()

        # Skip rate limiting in testing mode
        if settings.APP_ENV.value == "testing":
            return await call_next(request)
        path = request.url.path

        # Skip exempt paths
        if any(path.startswith(p) for p in EXEMPT_PATHS):
            return await call_next(request)

        limiter = RateLimitService()

        # Determine the rate limit key and plan
        user_id = getattr(request.state, "user_id", None)
        workspace_id = getattr(request.state, "workspace_id", None)
        api_key = request.headers.get("X-API-Key")

        if user_id:
            # Authenticated user — use workspace plan
            plan = await self._get_workspace_plan(request)
            result = await limiter.check_user(user_id, "requests_per_minute", plan=plan)
            limit_key = f"user:{user_id}"
        elif api_key:
            # API key — extract workspace from key
            plan = await self._get_api_key_plan(request)
            result = await limiter.check(f"api:{api_key[:12]}", "api_per_minute", plan=plan)
            limit_key = f"api:{api_key[:12]}"
        elif path.startswith("/api/v1/widget/") or path.startswith("/widget/"):
            # Widget — use IP-based limiting
            ip = self._get_client_ip(request)
            result = await limiter.check_ip(ip, "widget_per_minute")
            limit_key = f"ip:{ip}"
        else:
            # Unauthenticated — strict IP-based limit
            ip = self._get_client_ip(request)
            result = await limiter.check_ip(ip, "requests_per_minute")
            limit_key = f"ip:{ip}"

        if not result.allowed:
            logger.warning("Rate limit exceeded: key=%s, path=%s", limit_key, path)
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": "Too many requests. Please try again later.",
                        "retry_after": result.retry_after,
                    },
                },
                headers={
                    "Retry-After": str(int(result.retry_after) + 1),
                    "X-RateLimit-Limit": str(result.limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(result.reset_at)),
                },
            )

        response = await call_next(request)

        # Add rate limit headers to response
        response.headers["X-RateLimit-Limit"] = str(result.limit)
        response.headers["X-RateLimit-Remaining"] = str(result.remaining)
        response.headers["X-RateLimit-Reset"] = str(int(result.reset_at))

        return response

    def _get_client_ip(self, request: Request) -> str:
        """Get client IP, respecting reverse proxies."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        return request.client.host if request.client else "unknown"

    async def _get_workspace_plan(self, request: Request) -> str:
        """Get the workspace plan for rate limit tier."""
        workspace_id = getattr(request.state, "workspace_id", None)
        if not workspace_id:
            return "free"
        try:
            from sqlalchemy import select
            from app.models.workspace import Workspace
            from app.core.database import async_session_factory
            # Use the request's workspace info from middleware
            return getattr(request.state, "workspace_plan", "free")
        except Exception:
            return "free"

    async def _get_api_key_plan(self, request: Request) -> str:
        """Get the plan associated with an API key."""
        return getattr(request.state, "workspace_plan", "free")
