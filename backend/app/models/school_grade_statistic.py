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
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SchoolGradeStatistic(Base):
    __tablename__ = "school_grade_statistics"
    __table_args__ = (
        CheckConstraint(
            "grade_number BETWEEN 1 AND 12",
            name="ck_school_grade_statistics_grade_number_range",
        ),
        CheckConstraint(
            "enrolled_count >= 0",
            name="ck_school_grade_statistics_enrolled_count",
        ),
        CheckConstraint(
            "present_count >= 0",
            name="ck_school_grade_statistics_present_count",
        ),
        CheckConstraint(
            "present_count <= enrolled_count",
            name="ck_school_grade_statistics_present_not_exceed_enrolled",
        ),
        CheckConstraint(
            "female_count >= 0",
            name="ck_school_grade_statistics_female_count",
        ),
        CheckConstraint(
            "male_count >= 0",
            name="ck_school_grade_statistics_male_count",
        ),
        Index(
            "uq_school_grade_statistics_active_school_grade",
            "school_id",
            "grade_number",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
            sqlite_where=text("deleted_at IS NULL"),
        ),
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
    enrolled_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    present_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    female_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    male_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )
