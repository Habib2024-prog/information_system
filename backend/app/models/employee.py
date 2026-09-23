from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Identity, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        Identity(always=True),
        primary_key=True,
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    father_name: Mapped[str] = mapped_column(Text, nullable=False)
    grandfather_name: Mapped[str] = mapped_column(Text, nullable=False)
    school_workplace: Mapped[str] = mapped_column(Text, nullable=False)
    city_district: Mapped[str] = mapped_column(Text, nullable=False)
    phone_number: Mapped[str] = mapped_column(Text, nullable=False)
    field_of_study: Mapped[str] = mapped_column(Text, nullable=False)
    education_level: Mapped[str] = mapped_column(Text, nullable=False)
    subjects_taught: Mapped[str] = mapped_column(Text, nullable=False)
    job_title_code: Mapped[str] = mapped_column(Text, nullable=False)
    teaching_experience: Mapped[int] = mapped_column(Integer, nullable=False)
    grade_post: Mapped[int] = mapped_column(Integer, nullable=False)
    step: Mapped[int] = mapped_column(Integer, nullable=False)
    successful_evaluation: Mapped[str] = mapped_column(Text, nullable=False)
    field_match_code: Mapped[str] = mapped_column(Text, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
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
