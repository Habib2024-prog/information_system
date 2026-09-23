"""Create employees and employee departments tables.

Revision ID: 20260923_0002
Revises: 20260923_0001
Create Date: 2026-09-23
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "20260923_0002"
down_revision: Union[str, Sequence[str], None] = "20260923_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "employees",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("father_name", sa.Text(), nullable=False),
        sa.Column("grandfather_name", sa.Text(), nullable=False),
        sa.Column("school_workplace", sa.Text(), nullable=False),
        sa.Column("city_district", sa.Text(), nullable=False),
        sa.Column("phone_number", sa.Text(), nullable=False),
        sa.Column("field_of_study", sa.Text(), nullable=False),
        sa.Column("education_level", sa.Text(), nullable=False),
        sa.Column("subjects_taught", sa.Text(), nullable=False),
        sa.Column("job_title_code", sa.Text(), nullable=False),
        sa.Column("teaching_experience", sa.Integer(), nullable=False),
        sa.Column("grade_post", sa.Integer(), nullable=False),
        sa.Column("step", sa.Integer(), nullable=False),
        sa.Column("successful_evaluation", sa.Text(), nullable=False),
        sa.Column("field_match_code", sa.Text(), nullable=False),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_employees_name", "employees", ["name"])
    op.create_index("ix_employees_father_name", "employees", ["father_name"])
    op.create_index("ix_employees_school_workplace", "employees", ["school_workplace"])
    op.create_index("ix_employees_city_district", "employees", ["city_district"])
    op.create_index("ix_employees_field_of_study", "employees", ["field_of_study"])
    op.create_index("ix_employees_education_level", "employees", ["education_level"])
    op.create_index("ix_employees_job_title_code", "employees", ["job_title_code"])
    op.create_index("ix_employees_grade_post", "employees", ["grade_post"])
    op.create_index("ix_employees_step", "employees", ["step"])
    op.create_index("ix_employees_successful_evaluation", "employees", ["successful_evaluation"])
    op.create_index("ix_employees_field_match_code", "employees", ["field_match_code"])

    op.create_table(
        "employee_departments",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("employee_id", sa.BigInteger(), nullable=False),
        sa.Column("department_id", sa.BigInteger(), nullable=False),
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
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "uq_employee_departments_active_employee_department",
        "employee_departments",
        ["employee_id", "department_id"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index(
        "ix_employee_departments_department_employee",
        "employee_departments",
        ["department_id", "employee_id"],
    )
    op.create_index(
        "ix_employee_departments_employee_department",
        "employee_departments",
        ["employee_id", "department_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_employee_departments_employee_department", table_name="employee_departments")
    op.drop_index("ix_employee_departments_department_employee", table_name="employee_departments")
    op.drop_index(
        "uq_employee_departments_active_employee_department",
        table_name="employee_departments",
    )
    op.drop_table("employee_departments")

    op.drop_index("ix_employees_field_match_code", table_name="employees")
    op.drop_index("ix_employees_successful_evaluation", table_name="employees")
    op.drop_index("ix_employees_step", table_name="employees")
    op.drop_index("ix_employees_grade_post", table_name="employees")
    op.drop_index("ix_employees_job_title_code", table_name="employees")
    op.drop_index("ix_employees_education_level", table_name="employees")
    op.drop_index("ix_employees_field_of_study", table_name="employees")
    op.drop_index("ix_employees_city_district", table_name="employees")
    op.drop_index("ix_employees_school_workplace", table_name="employees")
    op.drop_index("ix_employees_father_name", table_name="employees")
    op.drop_index("ix_employees_name", table_name="employees")
    op.drop_table("employees")
