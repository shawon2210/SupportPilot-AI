"""SupportPilot AI — Chat Service with RAG Pipeline

Orchestrates the full chat flow:
1. Retrieve conversation history
2. Search knowledge base for relevant context (RAG)
3. Build augmented prompt with retrieved chunks
4. Stream LLM response
5. Store message with source citations
6. Track token usage

Design: The chat service is AI-provider-agnostic. It uses the ProviderFactory
to get the configured provider and the DocumentService for RAG retrieval.
"""

from __future__ import annotations

import json
import logging
from collections.abc import AsyncGenerator
from dataclasses import dataclass, field
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.factory import ProviderFactory
from app.ai.providers.base import ChatMessage, ChatRequest, MessageRole
from app.config import get_settings
from app.core.security import generate_uuid
from app.models.chat import Chat, ChatStatus
from app.models.message import Message, MessageRole as MsgRole
from app.repositories.base import TenantRepository
from app.services.base import BaseService
from app.services.document_service import DocumentService

logger = logging.getLogger("supportpilot.chat")


@dataclass
class ChatContext:
    """Context for a chat request including RAG retrieval results."""
    messages: list[ChatMessage]
    retrieved_chunks: list[dict] = field(default_factory=list)
    system_prompt: str = ""
    workspace_id: str = ""
    chat_id: str = ""


@dataclass
class ChatMessageResult:
    """Result of sending a chat message."""
    user_message: Message
    assistant_message: Message
    sources: list[dict] = field(default_factory=list)
    tokens_used: int = 0


class ChatService(BaseService[Chat]):
    """
    Service for chat conversation management with RAG.
    
    Usage:
        service = ChatService(db)
        chat = await service.create_chat(workspace_id, user_id, "Billing question")
        result = await service.send_message(workspace_id, chat.id, "How do I cancel?")
        
        # Or for streaming:
        async for chunk in service.stream_message(workspace_id, chat.id, "How do I cancel?"):
            print(chunk, end="", flush=True)
    """

    # Default system prompt template — can be customized per workspace
    DEFAULT_SYSTEM_PROMPT = """You are a helpful customer support assistant. Use the following context to answer the user's question accurately and concisely.

Context from knowledge base:
{context}

Instructions:
- Base your answer ONLY on the provided context
- If the context doesn't contain the answer, say "I don't have that information in my knowledge base"
- Be concise and helpful
- If relevant, mention the source of your information
- Do not make up information not in the context"""

    def __init__(self, db: AsyncSession):
        super().__init__(db)
        self.document_service = DocumentService(db)
        self.settings = get_settings()

    # ── Chat CRUD ──────────────────────────────────────────────────

    async def create_chat(
        self,
        workspace_id: str,
        user_id: str | None = None,
        title: str | None = None,
    ) -> Chat:
        """Create a new chat session."""
        chat = Chat(
            id=self._generate_id(),
            workspace_id=workspace_id,
            user_id=user_id,
            title=title or self._generate_title(),
            status=ChatStatus.ACTIVE,
        )
        self.db.add(chat)
        await self.db.flush()
        await self.db.refresh(chat)
        logger.info("Created chat %s in workspace %s", chat.id, workspace_id)
        return chat

    async def get_chat(
        self,
        workspace_id: str,
        chat_id: str,
    ) -> Chat:
        """Get a chat with all its messages."""
        from app.repositories.base import TenantRepository
        repo = TenantRepository(Chat, self.db)
        return await repo.get_by_workspace_or_404(workspace_id, chat_id)

    async def list_chats(
        self,
        workspace_id: str,
        *,
        status: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> list[Chat]:
        """List chats in a workspace."""
        stmt = select(Chat).where(Chat.workspace_id == workspace_id)
        if status:
            stmt = stmt.where(Chat.status == status)
        stmt = stmt.order_by(Chat.updated_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update_chat(
        self,
        workspace_id: str,
        chat_id: str,
        title: str | None = None,
        status: str | None = None,
    ) -> Chat:
        """Update chat metadata."""
        chat = await self.get_chat(workspace_id, chat_id)
        if title is not None:
            chat.title = title
        if status is not None:
            chat.status = status
        await self.db.flush()
        return chat

    async def delete_chat(
        self,
        workspace_id: str,
        chat_id: str,
    ) -> None:
        """Delete a chat and all its messages."""
        chat = await self.get_chat(workspace_id, chat_id)
        await self.db.delete(chat)
        await self.db.flush()

    # ── Message Handling ───────────────────────────────────────────

    async def send_message(
        self,
        workspace_id: str,
        chat_id: str,
        content: str,
        *,
        use_rag: bool = True,
        source_id: str | None = None,
    ) -> ChatMessageResult:
        """
        Send a message and get a complete (non-streaming) response.
        
        Args:
            workspace_id: Workspace ID
            chat_id: Chat session ID
            content: User message text
            use_rag: Whether to retrieve context from knowledge base
            source_id: Optional source ID to limit RAG search
            
        Returns:
            ChatMessageResult with both user and assistant messages
        """
        # Verify chat exists and is active
        chat = await self.get_chat(workspace_id, chat_id)
        if chat.status != ChatStatus.ACTIVE:
            raise ChatError(f"Chat is {chat.status}. Cannot send messages.")

        # Store user message
        user_message = Message(
            id=self._generate_id(),
            chat_id=chat_id,
            workspace_id=workspace_id,
            role=MsgRole.USER,
            content=content,
        )
        self.db.add(user_message)
        await self.db.flush()

        # Build context
        context = await self._build_context(
            workspace_id=workspace_id,
            chat_id=chat_id,
            user_message=content,
            use_rag=use_rag,
            source_id=source_id,
        )

        # Get LLM response
        provider = ProviderFactory.create()
        request = ChatRequest(
            messages=context.messages,
            temperature=0.7,
            max_tokens=2048,
        )

        try:
            response = await provider.chat_complete(request)
        except Exception as e:
            logger.error("LLM request failed: %s", e)
            raise ChatError(f"AI provider error: {e}") from e

        # Store assistant message with sources
        assistant_message = Message(
            id=self._generate_id(),
            chat_id=chat_id,
            workspace_id=workspace_id,
            role=MsgRole.ASSISTANT,
            content=response.content,
            sources=json.dumps(context.retrieved_chunks),
            tokens_used=response.usage.get("total_tokens", 0),
            metadata_=json.dumps({
                "model": response.model,
                "finish_reason": response.finish_reason,
                "rag_used": use_rag,
                "sources_count": len(context.retrieved_chunks),
            }),
        )
        self.db.add(assistant_message)
        await self.db.flush()

        # Track usage
        await self._track_usage(workspace_id, "messages", 2)
        await self._track_usage(workspace_id, "tokens", response.usage.get("total_tokens", 0))

        return ChatMessageResult(
            user_message=user_message,
            assistant_message=assistant_message,
            sources=context.retrieved_chunks,
            tokens_used=response.usage.get("total_tokens", 0),
        )

    async def stream_message(
        self,
        workspace_id: str,
        chat_id: str,
        content: str,
        *,
        use_rag: bool = True,
        source_id: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """
        Send a message and stream the response (SSE).
        
        Yields content chunks as they arrive from the LLM.
        Stores the complete message when done.
        
        Usage:
            async for chunk in service.stream_message(ws_id, chat_id, "Hello"):
                yield f"data: {chunk}\n\n"
        """
        # Verify chat
        chat = await self.get_chat(workspace_id, chat_id)
        if chat.status != ChatStatus.ACTIVE:
            raise ChatError(f"Chat is {chat.status}. Cannot send messages.")

        # Store user message
        user_message = Message(
            id=self._generate_id(),
            chat_id=chat_id,
            workspace_id=workspace_id,
            role=MsgRole.USER,
            content=content,
        )
        self.db.add(user_message)
        await self.db.flush()

        # Build context
        context = await self._build_context(
            workspace_id=workspace_id,
            chat_id=chat_id,
            user_message=content,
            use_rag=use_rag,
            source_id=source_id,
        )

        # Stream LLM response
        provider = ProviderFactory.create()
        request = ChatRequest(
            messages=context.messages,
            temperature=0.7,
            max_tokens=2048,
            stream=True,
        )

        full_content = ""
        model = ""
        total_tokens = 0

        try:
            async for chunk in provider.chat_complete_stream(request):
                full_content += chunk
                yield chunk
        except Exception as e:
            logger.error("LLM streaming failed: %s", e)
            raise ChatError(f"AI provider streaming error: {e}") from e

        # Store the complete assistant message
        assistant_message = Message(
            id=self._generate_id(),
            chat_id=chat_id,
            workspace_id=workspace_id,
            role=MsgRole.ASSISTANT,
            content=full_content,
            sources=json.dumps(context.retrieved_chunks),
            tokens_used=total_tokens,
            metadata_=json.dumps({
                "model": provider.get_default_model(),
                "rag_used": use_rag,
                "sources_count": len(context.retrieved_chunks),
                "streamed": True,
            }),
        )
        self.db.add(assistant_message)
        await self.db.flush()

        # Track usage
        await self._track_usage(workspace_id, "messages", 2)

    # ── Context Building (RAG) ─────────────────────────────────────

    async def _build_context(
        self,
        workspace_id: str,
        chat_id: str,
        user_message: str,
        use_rag: bool = True,
        source_id: str | None = None,
    ) -> ChatContext:
        """
        Build the chat context including conversation history and RAG retrieval.
        
        Strategy:
        1. Get recent conversation history (last N messages)
        2. Search knowledge base for relevant chunks
        3. Build augmented system prompt with retrieved context
        4. Return complete message list for the LLM
        """
        messages: list[ChatMessage] = []
        retrieved_chunks: list[dict] = []

        # Step 1: Retrieve relevant context from knowledge base
        if use_rag:
            try:
                retrieved_chunks = await self.document_service.search_knowledge_base(
                    workspace_id=workspace_id,
                    query=user_message,
                    top_k=5,
                    source_id=source_id,
                )
            except Exception as e:
                logger.warning("RAG retrieval failed (continuing without): %s", e)

        # Step 2: Build system prompt with context
        system_prompt = self._build_system_prompt(retrieved_chunks)
        if system_prompt:
            messages.append(ChatMessage(role=MessageRole.SYSTEM, content=system_prompt))

        # Step 3: Add conversation history (last 10 messages to stay within context limits)
        history = await self._get_conversation_history(chat_id, workspace_id, limit=10)
        messages.extend(history)

        # Step 4: Add current user message
        messages.append(ChatMessage(role=MessageRole.USER, content=user_message))

        return ChatContext(
            messages=messages,
            retrieved_chunks=retrieved_chunks,
            system_prompt=system_prompt,
            workspace_id=workspace_id,
            chat_id=chat_id,
        )

    def _build_system_prompt(self, retrieved_chunks: list[dict]) -> str:
        """Build the system prompt with retrieved context."""
        if not retrieved_chunks:
            return self.DEFAULT_SYSTEM_PROMPT.format(
                context="No relevant context found in the knowledge base."
            )

        context_parts = []
        for i, chunk in enumerate(retrieved_chunks, 1):
            source_info = ""
            if chunk.get("metadata"):
                try:
                    meta = json.loads(chunk["metadata"]) if isinstance(chunk["metadata"], str) else chunk["metadata"]
                    if meta.get("filename"):
                        source_info = f" (Source: {meta['filename']})"
                    elif meta.get("url"):
                        source_info = f" (Source: {meta['url']})"
                except (json.JSONDecodeError, TypeError):
                    pass

            context_parts.append(f"[Excerpt {i}]{source_info}\n{chunk['content']}")

        context_text = "\n\n".join(context_parts)
        return self.DEFAULT_SYSTEM_PROMPT.format(context=context_text)

    async def _get_conversation_history(
        self,
        chat_id: str,
        workspace_id: str,
        limit: int = 10,
    ) -> list[ChatMessage]:
        """Get recent conversation history for context."""
        stmt = (
            select(Message)
            .where(
                Message.chat_id == chat_id,
                Message.workspace_id == workspace_id,
            )
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        messages = list(result.scalars().all())

        # Reverse to get chronological order
        messages.reverse()

        return [
            ChatMessage(role=msg.role, content=msg.content)
            for msg in messages
            if msg.role != MsgRole.SYSTEM  # Skip system messages in history
        ]

    # ── Usage Tracking ─────────────────────────────────────────────

    async def _track_usage(
        self,
        workspace_id: str,
        metric_name: str,
        value: int,
    ) -> None:
        """Track usage metrics for billing and analytics."""
        from app.models.usage_metric import UsageMetric

        metric = UsageMetric(
            id=self._generate_id(),
            workspace_id=workspace_id,
            metric_name=metric_name,
            metric_value=value,
        )
        self.db.add(metric)
        # Don't flush — let the outer transaction handle it

    # ── Helpers ────────────────────────────────────────────────────

    def _generate_title(self) -> str:
        """Generate a default chat title."""
        from datetime import datetime
        return f"Chat {datetime.now().strftime('%Y-%m-%d %H:%M')}"


class ChatError(Exception):
    """Raised when chat operations fail."""
    pass
