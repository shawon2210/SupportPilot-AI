"""SupportPilot AI — Website Ingestion Endpoints

Handles website crawling and content ingestion.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.core.rbac import require_role
from app.schemas.knowledge_source import KnowledgeSourceResponse
from app.services.document_service import DocumentService, DocumentProcessingError

router = APIRouter()


class WebsiteIngestRequest(BaseModel):
    url: str = Field(..., description="URL to crawl", max_length=2000)
    name: str | None = Field(None, description="Name for the knowledge source")
    max_pages: int = Field(50, ge=1, le=500, description="Maximum pages to crawl")


@router.post("/documents/website", response_model=KnowledgeSourceResponse, status_code=201)
async def ingest_website(
    workspace_id: str,
    data: WebsiteIngestRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("agent")),
):
    """
    Crawl a website and ingest its content into the knowledge base.
    
    The crawler will:
    1. Start from the given URL
    2. Follow links within the same domain
    3. Extract text content from each page
    4. Chunk and embed all content
    5. Store in the vector database
    """
    service = DocumentService(db)
    try:
        source = await service.ingest_website(
            workspace_id=workspace_id,
            url=data.url,
            name=data.name,
            max_pages=data.max_pages,
            created_by=current_user["id"],
        )
        return KnowledgeSourceResponse.model_validate(source)
    except DocumentProcessingError as e:
        raise HTTPException(status_code=422, detail=str(e))
