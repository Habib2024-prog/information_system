"""Prevent total male and female section counts from exceeding enrollment.

Revision ID: 20260926_0010
Revises: 20260926_0009
Create Date: 2026-09-26
"""

from typing import Sequence, Union

from alembic import op


revision: str = "20260926_0010"
down_revision: Union[str, Sequence[str], None] = "20260926_0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_school_grade_sections_gender_total_not_exceed_enrolled",
        "school_grade_sections",
        "male_count + female_count <= enrolled_count",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_school_grade_sections_gender_total_not_exceed_enrolled",
        "school_grade_sections",
        type_="check",
    )
