"""SupportPilot AI — Schemas Package"""

from app.schemas.base import (
    BaseSchema,
    ErrorDetail,
    ErrorResponse,
    PaginatedResponse,
    PaginationMeta,
    PaginationParams,
    ResponseEnvelope,
)
from app.schemas.chat import (
    ChatCreate,
    ChatResponse,
    ChatUpdate,
    ChatWithMessages,
    MessageCreate,
    MessageResponse,
)
from app.schemas.knowledge_source import KnowledgeSourceResponse
from app.schemas.member import MemberInvite, MemberResponse, MemberUpdate
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.schemas.widget import WidgetConfigResponse, WidgetConfigUpdate
from app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceDetailResponse,
    WorkspaceResponse,
    WorkspaceUpdate,
)

__all__ = [
    "BaseSchema",
    "ResponseEnvelope",
    "PaginatedResponse",
    "PaginationMeta",
    "PaginationParams",
    "ErrorResponse",
    "ErrorDetail",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "WorkspaceCreate",
    "WorkspaceUpdate",
    "WorkspaceResponse",
    "WorkspaceDetailResponse",
    "MemberInvite",
    "MemberUpdate",
    "MemberResponse",
    "KnowledgeSourceResponse",
    "ChatCreate",
    "ChatUpdate",
    "ChatResponse",
    "ChatWithMessages",
    "MessageCreate",
    "MessageResponse",
    "WidgetConfigUpdate",
    "WidgetConfigResponse",
]
