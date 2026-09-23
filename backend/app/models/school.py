from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    Identity,
    Integer,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class School(Base):
    __tablename__ = "schools"
    __table_args__ = (
        UniqueConstraint("school_code", name="uq_schools_school_code"),
        CheckConstraint("senior_teacher_count >= 0", name="ck_schools_senior_teacher_count"),
        CheckConstraint("male_teacher_count >= 0", name="ck_schools_male_teacher_count"),
        CheckConstraint("female_teacher_count >= 0", name="ck_schools_female_teacher_count"),
        CheckConstraint(
            "incoming_service_teacher_count >= 0",
            name="ck_schools_incoming_service_teacher_count",
        ),
        CheckConstraint(
            "outgoing_service_teacher_count >= 0",
            name="ck_schools_outgoing_service_teacher_count",
        ),
        CheckConstraint("volunteer_teacher_count >= 0", name="ck_schools_volunteer_teacher_count"),
        CheckConstraint(
            "active_class_section_count >= 0",
            name="ck_schools_active_class_section_count",
        ),
    )

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        Identity(always=True),
        primary_key=True,
    )
    school_name: Mapped[str] = mapped_column(Text, nullable=False)
    school_head_phone: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    school_type_code: Mapped[str] = mapped_column(Text, nullable=False)
    gender_type_code: Mapped[str] = mapped_column(Text, nullable=False)
    school_code: Mapped[str] = mapped_column(Text, nullable=False)
    school_formation: Mapped[str] = mapped_column(Text, nullable=False)
    senior_teacher_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    male_teacher_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    female_teacher_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    incoming_service_teacher_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    outgoing_service_teacher_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    volunteer_teacher_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    active_class_section_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    school_needs: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    school_equipment: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
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
