"""SupportPilot AI — Document Endpoints

Handles file upload, knowledge source management, and vector search.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.core.rbac import require_role
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
