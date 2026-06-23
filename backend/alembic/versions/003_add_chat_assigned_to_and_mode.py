"""Add assigned_to and mode columns to chats table

Revision ID: 003_add_chat_assigned_to_and_mode
Revises: 002_add_embedding_column
Create Date: 2025-06-23 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "003_add_chat_assigned_to_and_mode"
down_revision: Union[str, None] = "002_add_embedding_column"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("chats", sa.Column("assigned_to", sa.String(255), nullable=True))
    op.add_column("chats", sa.Column("mode", sa.String(10), nullable=False, server_default="ai"))


def downgrade() -> None:
    op.drop_column("chats", "mode")
    op.drop_column("chats", "assigned_to")
