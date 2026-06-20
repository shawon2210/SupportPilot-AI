"""SupportPilot AI — Vector Search Endpoints

Semantic search over the knowledge base.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.core.rbac import require_role
from app.services.document_service import DocumentService

router = APIRouter()


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000, description="Search query")
    top_k: int = Field(5, ge=1, le=20, description="Number of results to return")
    source_id: str | None = Field(None, description="Optional source ID to limit search")


class SearchResult(BaseModel):
    chunk_id: str
    source_id: str
    content: str
    chunk_index: int
    similarity: float
    metadata: str | None = None


class SearchResponse(BaseModel):
    success: bool = True
    query: str
    results: list[SearchResult]
    total_results: int


@router.post("/search", response_model=SearchResponse)
async def search_knowledge_base(
    workspace_id: str,
    data: SearchRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("member")),
):
    """
    Search the knowledge base using semantic similarity.
    
    Returns the most relevant chunks from the knowledge base,
    ranked by cosine similarity to the query embedding.
    """
    service = DocumentService(db)
    try:
        results = await service.search_knowledge_base(
            workspace_id=workspace_id,
            query=data.query,
            top_k=data.top_k,
            source_id=data.source_id,
        )

        return SearchResponse(
            query=data.query,
            results=[
                SearchResult(
                    chunk_id=r["chunk_id"],
                    source_id=r["source_id"],
                    content=r["content"],
                    chunk_index=r["chunk_index"],
                    similarity=r["similarity"],
                    metadata=r.get("metadata"),
                )
                for r in results
            ],
            total_results=len(results),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {e}")


@router.get("/search", response_model=SearchResponse)
async def search_knowledge_base_get(
    workspace_id: str,
    query: str = Query(..., min_length=1, max_length=2000),
    top_k: int = Query(5, ge=1, le=20),
    source_id: str | None = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rbac: dict = Depends(require_role("member")),
):
    """GET version of knowledge base search (convenient for testing)."""
    service = DocumentService(db)
    try:
        results = await service.search_knowledge_base(
            workspace_id=workspace_id,
            query=query,
            top_k=top_k,
            source_id=source_id,
        )

        return SearchResponse(
            query=query,
            results=[
                SearchResult(
                    chunk_id=r["chunk_id"],
                    source_id=r["source_id"],
                    content=r["content"],
                    chunk_index=r["chunk_index"],
                    similarity=r["similarity"],
                    metadata=r.get("metadata"),
                )
                for r in results
            ],
            total_results=len(results),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {e}")
