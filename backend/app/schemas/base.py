"""SupportPilot AI — Base Schemas"""

from __future__ import annotations

from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, field_serializer

T = TypeVar("T")


class BaseSchema(BaseModel):
    """Base schema with common configuration."""
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

    @field_serializer("created_at", "updated_at", check_fields=False)
    def serialize_datetime(self, value: datetime | None) -> str | None:
        if value is None:
            return None
        return value.isoformat()


class ResponseEnvelope(BaseSchema, Generic[T]):
    """Standard API response envelope."""
    success: bool = True
    data: T | None = None


class PaginatedResponse(BaseSchema, Generic[T]):
    """Paginated response envelope."""
    success: bool = True
    data: list[T] = []
    meta: PaginationMeta = None  # type: ignore[assignment]


class PaginationMeta(BaseSchema):
    page: int = 1
    per_page: int = 20
    total: int = 0
    total_pages: int = 0


class ErrorResponse(BaseSchema):
    """Standard error response."""
    success: bool = False
    error: ErrorDetail = None  # type: ignore[assignment]


class ErrorDetail(BaseSchema):
    code: str = "INTERNAL_ERROR"
    message: str = "An unexpected error occurred"
    details: list[dict] | None = None


class PaginationParams(BaseSchema):
    """Query parameters for pagination."""
    page: int = 1
    per_page: int = 20

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.per_page

    @property
    def limit(self) -> int:
        return self.per_page
