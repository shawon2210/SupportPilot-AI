"""SupportPilot AI — Chat Endpoints

Chat conversation management with RAG-powered responses and SSE streaming.
"""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.core.rbac import require_role
from app.schemas.base import PaginatedResponse, PaginationMeta, PaginationParams
from app.schemas.chat import (
    ChatCreate,
    ChatResponse,
    ChatUpdate,
    ChatWithMessages,
    MessageCreate,
    MessageResponse,
)
from app.services.chat_service import ChatService, ChatError

router = APIRouter()


# ── Chat CRUD ──────────────────────────────────────────────────────

@router.post("/chats", response_model=ChatResponse, status_code=201)
async def create_chat(
    workspace_id: str,
    data: ChatCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """Create a new chat session."""
    service = ChatService(db)
    chat = await service.create_chat(
        workspace_id=workspace_id,
        user_id=current_user["id"],
        title=data.title,
    )
    return ChatResponse.model_validate(chat)


@router.get("/chats", response_model=PaginatedResponse[ChatResponse])
async def list_chats(
    workspace_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: str | None = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """List chat sessions in the workspace."""
    pagination = PaginationParams(page=page, per_page=per_page)
    service = ChatService(db)
    chats = await service.list_chats(
        workspace_id,
        status=status,
        offset=pagination.offset,
        limit=pagination.limit,
    )
    return PaginatedResponse(
        data=[ChatResponse.model_validate(c) for c in chats],
        meta=PaginationMeta(page=page, per_page=per_page, total=len(chats)),
    )


@router.get("/chats/{chat_id}", response_model=ChatWithMessages)
async def get_chat(
    workspace_id: str,
    chat_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """Get a chat session with all its messages."""
    service = ChatService(db)
    chat = await service.get_chat(workspace_id, chat_id)

    # Build response with messages
    response = ChatWithMessages.model_validate(chat)
    response.messages = [
        MessageResponse(
            id=msg.id,
            chat_id=msg.chat_id,
            workspace_id=msg.workspace_id,
            role=msg.role,
            content=msg.content,
            sources=json.loads(msg.sources) if msg.sources else [],
            tokens_used=msg.tokens_used,
            created_at=msg.created_at.isoformat() if msg.created_at else None,
        )
        for msg in chat.messages
    ]
    return response


@router.patch("/chats/{chat_id}", response_model=ChatResponse)
async def update_chat(
    workspace_id: str,
    chat_id: str,
    data: ChatUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """Update chat metadata."""
    service = ChatService(db)
    chat = await service.update_chat(workspace_id, chat_id, title=data.title, status=data.status)
    return ChatResponse.model_validate(chat)


@router.delete("/chats/{chat_id}", status_code=204)
async def delete_chat(
    workspace_id: str,
    chat_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """Delete a chat session and all its messages."""
    service = ChatService(db)
    await service.delete_chat(workspace_id, chat_id)


# ── Messaging ──────────────────────────────────────────────────────

@router.post("/chats/{chat_id}/messages", response_model=MessageResponse)
async def send_message(
    workspace_id: str,
    chat_id: str,
    data: MessageCreate,
    use_rag: bool = Query(True, description="Whether to use RAG for context"),
    source_id: str | None = Query(None, description="Optional source ID to limit RAG search"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """
    Send a message and get a complete response.
    
    Set use_rag=false to skip knowledge base retrieval.
    """
    service = ChatService(db)
    try:
        result = await service.send_message(
            workspace_id=workspace_id,
            chat_id=chat_id,
            content=data.content,
            use_rag=use_rag,
            source_id=source_id,
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


@router.post("/chats/{chat_id}/messages/stream")
async def stream_message(
    workspace_id: str,
    chat_id: str,
    data: MessageCreate,
    use_rag: bool = Query(True, description="Whether to use RAG for context"),
    source_id: str | None = Query(None, description="Optional source ID to limit RAG search"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """
    Send a message and stream the response using Server-Sent Events (SSE).
    
    Returns a streaming response with text/event-stream content type.
    Each event contains a chunk of the AI response.
    """
    service = ChatService(db)

    async def event_generator():
        try:
            async for chunk in service.stream_message(
                workspace_id=workspace_id,
                chat_id=chat_id,
                content=data.content,
                use_rag=use_rag,
                source_id=source_id,
            ):
                yield f"data: {json.dumps({'content': chunk})}\n\n"

            yield f"data: {json.dumps({'done': True})}\n\n"
        except ChatError as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
