"""
SupportPilot AI — Demo Dataset Generator
========================================
Creates a realistic "Acme Corp" demo workspace with:
- Team members with different roles
- Documents (Employee Handbook, Refund Policy, Technical Docs)
- Knowledge sources (websites, FAQs)
- Sample conversations (support tickets, FAQ queries)
- Analytics data (usage metrics)
- Chat history with messages

Run: cd backend && python -m scripts.demo_data
"""

from __future__ import annotations

import asyncio
import json
import random
from datetime import datetime, timedelta

from app.core.database import async_session_factory, engine, Base
from app.core.security import generate_uuid
from app.models.user import User
from app.models.workspace import Workspace, WorkspacePlan
from app.models.member import WorkspaceMember, WorkspaceRole
from app.models.widget_config import WidgetConfig
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.knowledge_source import KnowledgeSource, KnowledgeSourceType, KnowledgeSourceStatus
from app.models.document_chunk import DocumentChunk
from app.models.chat import Chat, ChatStatus
from app.models.message import Message, MessageRole
from app.models.usage_metric import UsageMetric


# ── Demo Data ────────────────────────────────────────────────

DEMO_USERS = [
    {"email": "sarah@acme-corp.com", "first_name": "Sarah", "last_name": "Chen", "role": WorkspaceRole.OWNER},
    {"email": "mike@acme-corp.com", "first_name": "Mike", "last_name": "Johnson", "role": WorkspaceRole.ADMIN},
    {"email": "priya@acme-corp.com", "first_name": "Priya", "last_name": "Patel", "role": WorkspaceRole.AGENT},
    {"email": "james@acme-corp.com", "first_name": "James", "last_name": "Wilson", "role": WorkspaceRole.MEMBER},
    {"email": "lisa@acme-corp.com", "first_name": "Lisa", "last_name": "Martinez", "role": WorkspaceRole.AGENT},
]

DEMO_DOCUMENTS = [
    {
        "name": "Employee Handbook 2026.pdf",
        "source_type": DocumentType.PDF,
        "mime_type": "application/pdf",
        "file_size": 2_450_000,
        "status": DocumentStatus.READY,
        "metadata": {"title": "Employee Handbook 2026", "pages": 42},
    },
    {
        "name": "Refund Policy.md",
        "source_type": DocumentType.MARKDOWN,
        "mime_type": "text/markdown",
        "file_size": 8_500,
        "status": DocumentStatus.READY,
        "metadata": {"title": "Refund & Return Policy", "version": "3.2"},
    },
    {
        "name": "Technical Documentation.docx",
        "source_type": DocumentType.DOCX,
        "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "file_size": 5_120_000,
        "status": DocumentStatus.READY,
        "metadata": {"title": "API Technical Documentation", "version": "2.1"},
    },
    {
        "name": "FAQ.txt",
        "source_type": DocumentType.TXT,
        "mime_type": "text/plain",
        "file_size": 12_300,
        "status": DocumentStatus.READY,
        "metadata": {"title": "Frequently Asked Questions"},
    },
    {
        "name": "Shipping Guide.pdf",
        "source_type": DocumentType.PDF,
        "mime_type": "application/pdf",
        "file_size": 1_800_000,
        "status": DocumentStatus.READY,
        "metadata": {"title": "International Shipping Guide", "region": "global"},
    },
]

DEMO_KNOWLEDGE = [
    {"name": "Acme Corp Help Center", "url": "https://help.acme-corp.com", "type": KnowledgeSourceType.WEBSITE},
    {"name": "Product Documentation", "url": "https://docs.acme-corp.com", "type": KnowledgeSourceType.WEBSITE},
    {"name": "API Reference", "url": "https://api.acme-corp.com/docs", "type": KnowledgeSourceType.WEBSITE},
]

DEMO_CHATS = [
    {
        "title": "Refund Request #1042",
        "messages": [
            {"role": MessageRole.USER, "content": "Hi, I placed an order last week and received a damaged product. I'd like a full refund."},
            {"role": MessageRole.ASSISTANT, "content": "I'm sorry to hear about the damaged product! Let me help you with that.\n\nBased on our Refund Policy, you're eligible for a full refund if the product arrived damaged. Here's what I need:\n\n1. Your order number\n2. A photo of the damaged item (if possible)\n\nOnce I have your order number, I can initiate the refund process immediately. Refunds typically take 3-5 business days to appear on your statement."},
            {"role": MessageRole.USER, "content": "My order number is ACM-2026-58192. I can send a photo later."},
            {"role": MessageRole.ASSISTANT, "content": "Thank you! I found your order ACM-2026-58192. I've initiated a full refund of $89.99 to your original payment method (Visa ending in 4242).\n\n**Refund Details:**\n- Amount: $89.99\n- Processing time: 3-5 business days\n- Refund ID: REF-2026-001042\n\nThe photo isn't required for damaged items — your request has been processed as a priority case. Is there anything else I can help you with?"},
        ],
    },
    {
        "title": "API Integration Question",
        "messages": [
            {"role": MessageRole.USER, "content": "I'm trying to integrate with your API but getting a 401 error. My key is sk_live_xxx."},
            {"role": MessageRole.ASSISTANT, "content": "Let me help you with the authentication issue!\n\nA 401 error typically means your API key isn't being sent correctly. According to our Technical Documentation, you need to include the key in the Authorization header:\n\n```\ncurl -H \"Authorization: Bearer sk_live_your_key\" \\\n  https://api.acme-corp.com/v1/products\n```\n\nNote: Recent updates require the `v1` prefix in all API calls. Also, make sure you're using the_live_ key, not the test_ key, for production requests.\n\nWould you like me to walk through a specific endpoint?"},
            {"role": MessageRole.USER, "content": "That works! Now how do I handle rate limiting?"},
            {"role": MessageRole.ASSISTANT, "content": "Great question! Our API implements rate limiting to ensure fair usage:\n\n**Rate Limits by Plan:**\n- Starter: 100 requests/minute\n- Pro: 1,000 requests/minute\n- Enterprise: 10,000 requests/minute\n\n**Headers returned with every response:**\n- `X-RateLimit-Limit`: Your plan's limit\n- `X-RateLimit-Remaining`: Requests remaining\n- `X-RateLimit-Reset`: Unix timestamp when limit resets\n\n**Best practices:**\n1. Implement exponential backoff when you see 429 errors\n2. Use webhooks instead of polling where possible\n3. Cache frequently accessed data locally\n\nIf you need higher limits, you can upgrade your plan in the Billing section."},
        ],
    },
    {
        "title": "Shipping Delay Inquiry",
        "messages": [
            {"role": MessageRole.USER, "content": "My order was supposed to arrive yesterday but it's still showing 'in transit'. What's going on?"},
            {"role": MessageRole.ASSISTANT, "content": "I understand your concern about the delivery delay. Let me check our shipping policies for you.\n\nAccording to our International Shipping Guide:\n\n- **Standard shipping:** 7-14 business days\n- **Express shipping:** 3-5 business days\n- **Overnight shipping:** 1-2 business days\n\nSince your order is showing 'in transit,' it has left our warehouse and is with the carrier. Delays can happen due to:\n\n1. Weather conditions\n2. Customs clearance (international orders)\n3. Carrier volume peaks\n\n**What you can do now:**\n- Check your tracking number in the shipment confirmation email\n- Contact the carrier directly for real-time updates\n\nIf the package doesn't arrive within 48 hours of the expected date, we can open a trace request with the carrier. Would you like me to do that, or is there anything else I can help with?"},
        ],
    },
    {
        "title": "Account Access Issue",
        "messages": [
            {"role": MessageRole.USER, "content": "I can't log into my account. I tried resetting my password but never received the email."},
            {"role": MessageRole.ASSISTANT, "content": "I'm sorry you're having trouble accessing your account! Let me help you resolve this.\n\n**Common causes and solutions:**\n\n1. **Check spam/junk folder** — Password reset emails sometimes end up there\n2. **Email address mismatch** — Make sure you're using the same email you registered with\n3. **Email delivery delay** — Usually arrives within 2-5 minutes\n\n**Alternative approach:**\n- Try logging in with Google SSO if your account is linked\n- Check if Caps Lock is on (passwords are case-sensitive)\n- Clear your browser cache and try again\n\nIf none of these work, I can escalate this to our technical team for manual account recovery. Would you like me to do that? I'll need to verify your identity first with either:\n- Your billing address, OR\n- The last 4 digits of the card on file"},
        ],
    },
    {
        "title": "Product Feature Question",
        "messages": [
            {"role": MessageRole.USER, "content": "Does the Pro plan include custom AI model training? I need it for our specific industry terminology."},
            {"role": MessageRole.ASSISTANT, "content": "Yes! The Pro plan includes custom AI model training capabilities.\n\n**Pro Plan Features:**\n- Access to custom fine-tuning for industry-specific terminology\n- Dedicated model instance (shared across your workspace)\n- Full API access with 1,000 requests/minute\n- Priority support\n- Advanced analytics dashboard\n\n**Custom Model Training includes:**\n- Upload your domain-specific documents\n- Custom vocabulary and terminology recognition\n- Industry-specific response templates\n- Confidence scoring tuned to your domain\n\n**Pricing:**\n- Pro plan: $99/month (includes basic custom training)\n- Additional model training: $49/month per custom model\n- Enterprise: Unlimited custom models included\n\nWould you like me to set up a custom model training session, or would you prefer to upgrade your plan first?"},
        ],
    },
]


async def create_demo_data():
    """Generate full demo dataset."""
    
    print("🚀 Generating Acme Corp demo dataset...")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with async_session_factory() as session:
        # ── 1. Create Users ──────────────────────────
        users = []
        user_ids = []
        for u in DEMO_USERS:
            user = User(
                id=generate_uuid(),
                email=u["email"],
                first_name=u["first_name"],
                last_name=u["last_name"],
            )
            users.append(user)
            user_ids.append(user.id)
            session.add(user)
        await session.flush()
        print(f"  ✅ Created {len(users)} users")
        
        # ── 2. Create Workspace ─────────────────────
        ws_id = generate_uuid()
        workspace = Workspace(
            id=ws_id,
            name="Acme Corp",
            slug="acme-corp",
            plan=WorkspacePlan.PRO,
            plan_limits=json.dumps(WorkspacePlan.LIMITS.get(WorkspacePlan.PRO, {})),
        )
        session.add(workspace)
        await session.flush()
        print(f"  ✅ Created workspace: {workspace.name} ({ws_id})")
        
        # ── 3. Create Members ───────────────────────
        for user, u_data in zip(users, DEMO_USERS):
            member = WorkspaceMember(
                id=generate_uuid(),
                workspace_id=ws_id,
                user_id=user.id,
                role=u_data["role"],
                is_active=True,
            )
            session.add(member)
        await session.flush()
        print(f"  ✅ Created {len(users)} workspace members")
        
        # ── 4. Create Widget Config ─────────────────
        widget = WidgetConfig(
            id=generate_uuid(),
            workspace_id=ws_id,
            theme="light",
            primary_color="#3B82F6",
            greeting_message="Welcome to Acme Corp Support! How can I help you today?",
            placeholder_text="Type your question...",
            position="right",
            show_branding=True,
            is_active=True,
        )
        session.add(widget)
        await session.flush()
        print(f"  ✅ Created widget config")
        
        # ── 5. Create Subscription ──────────────────
        sub = Subscription(
            id=generate_uuid(),
            workspace_id=ws_id,
            plan="pro",
            status=SubscriptionStatus.ACTIVE,
        )
        session.add(sub)
        await session.flush()
        print(f"  ✅ Created subscription (Pro plan)")
        
        # Create Documents ─────────────────────
        chunks_created = 0
        for doc_data in DEMO_DOCUMENTS:
            # Create a knowledge source for each document
            ks = KnowledgeSource(
                id=generate_uuid(),
                workspace_id=ws_id,
                name=doc_data["name"],
                source_type=KnowledgeSourceType.PDF,
                status=KnowledgeSourceStatus.READY,
                metadata_=json.dumps(doc_data["metadata"]),
            )
            session.add(ks)
            await session.flush()
            
            # Create document chunks (simulate RAG indexing)
            num_chunks = random.randint(3, 8)
            for i in range(num_chunks):
                chunk = DocumentChunk(
                    id=generate_uuid(),
                    workspace_id=ws_id,
                    source_id=ks.id,
                    content=f"Sample content from {doc_data['name']} (chunk {i+1}/{num_chunks}). This document contains important information about Acme Corp's policies and procedures.",
                    chunk_index=i,
                    metadata=json.dumps({"source": doc_data["name"]}),
                )
                session.add(chunk)
                chunks_created += 1
        await session.flush()
        print(f"  ✅ Created {len(DEMO_DOCUMENTS)} documents ({chunks_created} chunks)")
        
        # ── 7. Create Knowledge Sources ─────────────
        for ks_data in DEMO_KNOWLEDGE:
            ks = KnowledgeSource(
                id=generate_uuid(),
                workspace_id=ws_id,
                name=ks_data["name"],
                source_type=KnowledgeSourceType.WEBSITE,
                status=KnowledgeSourceStatus.READY,
                url=ks_data["url"],
                metadata_=json.dumps({"crawl_depth": 3, "pages_crawled": random.randint(10, 45)}),
            )
            session.add(ks)
        await session.flush()
        print(f"  ✅ Created {len(DEMO_KNOWLEDGE)} knowledge sources")
        
        # ── 8. Create Chats with Messages ───────────
        for chat_data in DEMO_CHATS:
            chat = Chat(
                id=generate_uuid(),
                workspace_id=ws_id,
                user_id=users[0].id,  # Sarah Chen as the demo user
                title=chat_data["title"],
                status=ChatStatus.ACTIVE,
            )
            session.add(chat)
            await session.flush()
            
            for msg_data in chat_data["messages"]:
                msg = Message(
                    id=generate_uuid(),
                    chat_id=chat.id,
                    workspace_id=ws_id,
                    role=msg_data["role"],
                    content=msg_data["content"],
                    metadata_=json.dumps({"demo": True}),
                )
                session.add(msg)
        await session.flush()
        print(f"  ✅ Created {len(DEMO_CHATS)} chats with messages")
        
        # ── 9. Create Usage Metrics ─────────────────
        today = datetime.utcnow()
        metrics_created = 0
        
        for days_ago in range(30):
            date = today - timedelta(days=days_ago)
            
            # Messages sent
            metric = UsageMetric(
                id=generate_uuid(),
                workspace_id=ws_id,
                metric_name="messages_sent",
                metric_value=random.randint(15, 200),
            )
            session.add(metric)
            metrics_created += 1
            
            # Documents uploaded
            if days_ago % 3 == 0:
                metric = UsageMetric(
                    id=generate_uuid(),
                    workspace_id=ws_id,
                    metric_name="documents_uploaded",
                    metric_value=random.randint(1, 5),
                )
                session.add(metric)
                metrics_created += 1
            
            # Searches
            metric = UsageMetric(
                id=generate_uuid(),
                workspace_id=ws_id,
                metric_name="searches",
                metric_value=random.randint(10, 80),
            )
            session.add(metric)
            metrics_created += 1
            
            # Token usage
            metric = UsageMetric(
                id=generate_uuid(),
                workspace_id=ws_id,
                metric_name="tokens_used",
                metric_value=random.randint(5000, 45000),
            )
            session.add(metric)
            metrics_created += 1
        
        await session.flush()
        print(f"  ✅ Created {metrics_created} usage metrics (30 days)")
        
        await session.commit()
    
    print("\n🎉 Demo dataset generated successfully!")
    print(f"   Workspace: Acme Corp / acme-corp ({ws_id})")
    print(f"   Users: {len(DEMO_USERS)} (1 owner, 1 admin, 2 agents, 1 member)")
    print(f"   Documents: {len(DEMO_DOCUMENTS)} files")
    print(f"   Knowledge Sources: {len(DEMO_KNOWLEDGE)} websites")
    print(f"   Conversations: {len(DEMO_CHATS)} chats")
    print(f"   Metrics: 30 days of analytics data")
    print(f"\n   Login as: sarah@acme-corp.com (Owner)")


if __name__ == "__main__":
    asyncio.run(create_demo_data())
