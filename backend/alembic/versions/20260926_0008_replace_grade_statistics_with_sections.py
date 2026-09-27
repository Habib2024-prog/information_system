"""Replace one-row grade statistics with named grade sections.

Revision ID: 20260926_0008
Revises: 20260924_0007
Create Date: 2026-09-26
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260926_0008"
down_revision: Union[str, Sequence[str], None] = "20260924_0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "school_grade_sections",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("school_id", sa.BigInteger(), nullable=False),
        sa.Column("grade_number", sa.SmallInteger(), nullable=False),
        sa.Column("section_name", sa.Text(), nullable=False),
        sa.Column("enrolled_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("present_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("female_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("male_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
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
            "grade_number BETWEEN 1 AND 12",
            name="ck_school_grade_sections_grade_number_range",
        ),
        sa.CheckConstraint(
            "section_name <> ''",
            name="ck_school_grade_sections_section_name_not_empty",
        ),
        sa.CheckConstraint("enrolled_count >= 0", name="ck_school_grade_sections_enrolled_count"),
        sa.CheckConstraint("present_count >= 0", name="ck_school_grade_sections_present_count"),
        sa.CheckConstraint(
            "present_count <= enrolled_count",
            name="ck_school_grade_sections_present_not_exceed_enrolled",
        ),
        sa.CheckConstraint("female_count >= 0", name="ck_school_grade_sections_female_count"),
        sa.CheckConstraint("male_count >= 0", name="ck_school_grade_sections_male_count"),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "uq_school_grade_sections_active_school_grade_section",
        "school_grade_sections",
        ["school_id", "grade_number", "section_name"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index("ix_school_grade_sections_grade_number", "school_grade_sections", ["grade_number"])

    # Every legacy grade row becomes a named section.  The migration-only label
    # preserves all old counts without imposing a default on newly created sections.
    op.execute(
        """
        INSERT INTO school_grade_sections (
            school_id, grade_number, section_name, enrolled_count, present_count,
            female_count, male_count, created_at, updated_at, deleted_at
        )
        SELECT school_id, grade_number,
               convert_from(decode('D8B9D985D988D985DB8C', 'hex'), 'UTF8'),
               enrolled_count, present_count,
               female_count, male_count, created_at, updated_at, deleted_at
        FROM school_grade_statistics
        """
    )

    op.drop_table("school_grade_statistics")


def downgrade() -> None:
    op.create_table(
        "school_grade_statistics",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("school_id", sa.BigInteger(), nullable=False),
        sa.Column("grade_number", sa.SmallInteger(), nullable=False),
        sa.Column("enrolled_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("present_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("female_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("male_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("grade_number BETWEEN 1 AND 12", name="ck_school_grade_statistics_grade_number_range"),
        sa.CheckConstraint("enrolled_count >= 0", name="ck_school_grade_statistics_enrolled_count"),
        sa.CheckConstraint("present_count >= 0", name="ck_school_grade_statistics_present_count"),
        sa.CheckConstraint("present_count <= enrolled_count", name="ck_school_grade_statistics_present_not_exceed_enrolled"),
        sa.CheckConstraint("female_count >= 0", name="ck_school_grade_statistics_female_count"),
        sa.CheckConstraint("male_count >= 0", name="ck_school_grade_statistics_male_count"),
        sa.ForeignKeyConstraint(["school_id"], ["schools.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "uq_school_grade_statistics_active_school_grade",
        "school_grade_statistics",
        ["school_id", "grade_number"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index("ix_school_grade_statistics_grade_number", "school_grade_statistics", ["grade_number"])

    # A downgrade cannot preserve multiple sections as distinct legacy rows;
    # aggregate them deliberately into one grade row.
    op.execute(
        """
        INSERT INTO school_grade_statistics (
            school_id, grade_number, enrolled_count, present_count, female_count,
            male_count, created_at, updated_at, deleted_at
        )
        SELECT school_id, grade_number, SUM(enrolled_count), SUM(present_count),
               SUM(female_count), SUM(male_count), MIN(created_at), MAX(updated_at),
               CASE WHEN COUNT(*) FILTER (WHERE deleted_at IS NULL) = 0 THEN MAX(deleted_at) ELSE NULL END
        FROM school_grade_sections
        GROUP BY school_id, grade_number
        """
    )
    op.drop_index("ix_school_grade_sections_grade_number", table_name="school_grade_sections")
    op.drop_index("uq_school_grade_sections_active_school_grade_section", table_name="school_grade_sections")
    op.drop_table("school_grade_sections")
