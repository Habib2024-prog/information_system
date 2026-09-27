from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Identity, Index, Integer, JSON, Text, event, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.user import User


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_entity_history", "entity_type", "entity_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), Identity(always=True), primary_key=True,
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    entity_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    before_data: Mapped[dict | None] = mapped_column(JSONB(none_as_null=True).with_variant(JSON(none_as_null=True), "sqlite"), nullable=True)
    after_data: Mapped[dict | None] = mapped_column(JSONB(none_as_null=True).with_variant(JSON(none_as_null=True), "sqlite"), nullable=True)
    event_metadata: Mapped[dict | None] = mapped_column("metadata", JSONB(none_as_null=True).with_variant(JSON(none_as_null=True), "sqlite"), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    user: Mapped[User] = relationship(lazy="raise")


@event.listens_for(AuditLog, "before_update")
@event.listens_for(AuditLog, "before_delete")
def reject_audit_mutation(*args) -> None:
    raise ValueError("Audit logs are append-only.")
