"""Create teacher observations table.

Revision ID: 20260923_0004
Revises: 20260923_0003
Create Date: 2026-09-23
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260923_0004"
down_revision: Union[str, Sequence[str], None] = "20260923_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "teacher_observations",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("employee_id", sa.BigInteger(), nullable=False),
        sa.Column("observer_scientific_member_id", sa.BigInteger(), nullable=False),
        sa.Column("observation_date", sa.Date(), nullable=False),
        sa.Column("observed_class", sa.Text(), nullable=False),
        sa.Column("subject", sa.Text(), nullable=False),
        sa.Column("subject_knowledge_score", sa.Numeric(precision=4, scale=2), nullable=False),
        sa.Column("lesson_plan_score", sa.Numeric(precision=4, scale=2), nullable=False),
        sa.Column(
            "classroom_management_score",
            sa.Numeric(precision=4, scale=2),
            nullable=False,
        ),
        sa.Column("assessment_score", sa.Numeric(precision=4, scale=2), nullable=False),
        sa.Column(
            "professional_learning_score",
            sa.Numeric(precision=4, scale=2),
            nullable=False,
        ),
        sa.Column(
            "community_engagement_score",
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
            "subject_knowledge_score >= 0 AND subject_knowledge_score <= 3",
            name="ck_teacher_observations_subject_knowledge_score_range",
        ),
        sa.CheckConstraint(
            "lesson_plan_score >= 0 AND lesson_plan_score <= 3",
            name="ck_teacher_observations_lesson_plan_score_range",
        ),
        sa.CheckConstraint(
            "classroom_management_score >= 0 AND classroom_management_score <= 3",
            name="ck_teacher_observations_classroom_management_score_range",
        ),
        sa.CheckConstraint(
            "assessment_score >= 0 AND assessment_score <= 3",
            name="ck_teacher_observations_assessment_score_range",
        ),
        sa.CheckConstraint(
            "professional_learning_score >= 0 AND professional_learning_score <= 3",
            name="ck_teacher_observations_professional_learning_score_range",
        ),
        sa.CheckConstraint(
            "community_engagement_score >= 0 AND community_engagement_score <= 3",
            name="ck_teacher_observations_community_engagement_score_range",
        ),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(
            ["observer_scientific_member_id"],
            ["scientific_members.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_teacher_observations_employee_date",
        "teacher_observations",
        ["employee_id", sa.text("observation_date DESC")],
    )
    op.create_index(
        "ix_teacher_observations_observer_date",
        "teacher_observations",
        ["observer_scientific_member_id", sa.text("observation_date DESC")],
    )
    op.create_index(
        "ix_teacher_observations_observation_date",
        "teacher_observations",
        ["observation_date"],
    )
    op.create_index(
        "ix_teacher_observations_final_result_code",
        "teacher_observations",
        ["final_result_code"],
    )


def downgrade() -> None:
    op.drop_index("ix_teacher_observations_final_result_code", table_name="teacher_observations")
    op.drop_index("ix_teacher_observations_observation_date", table_name="teacher_observations")
    op.drop_index("ix_teacher_observations_observer_date", table_name="teacher_observations")
    op.drop_index("ix_teacher_observations_employee_date", table_name="teacher_observations")
    op.drop_table("teacher_observations")
