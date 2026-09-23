"""Create schools and school grade statistics tables.

Revision ID: 20260924_0006
Revises: 20260923_0005
Create Date: 2026-09-24
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260924_0006"
down_revision: Union[str, Sequence[str], None] = "20260923_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "schools",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("school_name", sa.Text(), nullable=False),
        sa.Column("school_head_phone", sa.Text(), nullable=True),
        sa.Column("school_type_code", sa.Text(), nullable=False),
        sa.Column("gender_type_code", sa.Text(), nullable=False),
        sa.Column("school_code", sa.Text(), nullable=False),
        sa.Column("school_formation", sa.Text(), nullable=False),
        sa.Column("senior_teacher_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("male_teacher_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("female_teacher_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column(
            "incoming_service_teacher_count",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "outgoing_service_teacher_count",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column("volunteer_teacher_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("active_class_section_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("school_needs", sa.Text(), nullable=True),
        sa.Column("school_equipment", sa.Text(), nullable=True),
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
        sa.CheckConstraint("senior_teacher_count >= 0", name="ck_schools_senior_teacher_count"),
        sa.CheckConstraint("male_teacher_count >= 0", name="ck_schools_male_teacher_count"),
        sa.CheckConstraint("female_teacher_count >= 0", name="ck_schools_female_teacher_count"),
        sa.CheckConstraint(
            "incoming_service_teacher_count >= 0",
            name="ck_schools_incoming_service_teacher_count",
        ),
        sa.CheckConstraint(
            "outgoing_service_teacher_count >= 0",
            name="ck_schools_outgoing_service_teacher_count",
        ),
        sa.CheckConstraint("volunteer_teacher_count >= 0", name="ck_schools_volunteer_teacher_count"),
        sa.CheckConstraint(
            "active_class_section_count >= 0",
            name="ck_schools_active_class_section_count",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("school_code", name="uq_schools_school_code"),
    )
    op.create_index("ix_schools_school_name", "schools", ["school_name"])
    op.create_index("ix_schools_school_type_code", "schools", ["school_type_code"])
    op.create_index("ix_schools_gender_type_code", "schools", ["gender_type_code"])
    op.create_index("ix_schools_school_formation", "schools", ["school_formation"])

    op.create_table(
        "school_grade_statistics",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("school_id", sa.BigInteger(), nullable=False),
        sa.Column("grade_number", sa.SmallInteger(), nullable=False),
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
            name="ck_school_grade_statistics_grade_number_range",
        ),
        sa.CheckConstraint(
            "enrolled_count >= 0",
            name="ck_school_grade_statistics_enrolled_count",
        ),
        sa.CheckConstraint(
            "present_count >= 0",
            name="ck_school_grade_statistics_present_count",
        ),
        sa.CheckConstraint(
            "female_count >= 0",
            name="ck_school_grade_statistics_female_count",
        ),
        sa.CheckConstraint(
            "male_count >= 0",
            name="ck_school_grade_statistics_male_count",
        ),
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
    op.create_index(
        "ix_school_grade_statistics_grade_number",
        "school_grade_statistics",
        ["grade_number"],
    )


def downgrade() -> None:
    op.drop_index("ix_school_grade_statistics_grade_number", table_name="school_grade_statistics")
    op.drop_index(
        "uq_school_grade_statistics_active_school_grade",
        table_name="school_grade_statistics",
    )
    op.drop_table("school_grade_statistics")

    op.drop_index("ix_schools_school_formation", table_name="schools")
    op.drop_index("ix_schools_gender_type_code", table_name="schools")
    op.drop_index("ix_schools_school_type_code", table_name="schools")
    op.drop_index("ix_schools_school_name", table_name="schools")
    op.drop_table("schools")
