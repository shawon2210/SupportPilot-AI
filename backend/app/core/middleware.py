"""SupportPilot AI — Application Middleware"""

from __future__ import annotations

import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import get_settings
from app.core.exceptions import (
    AuthenticationError,
    SupportPilotError,
)

settings = get_settings()


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Attach a unique request_id to every request for tracing."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id

        start = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration:.4f}s"
        return response


class TenantContextMiddleware(BaseHTTPMiddleware):
    """
    Extract workspace_id from authenticated request and attach it to request.state.
    This is set after Clerk auth populates request.state.user.
    """

    # Paths that don't require workspace context
    EXEMPT_PATHS = {
        "/api/v1/health",
        "/api/v1/health/ready",
        "/api/v1/auth",
        "/api/v1/widget",
        "/docs",
        "/redoc",
        "/openapi.json",
    }

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Check if path is exempt
        path = request.url.path
        if any(path.startswith(prefix) for prefix in self.EXEMPT_PATHS):
            return await call_next(request)

        # Try to extract workspace_id from header (for API key auth) or path
        workspace_id = request.headers.get("X-Workspace-ID")
        if workspace_id:
            request.state.workspace_id = workspace_id

        return await call_next(request)


async def global_exception_handler(request: Request, exc: SupportPilotError) -> JSONResponse:
    """Handle all custom SupportPilot exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
            },
        },
    )


async def authentication_error_handler(request: Request, exc: AuthenticationError) -> JSONResponse:
    return JSONResponse(
        status_code=401,
        content={
            "success": False,
            "error": {
                "code": "AUTHENTICATION_ERROR",
                "message": "Invalid or missing authentication token",
            },
        },
        headers={"WWW-Authenticate": "Bearer"},
    )
