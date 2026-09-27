from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Integer,
    SmallInteger,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SchoolGradeSection(Base):
    """Student statistics for one named section within a school grade."""

    __tablename__ = "school_grade_sections"
    __table_args__ = (
        CheckConstraint(
            "grade_number BETWEEN 1 AND 12",
            name="ck_school_grade_sections_grade_number_range",
        ),
        CheckConstraint(
            "section_name <> ''",
            name="ck_school_grade_sections_section_name_not_empty",
        ),
        CheckConstraint(
            "enrolled_count >= 0",
            name="ck_school_grade_sections_enrolled_count",
        ),
        CheckConstraint(
            "present_count >= 0",
            name="ck_school_grade_sections_present_count",
        ),
        CheckConstraint(
            "present_count <= enrolled_count",
            name="ck_school_grade_sections_present_not_exceed_enrolled",
        ),
        CheckConstraint(
            "female_count >= 0",
            name="ck_school_grade_sections_female_count",
        ),
        CheckConstraint(
            "female_count <= enrolled_count",
            name="ck_school_grade_sections_female_not_exceed_enrolled",
        ),
        CheckConstraint(
            "male_count >= 0",
            name="ck_school_grade_sections_male_count",
        ),
        CheckConstraint(
            "male_count <= enrolled_count",
            name="ck_school_grade_sections_male_not_exceed_enrolled",
        ),
        CheckConstraint(
            "male_count + female_count <= enrolled_count",
            name="ck_school_grade_sections_gender_total_not_exceed_enrolled",
        ),
        Index(
            "uq_school_grade_sections_active_school_grade_section",
            "school_id",
            "grade_number",
            "section_name",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
            sqlite_where=text("deleted_at IS NULL"),
        ),
        Index("ix_school_grade_sections_grade_number", "grade_number"),
    )

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        Identity(always=True),
        primary_key=True,
    )
    school_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("schools.id"),
        nullable=False,
    )
    grade_number: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    section_name: Mapped[str] = mapped_column(Text, nullable=False)
    enrolled_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    present_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    female_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    male_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
