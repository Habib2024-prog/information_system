from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Identity,
    Integer,
    Numeric,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.scientific_member import ScientificMember


class AmirObservation(Base):
    __tablename__ = "amir_observations"
    __table_args__ = (
        CheckConstraint(
            "responsibility_score >= 0 AND responsibility_score <= 3",
            name="ck_amir_observations_responsibility_score_range",
        ),
        CheckConstraint(
            "professional_leadership_score >= 0 AND professional_leadership_score <= 3",
            name="ck_amir_observations_professional_leadership_score_range",
        ),
        CheckConstraint(
            "community_relations_score >= 0 AND community_relations_score <= 3",
            name="ck_amir_observations_community_relations_score_range",
        ),
        CheckConstraint(
            "professional_development_score >= 0 AND professional_development_score <= 3",
            name="ck_amir_observations_professional_development_score_range",
        ),
    )

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        Identity(always=True),
        primary_key=True,
    )
    employee_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("employees.id"),
        nullable=False,
    )
    observer_scientific_member_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("scientific_members.id"),
        nullable=False,
    )
    observation_date: Mapped[date] = mapped_column(Date, nullable=False)
    observed_class: Mapped[str] = mapped_column(Text, nullable=False)
    subject: Mapped[str] = mapped_column(Text, nullable=False)
    responsibility_score: Mapped[Decimal] = mapped_column(Numeric(4, 2), nullable=False)
    professional_leadership_score: Mapped[Decimal] = mapped_column(Numeric(4, 2), nullable=False)
    community_relations_score: Mapped[Decimal] = mapped_column(Numeric(4, 2), nullable=False)
    professional_development_score: Mapped[Decimal] = mapped_column(Numeric(4, 2), nullable=False)
    total_score: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    final_result_code: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    strengths: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    improvements: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
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

    observer: Mapped[ScientificMember] = relationship()
