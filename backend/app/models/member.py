"""SupportPilot AI — Workspace Member Model"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.workspace import Workspace


class WorkspaceRole:
    OWNER = "owner"
    ADMIN = "admin"
    AGENT = "agent"
    MEMBER = "member"

    ALL = [OWNER, ADMIN, AGENT, MEMBER]

    # Role hierarchy for permission checks
    HIERARCHY = {
        OWNER: 4,
        ADMIN: 3,
        AGENT: 2,
        MEMBER: 1,
    }

    @classmethod
    def has_permission(cls, user_role: str, required_role: str) -> bool:
        """Check if user_role meets or exceeds required_role."""
        return cls.HIERARCHY.get(user_role, 0) >= cls.HIERARCHY.get(required_role, 0)


class WorkspaceMember(Base, TimestampMixin):
    """
    Junction table linking users to workspaces with roles.
    A user can be a member of multiple workspaces with different roles.
    """
    __tablename__ = "workspace_members"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(255), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(20), default=WorkspaceRole.MEMBER, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    # Relationships
    workspace: Mapped[Workspace] = relationship("Workspace", back_populates="members")
    user: Mapped[User] = relationship("User", back_populates="memberships")

    def __repr__(self) -> str:
        return f"<WorkspaceMember workspace={self.workspace_id} user={self.user_id} role={self.role}>"
