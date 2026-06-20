"""SupportPilot AI — API Key Endpoints

Manage API keys for programmatic access.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.core.rbac import require_role
from app.core.security import generate_api_key, generate_uuid
from app.models.api_key import ApiKey

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────

class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    scopes: list[str] = Field(default=["read", "write"])
    expires_in_days: int | None = Field(None, ge=1, le=365)


class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    scopes: list[str]
    is_active: bool
    created_at: str
    expires_at: str | None


class ApiKeyCreatedResponse(ApiKeyResponse):
    api_key: str  # Full key — only shown once


# ── Endpoints ──────────────────────────────────────────────────────

@router.get("/", response_model=list[ApiKeyResponse])
async def list_api_keys(
    workspace_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("admin")),
):
    """List all API keys for a workspace (without full keys)."""
    stmt = select(ApiKey).where(
        ApiKey.workspace_id == workspace_id,
    ).order_by(ApiKey.created_at.desc())
    result = await db.execute(stmt)
    keys = list(result.scalars().all())

    import json
    return [
        ApiKeyResponse(
            id=k.id,
            name=k.name,
            key_prefix=k.key_prefix,
            scopes=json.loads(k.scopes) if k.scopes else ["read", "write"],
            is_active=k.is_active,
            created_at=k.created_at.isoformat() if k.created_at else None,
            expires_at=k.expires_at.isoformat() if k.expires_at else None,
        )
        for k in keys
    ]


@router.post("/", response_model=ApiKeyCreatedResponse, status_code=201)
async def create_api_key(
    workspace_id: str,
    data: ApiKeyCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("admin")),
):
    """
    Create a new API key.
    
    The full API key is only shown once. Store it securely.
    """
    full_key, key_hash = generate_api_key()

    from datetime import datetime, timedelta
    import json

    api_key = ApiKey(
        id=generate_uuid(),
        workspace_id=workspace_id,
        name=data.name,
        key_hash=key_hash,
        key_prefix=full_key[:12],
        scopes=json.dumps(data.scopes),
        expires_at=datetime.utcnow() + timedelta(days=data.expires_in_days) if data.expires_in_days else None,
        is_active=True,
        created_by=current_user["id"],
    )
    db.add(api_key)
    await db.flush()

    return ApiKeyCreatedResponse(
        id=api_key.id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        scopes=data.scopes,
        is_active=api_key.is_active,
        created_at=api_key.created_at.isoformat() if api_key.created_at else None,
        expires_at=api_key.expires_at.isoformat() if api_key.expires_at else None,
        api_key=full_key,
    )


@router.delete("/{key_id}", status_code=204)
async def delete_api_key(
    workspace_id: str,
    key_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("admin")),
):
    """Revoke an API key."""
    stmt = select(ApiKey).where(
        ApiKey.id == key_id,
        ApiKey.workspace_id == workspace_id,
    )
    result = await db.execute(stmt)
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    api_key.is_active = False
    await db.flush()


@router.post("/{key_id}/rotate", response_model=ApiKeyCreatedResponse)
async def rotate_api_key(
    workspace_id: str,
    key_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("admin")),
):
    """
    Rotate an API key — creates a new key and deactivates the old one.
    """
    stmt = select(ApiKey).where(
        ApiKey.id == key_id,
        ApiKey.workspace_id == workspace_id,
    )
    result = await db.execute(stmt)
    old_key = result.scalar_one_or_none()

    if not old_key:
        raise HTTPException(status_code=404, detail="API key not found")

    # Deactivate old key
    old_key.is_active = False

    # Create new key
    full_key, key_hash = generate_api_key()
    import json

    new_key = ApiKey(
        id=generate_uuid(),
        workspace_id=workspace_id,
        name=old_key.name,
        key_hash=key_hash,
        key_prefix=full_key[:12],
        scopes=old_key.scopes,
        is_active=True,
        created_by=current_user["id"],
    )
    db.add(new_key)
    await db.flush()

    return ApiKeyCreatedResponse(
        id=new_key.id,
        name=new_key.name,
        key_prefix=new_key.key_prefix,
        scopes=json.loads(new_key.scopes) if new_key.scopes else ["read", "write"],
        is_active=new_key.is_active,
        created_at=new_key.created_at.isoformat() if new_key.created_at else None,
        expires_at=None,
        api_key=full_key,
    )
