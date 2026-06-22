"""SupportPilot AI — Document Endpoints

Handles file upload, knowledge source management, and vector search.
"""

from __future__ import annotations

import json
import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.core.rbac import require_role
from app.models.document_chunk import DocumentChunk
from app.models.knowledge_source import KnowledgeSource, KnowledgeSourceStatus
from app.models.workspace import Workspace
from app.schemas.base import PaginatedResponse, PaginationMeta, PaginationParams
from app.schemas.knowledge_source import KnowledgeSourceResponse
from app.services.document_service import DocumentProcessingError, DocumentService

router = APIRouter()


@router.post("/documents", response_model=KnowledgeSourceResponse, status_code=201)
async def upload_document(
    workspace_id: str,
    file: UploadFile = File(...),
    name: str | None = Form(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """
    Upload a document to the knowledge base.
    
    Supported formats: PDF, DOCX, TXT, Markdown.
    Max file size: 25 MB (configurable).
    
    The document is processed asynchronously:
    1. Text extraction
    2. Chunking
    3. Embedding generation
    4. Vector storage
    """
    # Validate file type
    from app.utils.files import validate_file_type
    if not validate_file_type(file.filename or "", file.content_type):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Supported: PDF, DOCX, TXT, Markdown",
        )

    # Read file content
    content = await file.read()

    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    service = DocumentService(db)
    try:
        source = await service.upload_document(
            workspace_id=workspace_id,
            filename=name or file.filename or "unnamed",
            content=content,
            mime_type=file.content_type,
            created_by=current_user["id"],
        )
        return KnowledgeSourceResponse.model_validate(source)
    except DocumentProcessingError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/documents", response_model=PaginatedResponse[KnowledgeSourceResponse])
async def list_documents(
    workspace_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    source_type: str | None = None,
    status: str | None = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """List knowledge sources in the workspace."""
    pagination = PaginationParams(page=page, per_page=per_page)
    service = DocumentService(db)
    sources = await service.list_sources(
        workspace_id,
        source_type=source_type,
        status=status,
        offset=pagination.offset,
        limit=pagination.limit,
    )

    return PaginatedResponse(
        data=[KnowledgeSourceResponse.model_validate(s) for s in sources],
        meta=PaginationMeta(
            page=page,
            per_page=per_page,
            total=len(sources),
        ),
    )


@router.get("/documents/{source_id}", response_model=KnowledgeSourceResponse)
async def get_document(
    workspace_id: str,
    source_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """Get knowledge source details."""
    service = DocumentService(db)
    source = await service.get_source(workspace_id, source_id)
    return KnowledgeSourceResponse.model_validate(source)


@router.delete("/documents/{source_id}", status_code=204)
async def delete_document(
    workspace_id: str,
    source_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """Delete a knowledge source and all its chunks."""
    service = DocumentService(db)
    await service.delete_source(workspace_id, source_id)


@router.get("/documents/{source_id}/content")
async def get_document_content(
    workspace_id: str,
    source_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """Serve the uploaded file for preview."""
    from app.models.knowledge_source import KnowledgeSource
    from sqlalchemy import select
    stmt = select(KnowledgeSource).where(
        KnowledgeSource.id == source_id,
        KnowledgeSource.workspace_id == workspace_id,
    )
    result = await db.execute(stmt)
    source = result.scalar_one_or_none()
    if not source or not source.file_path:
        raise HTTPException(status_code=404, detail="Source not found")
    if not os.path.exists(source.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(
        source.file_path,
        media_type=source.mime_type or "application/octet-stream",
        filename=source.name,
        headers={"Content-Disposition": f"inline; filename=\"{source.name}\""},
    )


@router.get("/documents/{source_id}/chunks")
async def get_document_chunks(
    workspace_id: str,
    source_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """Get all chunks for a knowledge source."""
    service = DocumentService(db)
    chunks = await service.get_source_chunks(workspace_id, source_id)
    return {
        "success": True,
        "data": [
            {
                "id": chunk.id,
                "chunk_index": chunk.chunk_index,
                "content": chunk.content,
                "token_count": chunk.token_count,
                "metadata": chunk.metadata,
            }
            for chunk in chunks
        ],
    }


# ── Document update helpers ──────────────────────────────────


@router.put("/documents/{source_id}/metadata")
async def update_document_metadata(
    workspace_id: str,
    source_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """Update document-level metadata (e.g. published, tags)."""
    from app.models.knowledge_source import KnowledgeSource, KnowledgeSourceStatus

    stmt = select(KnowledgeSource).where(
        KnowledgeSource.id == source_id,
        KnowledgeSource.workspace_id == workspace_id,
    )
    result = await db.execute(stmt)
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Document not found")

    current_meta = json.loads(source.metadata_) if source.metadata_ else {}
    current_meta.update(body)
    source.metadata_ = json.dumps(current_meta)
    await db.commit()
    return {"success": True, "metadata": current_meta}


# ── Public Help Center (no auth required) ────────────────────


@router.get("/public/{workspace_slug}/articles")
async def list_public_articles(
    workspace_slug: str,
    db: AsyncSession = Depends(get_db),
):
    """List published knowledge base articles for the public help center."""
    ws = await db.execute(select(Workspace).where(Workspace.slug == workspace_slug))
    ws = ws.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if not ws.is_active:
        raise HTTPException(status_code=404, detail="Workspace not found")

    stmt = select(KnowledgeSource).where(
        KnowledgeSource.workspace_id == ws.id,
        KnowledgeSource.status == KnowledgeSourceStatus.READY,
    ).order_by(KnowledgeSource.updated_at.desc()).limit(50)
    result = await db.execute(stmt)
    sources = result.scalars().all()

    articles = []
    for s in sources:
        meta = json.loads(s.metadata_ or "{}")
        if not meta.get("published", False):
            continue
        articles.append({
            "id": s.id,
            "name": s.name,
            "source_type": s.source_type,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        })

    return {"success": True, "data": articles}


@router.get("/public/{workspace_slug}/articles/{source_id}")
async def get_public_article(
    workspace_slug: str,
    source_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get full article content for the public help center."""
    ws = await db.execute(select(Workspace).where(Workspace.slug == workspace_slug))
    ws = ws.scalar_one_or_none()
    if not ws or not ws.is_active:
        raise HTTPException(status_code=404, detail="Workspace not found")

    source = await db.execute(select(KnowledgeSource).where(
        KnowledgeSource.id == source_id,
        KnowledgeSource.workspace_id == ws.id,
        KnowledgeSource.status == KnowledgeSourceStatus.READY,
    ))
    source = source.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Article not found")

    meta = json.loads(source.metadata_ or "{}")
    if not meta.get("published", False):
        raise HTTPException(status_code=404, detail="Article not found")

    chunks = await db.execute(select(DocumentChunk).where(
        DocumentChunk.source_id == source_id,
    ).order_by(DocumentChunk.chunk_index))
    chunks = chunks.scalars().all()

    full_content = "\n\n".join(c.content for c in chunks)
    return {
        "success": True,
        "data": {
            "id": source.id,
            "name": source.name,
            "source_type": source.source_type,
            "content": full_content,
            "updated_at": source.updated_at.isoformat() if source.updated_at else None,
        },
    }
