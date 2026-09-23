"""Add school grade present count constraint.

Revision ID: 20260924_0007
Revises: 20260924_0006
Create Date: 2026-09-24
"""

from typing import Sequence, Union

from alembic import op


revision: str = "20260924_0007"
down_revision: Union[str, Sequence[str], None] = "20260924_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_school_grade_statistics_present_not_exceed_enrolled",
        "school_grade_statistics",
        "present_count <= enrolled_count",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_school_grade_statistics_present_not_exceed_enrolled",
        "school_grade_statistics",
        type_="check",
    )
