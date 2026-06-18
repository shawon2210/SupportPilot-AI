"""SupportPilot AI — Base Service"""

from __future__ import annotations

from typing import Generic, TypeVar

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import generate_uuid

ModelT = TypeVar("ModelT")


class BaseService(Generic[ModelT]):
    """Base service with common business logic patterns."""

    def __init__(self, db: AsyncSession):
        self.db = db

    def _generate_id(self) -> str:
        return generate_uuid()
