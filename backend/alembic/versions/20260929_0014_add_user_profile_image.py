"""Add profile image metadata to users.

Revision ID: 20260929_0014
Revises: 20260927_0013
"""

import sqlalchemy as sa
from alembic import op


revision = "20260929_0014"
down_revision = "20260927_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("profile_image_key", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "profile_image_key")
