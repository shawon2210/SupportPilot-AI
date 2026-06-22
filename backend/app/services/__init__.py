"""SupportPilot AI — Services Package"""

from app.services.ai_features_service import AIFeaturesService
from app.services.analytics_service import AnalyticsService
from app.services.base import BaseService
from app.services.billing_service import BillingError, BillingService
from app.services.chat_service import ChatError, ChatService
from app.services.document_service import DocumentProcessingError, DocumentService
from app.services.embedding_service import (
    EmbeddingError,
    EmbeddingService,
    VectorStore,
    cosine_similarity,
)
from app.services.member_service import MemberService
from app.services.slack_service import SlackService
from app.services.text_chunking import Chunk, TextChunker
from app.services.text_extraction import (
    ExtractionError,
    TextExtractorFactory,
)
from app.services.usage_service import UsageService
from app.services.webhook_service import WebhookError, WebhookService
from app.services.website_crawler import CrawledPage, CrawlerError, WebsiteCrawler
from app.services.widget_service import WidgetService
from app.services.workspace_service import WorkspaceService

__all__ = [
    "AIFeaturesService",
    "AnalyticsService",
    "BaseService",
    "BillingError",
    "BillingService",
    "ChatError",
    "ChatService",
    "Chunk",
    "CrawledPage",
    "CrawlerError",
    "DocumentProcessingError",
    "DocumentService",
    "EmbeddingError",
    "EmbeddingService",
    "ExtractionError",
    "MemberService",
    "SlackService",
    "TextChunker",
    "TextExtractorFactory",
    "UsageService",
    "VectorStore",
    "WebhookError",
    "WebhookService",
    "WebsiteCrawler",
    "WidgetService",
    "WorkspaceService",
    "cosine_similarity",
]
