"""SupportPilot AI — Core Package"""

from app.core.database import Base, close_db, get_db, init_db
from app.core.exceptions import (
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    SupportPilotError,
    TenantIsolationError,
    ValidationError,
)
from app.core.security import (
    create_access_token,
    decode_access_token,
    generate_api_key,
    generate_uuid,
    verify_api_key,
)

__all__ = [
    "Base",
    "get_db",
    "init_db",
    "close_db",
    "SupportPilotError",
    "NotFoundError",
    "AuthenticationError",
    "AuthorizationError",
    "ValidationError",
    "RateLimitError",
    "TenantIsolationError",
    "generate_uuid",
    "generate_api_key",
    "verify_api_key",
    "create_access_token",
    "decode_access_token",
]
