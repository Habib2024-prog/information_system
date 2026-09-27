"""Prevent section gender counts from exceeding enrolled count.

Revision ID: 20260926_0009
Revises: 20260926_0008
Create Date: 2026-09-26
"""

from typing import Sequence, Union

from alembic import op


revision: str = "20260926_0009"
down_revision: Union[str, Sequence[str], None] = "20260926_0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_school_grade_sections_male_not_exceed_enrolled",
        "school_grade_sections",
        "male_count <= enrolled_count",
    )
    op.create_check_constraint(
        "ck_school_grade_sections_female_not_exceed_enrolled",
        "school_grade_sections",
        "female_count <= enrolled_count",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_school_grade_sections_female_not_exceed_enrolled",
        "school_grade_sections",
        type_="check",
    )
    op.drop_constraint(
        "ck_school_grade_sections_male_not_exceed_enrolled",
        "school_grade_sections",
        type_="check",
    )
