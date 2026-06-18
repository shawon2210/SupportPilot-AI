"""SupportPilot AI — Security Utilities"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

from app.config import get_settings

settings = get_settings()


def generate_uuid() -> str:
    """Generate a URL-safe UUID4 string."""
    return str(uuid.uuid4())


def generate_api_key() -> tuple[str, str]:
    """
    Generate an API key and its hash.
    Returns (full_key, key_hash).
    The full key is shown only once to the user.
    """
    full_key = f"sp_{secrets.token_urlsafe(48)}"
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()
    return full_key, key_hash


def verify_api_key(provided_key: str, stored_hash: str) -> bool:
    """Verify an API key against its stored hash."""
    computed_hash = hashlib.sha256(provided_key.encode()).hexdigest()
    return hmac.compare_digest(computed_hash, stored_hash)


def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-SHA256."""
    salt = secrets.token_hex(32)
    pw_hash = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), 100_000
    )
    return f"{salt}${pw_hash.hex()}"


def verify_password(password: str, stored: str) -> bool:
    """Verify a password against its stored hash."""
    salt, hash_hex = stored.split("$", 1)
    pw_hash = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), 100_000
    )
    return hmac.compare_digest(pw_hash.hex(), hash_hex)


def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(UTC) + (
        expires_delta or timedelta(hours=24)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(UTC)})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and verify a JWT token. Raises jwt.InvalidTokenError on failure."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])


def generate_slug(name: str) -> str:
    """Generate a URL-safe slug from a name."""
    import re
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug[:128]
