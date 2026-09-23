"""Create Amir observations table.

Revision ID: 20260923_0005
Revises: 20260923_0004
Create Date: 2026-09-23
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260923_0005"
down_revision: Union[str, Sequence[str], None] = "20260923_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "amir_observations",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("employee_id", sa.BigInteger(), nullable=False),
        sa.Column("observer_scientific_member_id", sa.BigInteger(), nullable=False),
        sa.Column("observation_date", sa.Date(), nullable=False),
        sa.Column("observed_class", sa.Text(), nullable=False),
        sa.Column("subject", sa.Text(), nullable=False),
        sa.Column("responsibility_score", sa.Numeric(precision=4, scale=2), nullable=False),
        sa.Column(
            "professional_leadership_score",
            sa.Numeric(precision=4, scale=2),
            nullable=False,
        ),
        sa.Column("community_relations_score", sa.Numeric(precision=4, scale=2), nullable=False),
        sa.Column(
            "professional_development_score",
            sa.Numeric(precision=4, scale=2),
            nullable=False,
        ),
        sa.Column("total_score", sa.Numeric(), nullable=False),
        sa.Column("final_result_code", sa.Text(), nullable=True),
        sa.Column("strengths", sa.Text(), nullable=True),
        sa.Column("improvements", sa.Text(), nullable=True),
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
        sa.CheckConstraint(
            "responsibility_score >= 0 AND responsibility_score <= 3",
            name="ck_amir_observations_responsibility_score_range",
        ),
        sa.CheckConstraint(
            "professional_leadership_score >= 0 AND professional_leadership_score <= 3",
            name="ck_amir_observations_professional_leadership_score_range",
        ),
        sa.CheckConstraint(
            "community_relations_score >= 0 AND community_relations_score <= 3",
            name="ck_amir_observations_community_relations_score_range",
        ),
        sa.CheckConstraint(
            "professional_development_score >= 0 AND professional_development_score <= 3",
            name="ck_amir_observations_professional_development_score_range",
        ),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(
            ["observer_scientific_member_id"],
            ["scientific_members.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_amir_observations_employee_date",
        "amir_observations",
        ["employee_id", sa.text("observation_date DESC")],
    )
    op.create_index(
        "ix_amir_observations_observer_date",
        "amir_observations",
        ["observer_scientific_member_id", sa.text("observation_date DESC")],
    )
    op.create_index(
        "ix_amir_observations_observation_date",
        "amir_observations",
        ["observation_date"],
    )
    op.create_index(
        "ix_amir_observations_final_result_code",
        "amir_observations",
        ["final_result_code"],
    )


def downgrade() -> None:
    op.drop_index("ix_amir_observations_final_result_code", table_name="amir_observations")
    op.drop_index("ix_amir_observations_observation_date", table_name="amir_observations")
    op.drop_index("ix_amir_observations_observer_date", table_name="amir_observations")
    op.drop_index("ix_amir_observations_employee_date", table_name="amir_observations")
    op.drop_table("amir_observations")
