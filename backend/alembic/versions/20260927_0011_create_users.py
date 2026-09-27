"""Create username/password users with one approved role.

Revision ID: 20260927_0011
Revises: 20260926_0010
"""

import sqlalchemy as sa
from alembic import op

revision = "20260927_0011"
down_revision = "20260926_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("username", sa.Text(), nullable=False),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("role_code", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username", name="uq_users_username"),
        sa.CheckConstraint("role_code IN ('admin', 'user')", name="ck_users_role_code"),
    )
    op.create_index("ix_users_role_code", "users", ["role_code"])


def downgrade() -> None:
    op.drop_index("ix_users_role_code", table_name="users")
    op.drop_table("users")
