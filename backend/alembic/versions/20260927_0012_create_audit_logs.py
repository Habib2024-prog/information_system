"""Create append-only audit logs.

Revision ID: 20260927_0012
Revises: 20260927_0011
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision = "20260927_0012"
down_revision = "20260927_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.Text(), nullable=False),
        sa.Column("entity_id", sa.BigInteger(), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("before_data", postgresql.JSONB(), nullable=True),
        sa.Column("after_data", postgresql.JSONB(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("ip_address", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    for column in ("user_id", "action", "entity_type", "entity_id", "created_at"):
        op.create_index(f"ix_audit_logs_{column}", "audit_logs", [column])
    op.create_index("ix_audit_logs_entity_history", "audit_logs", ["entity_type", "entity_id", "created_at"])
    op.execute("""
        CREATE FUNCTION prevent_audit_log_mutation() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
            RAISE EXCEPTION 'Audit logs are append-only';
        END;
        $$
    """)
    op.execute("""
        CREATE TRIGGER audit_logs_append_only
        BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_logs
        FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_log_mutation()
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER audit_logs_append_only ON audit_logs")
    op.drop_table("audit_logs")
    op.execute("DROP FUNCTION prevent_audit_log_mutation()")
