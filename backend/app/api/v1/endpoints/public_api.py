"""SupportPilot AI — Public API Endpoints

API key-authenticated endpoints for programmatic access.
These endpoints use X-API-Key header for authentication.
"""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import verify_api_key
from app.models.api_key import ApiKey
from app.models.workspace import Workspace
from app.schemas.chat import ChatCreate, ChatResponse, MessageCreate, MessageResponse
from app.services.chat_service import ChatService, ChatError
from app.services.document_service import DocumentService, DocumentProcessingError

router = APIRouter(dependencies=[])


# ── API Key Authentication ─────────────────────────────────────────

async def get_api_key_workspace(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Authenticate via API key and return workspace context.
    Sets request.state.workspace_id and request.state.workspace_plan.
    """
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing X-API-Key header")

    # Hash the provided key and look it up
    import hashlib
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    stmt = select(ApiKey).where(
        ApiKey.key_hash == key_hash,
        ApiKey.is_active == True,  # noqa: E712
    )
    result = await db.execute(stmt)
    key_record = result.scalar_one_or_none()

    if not key_record:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # Check expiration
    from datetime import datetime
    if key_record.expires_at and key_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="API key expired")

    # Get workspace for plan info
    ws_stmt = select(Workspace).where(Workspace.id == key_record.workspace_id)
    ws_result = await db.execute(ws_stmt)
    workspace = ws_result.scalar_one_or_none()

    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Update last used
    key_record.last_used_at = datetime.utcnow()
    await db.flush()

    # Set state for rate limiting
    request.state.workspace_id = workspace.id
    request.state.workspace_plan = workspace.plan

    return {
        "workspace_id": workspace.id,
        "workspace_plan": workspace.plan,
        "api_key_id": key_record.id,
        "scopes": json.loads(key_record.scopes) if key_record.scopes else ["read", "write"],
    }


# ── Chat Endpoints ─────────────────────────────────────────────────

@router.post("/chat", response_model=MessageResponse, status_code=201)
async def api_chat(
    data: MessageCreate,
    context: dict = Depends(get_api_key_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message to the AI and get a response.
    
    This is the primary endpoint for programmatic chat access.
    Requires X-API-Key header.
    """
    chat_service = ChatService(db)

    # Create a new chat for each API call (stateless)
    chat = await chat_service.create_chat(
        workspace_id=context["workspace_id"],
        title="API Chat",
    )

    try:
        result = await chat_service.send_message(
            workspace_id=context["workspace_id"],
            chat_id=chat.id,
            content=data.content,
            use_rag=True,
        )
        return MessageResponse(
            id=result.assistant_message.id,
            chat_id=result.assistant_message.chat_id,
            workspace_id=result.assistant_message.workspace_id,
            role=result.assistant_message.role,
            content=result.assistant_message.content,
            sources=json.loads(result.assistant_message.sources) if result.assistant_message.sources else [],
            tokens_used=result.assistant_message.tokens_used,
            created_at=result.assistant_message.created_at.isoformat() if result.assistant_message.created_at else None,
        )
    except ChatError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/chats", response_model=ChatResponse, status_code=201)
async def api_create_chat(
    data: ChatCreate,
    context: dict = Depends(get_api_key_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Create a new chat session for multi-turn conversations."""
    chat_service = ChatService(db)
    chat = await chat_service.create_chat(
        workspace_id=context["workspace_id"],
        title=data.title,
    )
    return ChatResponse.model_validate(chat)


@router.post("/chats/{chat_id}/messages", response_model=MessageResponse)
async def api_send_message(
    chat_id: str,
    data: MessageCreate,
    context: dict = Depends(get_api_key_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to an existing chat session."""
    chat_service = ChatService(db)
    try:
        result = await chat_service.send_message(
            workspace_id=context["workspace_id"],
            chat_id=chat_id,
            content=data.content,
            use_rag=True,
        )
        return MessageResponse(
            id=result.assistant_message.id,
            chat_id=result.assistant_message.chat_id,
            workspace_id=result.assistant_message.workspace_id,
            role=result.assistant_message.role,
            content=result.assistant_message.content,
            sources=json.loads(result.assistant_message.sources) if result.assistant_message.sources else [],
            tokens_used=result.assistant_message.tokens_used,
            created_at=result.assistant_message.created_at.isoformat() if result.assistant_message.created_at else None,
        )
    except ChatError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Search Endpoint ────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    top_k: int = Field(5, ge=1, le=20)


@router.post("/search")
async def api_search(
    data: SearchRequest,
    context: dict = Depends(get_api_key_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Search the knowledge base using semantic similarity."""
    service = DocumentService(db)
    results = await service.search_knowledge_base(
        workspace_id=context["workspace_id"],
        query=data.query,
        top_k=data.top_k,
    )
    return {"success": True, "data": results}


# ── Document Upload Endpoint ───────────────────────────────────────

class DocumentUploadResponse(BaseModel):
    id: str
    name: str
    status: str
    message: str = "Document uploaded and is being processed"


@router.post("/documents", response_model=DocumentUploadResponse, status_code=202)
async def api_upload_document(
    context: dict = Depends(get_api_key_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a document via API.
    For file upload via API, use multipart form data.
    """
    # This is a placeholder — actual file upload would use UploadFile
    raise HTTPException(
        status_code=501,
        detail="Use the main API endpoint /api/v1/workspaces/{id}/documents for file uploads",
    )
