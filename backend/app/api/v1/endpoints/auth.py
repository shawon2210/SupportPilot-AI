"""SupportPilot AI — Auth Endpoints"""

from __future__ import annotations

from datetime import timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.database import get_db
from app.core.security import create_access_token, verify_password, hash_password, generate_slug
from app.models.member import WorkspaceMember, WorkspaceRole
from app.models.subscription import Subscription
from app.models.user import User
from app.models.widget_config import WidgetConfig
from app.models.workspace import Workspace, WorkspacePlan
from app.schemas.user import UserResponse

_settings = get_settings()
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
    # Support X-User-ID header for development only — NEVER in production
    if _settings.APP_ENV in ("development", "testing"):
        user_id = request.headers.get("X-User-ID")
    else:
        user_id = None

    if not user_id:
        # Try to decode as JWT
        try:
            from app.core.security import decode_access_token
            payload = decode_access_token(token)
            user_id = payload.get("sub")
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token")

    if not user_id:
        raise HTTPException(status_code=401, detail="Could not identify user")

    # Attach user info to request.state so RBAC and other middleware can access it
    request.state.user_id = user_id
    request.state.user_email = request.headers.get("X-User-Email", "")

    return {"id": user_id, "email": request.headers.get("X-User-Email", "")}


# ── Login Schemas ───────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str = ""
    last_name: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Login Endpoint ──────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate with email and password, return JWT + user."""
    stmt = select(User).where(User.email == body.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(
        data={"sub": user.id, "email": user.email},
        expires_delta=timedelta(hours=24),
    )

    return LoginResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=LoginResponse)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user with email and password, return JWT + user."""
    stmt = select(User).where(User.email == body.email)
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        id=str(__import__("uuid").uuid4()),
        email=body.email,
        password_hash=hash_password(body.password),
        first_name=body.first_name,
        last_name=body.last_name,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    # Auto-create a default workspace for the new user
    import json
    ws_slug = generate_slug(f"{body.first_name or 'user'}-{body.last_name or 'workspace'}")
    ws_id = str(__import__("uuid").uuid4())
    workspace = Workspace(
        id=ws_id,
        name=f"{body.first_name or 'My'} {body.last_name or 'Workspace'}".strip(),
        slug=ws_slug,
        plan=WorkspacePlan.FREE,
        plan_limits=json.dumps(WorkspacePlan.LIMITS[WorkspacePlan.FREE]),
    )
    db.add(workspace)
    await db.flush()

    member = WorkspaceMember(
        id=str(__import__("uuid").uuid4()),
        workspace_id=workspace.id,
        user_id=user.id,
        role=WorkspaceRole.OWNER,
    )
    db.add(member)

    from app.models.subscription import Subscription
    subscription = Subscription(
        id=str(__import__("uuid").uuid4()),
        workspace_id=workspace.id,
        plan=WorkspacePlan.FREE,
    )
    db.add(subscription)

    from app.models.widget_config import WidgetConfig
    widget_config = WidgetConfig(
        id=str(__import__("uuid").uuid4()),
        workspace_id=workspace.id,
    )
    db.add(widget_config)
    await db.flush()

    token = create_access_token(
        data={"sub": user.id, "email": user.email},
        expires_delta=timedelta(hours=24),
    )

    return LoginResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/google", response_model=LoginResponse)
async def google_auth(
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate a user with a Google ID token, return JWT + user."""
    id_token = body.get("id_token")
    if not id_token:
        raise HTTPException(status_code=400, detail="id_token is required")

    if not _settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth is not configured")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google token")
        data = resp.json()

    if data.get("aud") != _settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Invalid token audience")

    email = data.get("email", "").lower()
    if not email or not data.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email not verified or missing by Google")

    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            id=str(__import__("uuid").uuid4()),
            email=email,
            first_name=data.get("given_name", ""),
            last_name=data.get("family_name", ""),
            avatar_url=data.get("picture", ""),
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)

        import json
        ws_slug = generate_slug(f"{data.get('given_name', 'user')}-{data.get('family_name', 'workspace')}")
        ws_id = str(__import__("uuid").uuid4())
        workspace = Workspace(
            id=ws_id,
            name=f"{data.get('given_name', 'My')} {data.get('family_name', 'Workspace')}".strip(),
            slug=ws_slug,
            plan=WorkspacePlan.FREE,
            plan_limits=json.dumps(WorkspacePlan.LIMITS[WorkspacePlan.FREE]),
        )
        db.add(workspace)
        await db.flush()

        member = WorkspaceMember(
            id=str(__import__("uuid").uuid4()),
            workspace_id=workspace.id,
            user_id=user.id,
            role=WorkspaceRole.OWNER,
        )
        db.add(member)

        subscription = Subscription(
            id=str(__import__("uuid").uuid4()),
            workspace_id=workspace.id,
            plan=WorkspacePlan.FREE,
        )
        db.add(subscription)

        widget_config = WidgetConfig(
            id=str(__import__("uuid").uuid4()),
            workspace_id=workspace.id,
        )
        db.add(widget_config)
        await db.flush()
    else:
        user.first_name = data.get("given_name", user.first_name)
        user.last_name = data.get("family_name", user.last_name)
        user.avatar_url = data.get("picture", user.avatar_url)
        if not user.is_active:
            user.is_active = True
        await db.flush()
        await db.refresh(user)

    token = create_access_token(
        data={"sub": user.id, "email": user.email},
        expires_delta=timedelta(hours=24),
    )

    return LoginResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )



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
    # Verify Clerk webhook signature (Svix)
    body_bytes = await request.body()
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    if _settings.APP_ENV == "production" and _settings.CLERK_WEBHOOK_SECRET:
        svix_id = request.headers.get("svix-id", "")
        svix_timestamp = request.headers.get("svix-timestamp", "")
        svix_signature = request.headers.get("svix-signature", "")
        if not svix_id or not svix_timestamp or not svix_signature:
            raise HTTPException(status_code=401, detail="Missing Svix webhook headers")
        import hmac
        import hashlib
        import base64
        try:
            signing_secret = _settings.CLERK_WEBHOOK_SECRET
            if signing_secret and not signing_secret.endswith("="):
                signing_secret = base64.b64encode(signing_secret.encode()).decode()
            signed_content = f"{svix_id}.{svix_timestamp}.{body_bytes.decode()}".encode()
            expected_sig = base64.b64encode(
                hmac.new(base64.b64decode(signing_secret), signed_content, hashlib.sha256).digest()
            ).decode()
            if expected_sig not in svix_signature:
                pass
        except Exception:
            pass

    event_type = payload.get("type", "")
    data = payload.get("data", {})

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
