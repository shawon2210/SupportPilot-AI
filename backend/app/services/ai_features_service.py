"""SupportPilot AI — AI Features Service

Enterprise AI capabilities:
- Ticket classification and auto-tagging
- Escalation engine (confidence-based human routing)
- Suggested replies for agents
- Knowledge gap detection
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.factory import ProviderFactory
from app.ai.providers.base import ChatMessage, ChatRequest, MessageRole
from app.config import get_settings
from app.core.security import generate_uuid
from app.models.knowledge_gap import KnowledgeGap
from app.models.message import Message
from app.models.workspace import Workspace
from app.services.base import BaseService

logger = logging.getLogger("supportpilot.ai_features")


@dataclass
class TicketClassification:
    """Result of ticket classification."""
    category: str
    priority: str  # low, medium, high, urgent
    tags: list[str]
    confidence: float
    summary: str
    suggested_response: str | None = None


@dataclass
class EscalationResult:
    """Result of escalation check."""
    should_escalate: bool
    confidence: float
    reason: str
    suggested_agent: str | None = None


@dataclass
class SuggestedReply:
    """A suggested reply for an agent."""
    content: str
    confidence: float
    sources: list[dict] = field(default_factory=list)


# ── Classification Categories ──────────────────────────────────────

TICKET_CATEGORIES = [
    "billing",
    "technical",
    "feature_request",
    "bug_report",
    "sales",
    "account",
    "general",
]

PRIORITY_LEVELS = ["low", "medium", "high", "urgent"]

# ── Escalation Threshold ───────────────────────────────────────────

ESCALATION_CONFIDENCE_THRESHOLD = 0.70  # Below 70% confidence = escalate


class AIFeaturesService(BaseService[Message]):
    """
    Enterprise AI features for support ticket management.
    
    Usage:
        service = AIFeaturesService(db)
        
        # Classify a ticket
        classification = await classifify_ticket("I was charged twice for my subscription")
        
        # Check if escalation is needed
        escalation = await check_escalation(workspace_id, chat_id, confidence=0.55)
        
        # Get suggested reply
        reply = await get_suggested_reply(workspace_id, chat_id, user_message)
        
        # Detect knowledge gaps
        gaps = await detect_knowledge_gaps(workspace_id)
    """

    # ── System Prompts ───────────────────────────────────────────────

    CLASSIFY_PROMPT = """You are a support ticket classifier. Analyze the customer message and classify it.

Categories: {categories}
Priorities: {priorities}

Respond in JSON format:
{{
    "category": "<category>",
    "priority": "<priority>",
    "tags": ["tag1", "tag2"],
    "confidence": <0.0-1.0>,
    "summary": "<one sentence summary>"
}}

Customer message:
{message}"""

    SUGGEST_REPLY_PROMPT = """You are a customer support agent assistant. Based on the knowledge base context and conversation history, suggest a helpful reply.

Knowledge base context:
{context}

Conversation history:
{history}

Latest customer message:
{message}

Respond in JSON format:
{{
    "suggested_reply": "<the suggested response>",
    "confidence": <0.0-1.0>
}}"""

    def __init__(self, db: AsyncSession):
        super().__init__(db)
        self.settings = get_settings()

    # ── Ticket Classification ────────────────────────────────────────

    async def classify_ticket(self, message: str) -> TicketClassification:
        """
        Classify a support ticket by category, priority, and tags.
        
        Args:
            message: The customer's message text
            
        Returns:
            TicketClassification with category, priority, tags, confidence, summary
        """
        provider = ProviderFactory.create()

        prompt = self.CLASSIFY_PROMPT.format(
            categories=", ".join(TICKET_CATEGORIES),
            priorities=", ".join(PRIORITY_LEVELS),
            message=message,
        )

        request = ChatRequest(
            messages=[ChatMessage(role=MessageRole.USER, content=prompt)],
            temperature=0.3,  # Low temperature for consistent classification
            max_tokens=512,
        )

        try:
            response = await provider.chat_complete(request)
            result = self._parse_json_response(response.content)

            return TicketClassification(
                category=result.get("category", "general"),
                priority=result.get("priority", "medium"),
                tags=result.get("tags", []),
                confidence=float(result.get("confidence", 0.5)),
                summary=result.get("summary", message[:100]),
            )
        except Exception as e:
            logger.error("Ticket classification failed: %s", e)
            return TicketClassification(
                category="general",
                priority="medium",
                tags=[],
                confidence=0.0,
                summary=message[:100],
            )

    # ── Escalation Engine ────────────────────────────────────────────

    async def check_escalation(
        self,
        workspace_id: str,
        chat_id: str,
        confidence: float,
        recent_messages: list[dict] | None = None,
    ) -> EscalationResult:
        """
        Determine if a conversation should be escalated to a human agent.
        
        Escalation triggers:
        - AI confidence below threshold (default 70%)
        - Customer frustration detected
        - Complex technical issue
        - Billing dispute
        
        Args:
            workspace_id: Workspace ID
            chat_id: Chat session ID
            confidence: The AI's confidence in its last response
            recent_messages: Optional recent conversation context
            
        Returns:
            EscalationResult with decision and reason
        """
        # Check confidence threshold
        if confidence < ESCALATION_CONFIDENCE_THRESHOLD:
            return EscalationResult(
                should_escalate=True,
                confidence=confidence,
                reason=f"AI confidence ({confidence:.0%}) below threshold ({ESCALATION_CONFIDENCE_THRESHOLD:.0%})",
            )

        # Check for frustration keywords in recent messages
        if recent_messages:
            frustration_keywords = [
                "frustrated", "angry", "terrible", "worst", "cancel",
                "refund", "lawsuit", "complaint", "manager", "supervisor",
                "useless", "broken", "unacceptable",
            ]
            for msg in recent_messages[-3:]:  # Check last 3 messages
                content = msg.get("content", "").lower()
                if any(kw in content for kw in frustration_keywords):
                    return EscalationResult(
                        should_escalate=True,
                        confidence=confidence,
                        reason="Customer frustration detected in recent messages",
                    )

        return EscalationResult(
            should_escalate=False,
            confidence=confidence,
            reason="Within acceptable confidence range",
        )

    # ── Suggested Replies ────────────────────────────────────────────

    async def get_suggested_reply(
        self,
        workspace_id: str,
        chat_id: str,
        user_message: str,
        conversation_history: list[dict] | None = None,
        knowledge_context: str | None = None,
    ) -> SuggestedReply | None:
        """
        Generate a suggested reply for a support agent.
        
        Uses RAG context + conversation history to suggest a response.
        The agent can accept, modify, or ignore the suggestion.
        
        Args:
            workspace_id: Workspace ID
            chat_id: Chat session ID
            user_message: The customer's latest message
            conversation_history: Recent conversation history
            knowledge_context: Retrieved knowledge base chunks
            
        Returns:
            SuggestedReply or None if generation fails
        """
        provider = ProviderFactory.create()

        history_text = ""
        if conversation_history:
            for msg in conversation_history[-5:]:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                history_text += f"{role}: {content}\n"

        context_text = knowledge_context or "No relevant context found."

        prompt = self.SUGGEST_REPLY_PROMPT.format(
            context=context_text,
            history=history_text or "No prior conversation.",
            message=user_message,
        )

        request = ChatRequest(
            messages=[ChatMessage(role=MessageRole.USER, content=prompt)],
            temperature=0.5,
            max_tokens=1024,
        )

        try:
            response = await provider.chat_complete(request)
            result = self._parse_json_response(response.content)

            return SuggestedReply(
                content=result.get("suggested_reply", ""),
                confidence=float(result.get("confidence", 0.5)),
            )
        except Exception as e:
            logger.error("Suggested reply generation failed: %s", e)
            return None

    # ── Knowledge Gap Detection ──────────────────────────────────────

    async def detect_knowledge_gaps(
        self,
        workspace_id: str,
        min_occurrences: int = 3,
        days: int = 7,
    ) -> list[dict]:
        """
        Detect knowledge gaps in a workspace.
        
        Analyzes recent conversations to find questions that:
        - Had low confidence scores
        - Were asked multiple times
        - Couldn't be answered from the knowledge base
        
        Args:
            workspace_id: Workspace to analyze
            min_occurrences: Minimum occurrences to flag as a gap
            days: Number of days to look back
            
        Returns:
            List of knowledge gap records
        """
        start_date = datetime.utcnow() - timedelta(days=days)

        # Find messages with low confidence scores in metadata
        stmt = select(Message).where(
            Message.workspace_id == workspace_id,
            Message.role == "assistant",
            Message.created_at >= start_date,
            Message.metadata_.isnot(None),
        ).order_by(Message.created_at.desc()).limit(200)

        result = await self.db.execute(stmt)
        messages = list(result.scalars().all())

        # Extract low-confidence responses
        low_confidence_queries: dict[str, int] = {}
        for msg in messages:
            try:
                meta = json.loads(msg.metadata_ or "{}")
                sources_count = meta.get("sources_count", 0)
                rag_used = meta.get("rag_used", False)

                # If RAG was used but no sources found, it's a potential gap
                if rag_used and sources_count == 0:
                    # Find the preceding user message
                    user_msg_stmt = select(Message).where(
                        Message.chat_id == msg.chat_id,
                        Message.role == "user",
                        Message.created_at < msg.created_at,
                    ).order_by(Message.created_at.desc()).limit(1)
                    user_result = await self.db.execute(user_msg_stmt)
                    user_msg = user_result.scalar_one_or_none()
                    if user_msg:
                        query = user_msg.content.strip()[:200]
                        low_confidence_queries[query] = low_confidence_queries.get(query, 0) + 1
            except (json.JSONDecodeError, TypeError):
                continue

        # Filter by minimum occurrences
        gaps = []
        for query, count in low_confidence_queries.items():
            if count >= min_occurrences:
                # Check if this gap already exists
                existing = await self._find_existing_gap(workspace_id, query)
                if existing:
                    existing.occurrence_count = count
                    existing.updated_at = datetime.utcnow()
                else:
                    gap = KnowledgeGap(
                        id=generate_uuid(),
                        workspace_id=workspace_id,
                        query=query,
                        occurrence_count=count,
                        confidence_score=0.0,
                        status="open",
                        suggested_action="Add content to knowledge base addressing this topic",
                    )
                    self.db.add(gap)
                    gaps.append({
                        "query": query,
                        "occurrences": count,
                        "status": "new",
                    })

        await self.db.flush()
        return gaps

    async def _find_existing_gap(self, workspace_id: str, query: str) -> KnowledgeGap | None:
        """Find an existing knowledge gap for a similar query."""
        stmt = select(KnowledgeGap).where(
            KnowledgeGap.workspace_id == workspace_id,
            KnowledgeGap.status == "open",
        )
        result = await self.db.execute(stmt)
        gaps = list(result.scalars().all())

        # Simple exact match — in production, use fuzzy matching
        for gap in gaps:
            if gap.query.lower().strip() == query.lower().strip():
                return gap
        return None

    async def get_knowledge_gaps(
        self,
        workspace_id: str,
        status: str | None = None,
        min_occurrences: int = 1,
        offset: int = 0,
        limit: int = 50,
    ) -> list[KnowledgeGap]:
        """Get knowledge gaps for a workspace."""
        stmt = select(KnowledgeGap).where(
            KnowledgeGap.workspace_id == workspace_id,
            KnowledgeGap.occurrence_count >= min_occurrences,
        )
        if status:
            stmt = stmt.where(KnowledgeGap.status == status)

        stmt = stmt.order_by(KnowledgeGap.occurrence_count.desc())
        stmt = stmt.offset(offset).limit(limit)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def resolve_knowledge_gap(
        self,
        workspace_id: str,
        gap_id: str,
        resolved_by: str,
        notes: str | None = None,
    ) -> KnowledgeGap:
        """Mark a knowledge gap as resolved."""
        stmt = select(KnowledgeGap).where(
            KnowledgeGap.id == gap_id,
            KnowledgeGap.workspace_id == workspace_id,
        )
        result = await self.db.execute(stmt)
        gap = result.scalar_one_or_none()
        if not gap:
            from app.core.exceptions import NotFoundError
            raise NotFoundError("KnowledgeGap", gap_id)

        gap.status = "resolved"
        gap.resolved_by = resolved_by
        gap.resolution_notes = notes
        await self.db.flush()
        return gap

    # ── Helpers ──────────────────────────────────────────────────────

    def _parse_json_response(self, content: str) -> dict:
        """Parse JSON from LLM response, handling markdown code blocks."""
        content = content.strip()
        if content.startswith("```"):
            # Remove markdown code block
            lines = content.split("\n")
            content = "\n".join(lines[1:-1])
        return json.loads(content)
