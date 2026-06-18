"""SupportPilot AI — AI Features Endpoints

Enterprise AI capabilities:
- Ticket classification
- Escalation checks
- Suggested replies
- Knowledge gap detection
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.services.ai_features_service import AIFeaturesService

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────

class ClassifyRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)


class ClassifyResponse(BaseModel):
    category: str
    priority: str
    tags: list[str]
    confidence: float
    summary: str


class EscalationCheckRequest(BaseModel):
    chat_id: str
    confidence: float = Field(..., ge=0.0, le=1.0)


class EscalationCheckResponse(BaseModel):
    should_escalate: bool
    confidence: float
    reason: str


class SuggestedReplyRequest(BaseModel):
    chat_id: str
    user_message: str = Field(..., min_length=1, max_length=5000)


class SuggestedReplyResponse(BaseModel):
    content: str
    confidence: float


class KnowledgeGapResponse(BaseModel):
    id: str
    query: str
    occurrence_count: int
    status: str
    suggested_action: str | None
    created_at: str


# ── Endpoints ──────────────────────────────────────────────────────

@router.post("/classify", response_model=ClassifyResponse)
async def classify_ticket(
    workspace_id: str,
    data: ClassifyRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Classify a support ticket by category, priority, and tags.
    
    Returns AI-determined classification with confidence score.
    """
    service = AIFeaturesService(db)
    result = await service.classify_ticket(data.message)
    return ClassifyResponse(
        category=result.category,
        priority=result.priority,
        tags=result.tags,
        confidence=result.confidence,
        summary=result.summary,
    )


@router.post("/escalation-check", response_model=EscalationCheckResponse)
async def check_escalation(
    workspace_id: str,
    data: EscalationCheckRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Check if a conversation should be escalated to a human agent.
    
    Escalation triggers:
    - AI confidence below 70%
    - Customer frustration detected
    - Complex issue requiring human intervention
    """
    service = AIFeaturesService(db)
    result = await service.check_escalation(
        workspace_id=workspace_id,
        chat_id=data.chat_id,
        confidence=data.confidence,
    )
    return EscalationCheckResponse(
        should_escalate=result.should_escalate,
        confidence=result.confidence,
        reason=result.reason,
    )


@router.post("/suggested-reply", response_model=SuggestedReplyResponse)
async def get_suggested_reply(
    workspace_id: str,
    data: SuggestedReplyRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get an AI-suggested reply for a support agent.
    
    The agent can accept, modify, or ignore the suggestion.
    Uses RAG context + conversation history.
    """
    service = AIFeaturesService(db)
    result = await service.get_suggested_reply(
        workspace_id=workspace_id,
        chat_id=data.chat_id,
        user_message=data.user_message,
    )
    if not result:
        raise HTTPException(status_code=500, detail="Failed to generate suggested reply")
    return SuggestedReplyResponse(
        content=result.content,
        confidence=result.confidence,
    )


@router.post("/knowledge-gaps/detect")
async def detect_knowledge_gaps(
    workspace_id: str,
    min_occurrences: int = Query(3, ge=1, le=100),
    days: int = Query(7, ge=1, le=90),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze recent conversations to detect knowledge gaps.
    
    Finds questions that the AI couldn't answer well from the knowledge base.
    These gaps indicate areas where the knowledge base needs improvement.
    """
    service = AIFeaturesService(db)
    gaps = await service.detect_knowledge_gaps(
        workspace_id=workspace_id,
        min_occurrences=min_occurrences,
        days=days,
    )
    return {"success": True, "data": gaps, "count": len(gaps)}


@router.get("/knowledge-gaps", response_model=list[KnowledgeGapResponse])
async def list_knowledge_gaps(
    workspace_id: str,
    status: str | None = Query(None, description="Filter by status: open, resolved, ignored"),
    min_occurrences: int = Query(1, ge=1),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List knowledge gaps for a workspace."""
    service = AIFeaturesService(db)
    gaps = await service.get_knowledge_gaps(
        workspace_id=workspace_id,
        status=status,
        min_occurrences=min_occurrences,
    )
    return [
        KnowledgeGapResponse(
            id=gap.id,
            query=gap.query,
            occurrence_count=gap.occurrence_count,
            status=gap.status,
            suggested_action=gap.suggested_action,
            created_at=gap.created_at.isoformat() if gap.created_at else None,
        )
        for gap in gaps
    ]


@router.post("/knowledge-gaps/{gap_id}/resolve")
async def resolve_knowledge_gap(
    workspace_id: str,
    gap_id: str,
    notes: str | None = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a knowledge gap as resolved."""
    service = AIFeaturesService(db)
    gap = await service.resolve_knowledge_gap(
        workspace_id=workspace_id,
        gap_id=gap_id,
        resolved_by=current_user["id"],
        notes=notes,
    )
    return {"success": True, "data": {"id": gap.id, "status": gap.status}}
