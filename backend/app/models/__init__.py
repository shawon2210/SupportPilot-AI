"""SupportPilot AI — Models Package"""

from app.models.api_key import ApiKey
from app.models.audit_log import AuditLog
from app.models.canned_response import CannedResponse
from app.models.chat import Chat, ChatMode, ChatStatus
from app.models.chat_tag import ChatTag
from app.models.conversation_rating import ConversationRating
from app.models.document_chunk import DocumentChunk
from app.models.knowledge_gap import KnowledgeGap
from app.models.knowledge_source import (
    KnowledgeSource,
    KnowledgeSourceStatus,
    KnowledgeSourceType,
)
from app.models.member import WorkspaceMember, WorkspaceRole
from app.models.message import Message, MessageRole
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.usage_metric import UsageMetric
from app.models.user import User
from app.models.webhook import Webhook, WebhookEvent
from app.models.widget_config import WidgetConfig
from app.models.workspace import Workspace, WorkspacePlan

__all__ = [
    "ApiKey",
    "AuditLog",
    "CannedResponse",
    "Chat",
    "ChatMode",
    "ChatStatus",
    "ChatTag",
    "ConversationRating",
    "DocumentChunk",
    "KnowledgeGap",
    "KnowledgeSource",
    "KnowledgeSourceStatus",
    "KnowledgeSourceType",
    "Message",
    "MessageRole",
    "Subscription",
    "SubscriptionStatus",
    "UsageMetric",
    "User",
    "Webhook",
    "WebhookEvent",
    "WidgetConfig",
    "Workspace",
    "WorkspaceMember",
    "WorkspacePlan",
    "WorkspaceRole",
]
