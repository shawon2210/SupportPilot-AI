"""Add pgvector embedding column to document_chunks

Revision ID: 002_add_embedding_column
Revises: 001_initial_schema
Create Date: 2025-01-01 00:01:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "002_add_embedding_column"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add embedding column as Text for SQLite compatibility
    # On PostgreSQL with pgvector, manually alter to use Vector type:
    #   ALTER TABLE document_chunks
    #   ALTER COLUMN embedding TYPE vector(1538)
    #   USING embedding::vector(1538);
    op.add_column(
        "document_chunks",
        sa.Column("embedding", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("document_chunks", "embedding")
