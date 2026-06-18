"""SupportPilot AI — Custom Exceptions"""

from __future__ import annotations


class SupportPilotError(Exception):
    """Base exception for all SupportPilot errors."""

    def __init__(self, message: str, code: str = "INTERNAL_ERROR", status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(self.message)


class NotFoundError(SupportPilotError):
    """Resource not found."""

    def __init__(self, resource: str = "Resource", resource_id: str = ""):
        msg = f"{resource} not_found" if not resource_id else f"{resource} '{resource_id}' not_found"
        super().__init__(message=msg, code="NOT_FOUND", status_code=404)


class AuthenticationError(SupportPilotError):
    """Authentication failed."""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message=message, code="AUTHENTICATION_ERROR", status_code=401)


class AuthorizationError(SupportPilotError):
    """Insufficient permissions."""

    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message=message, code="AUTHORIZATION_ERROR", status_code=403)


class ValidationError(SupportPilotError):
    """Input validation failed."""

    def __init__(self, message: str = "Validation failed"):
        super().__init__(message=message, code="VALIDATION_ERROR", status_code=422)


class RateLimitError(SupportPilotError):
    """Rate limit exceeded."""

    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(message=message, code="RATE_LIMIT_EXCEEDED", status_code=429)


class TenantIsolationError(SupportPilotError):
    """Cross-tenant access attempt."""

    def __init__(self, message: str = "Cross-tenant access denied"):
        super().__init__(message=message, code="TENANT_ISOLATION_ERROR", status_code=403)
