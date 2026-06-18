"""SupportPilot AI — Auth Endpoints"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter()


async def get_current_user(request: Request) -> dict:
    """
    Extract and verify the current user from Clerk JWT.
    In production, this validates the JWT against Clerk's JWKS.
    For Phase 1, we extract from a simplified token or header.
    """
    # Check for Authorization header
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = auth_header[7:]

    # In production: validate JWT against Clerk JWKS
    # For Phase 1: extract user info from token or use a dev header
    # Support X-User-ID header for development
    user_id = request.headers.get("X-User-ID")
    if not user_id:
        # Try to decode as JWT (dev mode)
        try:
            from app.core.security import decode_access_token
            payload = decode_access_token(token)
            user_id = payload.get("sub")
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token")

    if not user_id:
        raise HTTPException(status_code=401, detail="Could not identify user")

    return {"id": user_id, "email": request.headers.get("X-User-Email", "")}


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user profile."""
    stmt = select(User).where(User.id == current_user["id"])
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse.model_validate(user)


@router.post("/webhook")
async def clerk_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Clerk webhook events for user sync.
    Events: user.created, user.updated, user.deleted
    """
    body = await request.json()
    event_type = body.get("type", "")
    data = body.get("data", {})

    if event_type == "user.created" or event_type == "user.updated":
        user_id = data.get("id")
        email_data = data.get("email_addresses", [{}])
        email = email_data[0].get("email_address", "") if email_data else ""
        first_name = data.get("first_name", "")
        last_name = data.get("last_name", "")
        avatar_url = data.get("image_url", "")

        # Upsert user
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if user:
            user.email = email
            user.first_name = first_name
            user.last_name = last_name
            user.avatar_url = avatar_url
        else:
            user = User(
                id=user_id,
                email=email,
                first_name=first_name,
                last_name=last_name,
                avatar_url=avatar_url,
            )
            db.add(user)

        await db.flush()
        return {"status": "ok", "event": event_type}

    elif event_type == "user.deleted":
        user_id = data.get("id")
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if user:
            user.is_active = False
            await db.flush()
        return {"status": "ok", "event": event_type}

    return {"status": "ignored", "event": event_type}
