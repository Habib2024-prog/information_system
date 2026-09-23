"""Create scientific members table.

Revision ID: 20260923_0003
Revises: 20260923_0002
Create Date: 2026-09-23
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260923_0003"
down_revision: Union[str, Sequence[str], None] = "20260923_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "scientific_members",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("surname", sa.Text(), nullable=False),
        sa.Column("father_name", sa.Text(), nullable=False),
        sa.Column("phone_number", sa.Text(), nullable=False),
        sa.Column("academic_rank", sa.Text(), nullable=False),
        sa.Column("department_id", sa.BigInteger(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["department_id"], ["departments.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_scientific_members_name", "scientific_members", ["name"])
    op.create_index("ix_scientific_members_surname", "scientific_members", ["surname"])
    op.create_index("ix_scientific_members_father_name", "scientific_members", ["father_name"])
    op.create_index("ix_scientific_members_phone_number", "scientific_members", ["phone_number"])
    op.create_index("ix_scientific_members_academic_rank", "scientific_members", ["academic_rank"])
    op.create_index("ix_scientific_members_department_id", "scientific_members", ["department_id"])


def downgrade() -> None:
    op.drop_index("ix_scientific_members_department_id", table_name="scientific_members")
    op.drop_index("ix_scientific_members_academic_rank", table_name="scientific_members")
    op.drop_index("ix_scientific_members_phone_number", table_name="scientific_members")
    op.drop_index("ix_scientific_members_father_name", table_name="scientific_members")
    op.drop_index("ix_scientific_members_surname", table_name="scientific_members")
    op.drop_index("ix_scientific_members_name", table_name="scientific_members")
    op.drop_table("scientific_members")
