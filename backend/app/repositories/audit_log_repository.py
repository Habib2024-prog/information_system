from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogFilters


class AuditLogRepository:
    def create(self, db: Session, values: dict) -> AuditLog:
        log = AuditLog(**values)
        db.add(log)
        db.flush()
        return log

    def get_by_id(self, db: Session, log_id: int) -> AuditLog | None:
        return db.scalar(select(AuditLog).options(joinedload(AuditLog.user)).where(AuditLog.id == log_id))

    def list_logs(self, db: Session, *, filters: AuditLogFilters, sort_by: str,
                  sort_order: str, offset: int, limit: int) -> tuple[list[AuditLog], int]:
        statement = select(AuditLog)
        for name in ("user_id", "action", "entity_type", "entity_id"):
            value = getattr(filters, name)
            if value is not None:
                statement = statement.where(getattr(AuditLog, name) == value)
        if filters.date_from:
            statement = statement.where(AuditLog.created_at >= datetime.combine(filters.date_from, time.min, timezone.utc))
        if filters.date_to:
            # Inclusive UTC calendar date, without truncating fractional seconds.
            if filters.date_to == date.max:
                statement = statement.where(AuditLog.created_at <= datetime.max.replace(tzinfo=timezone.utc))
            else:
                end = datetime.combine(filters.date_to, time.min, timezone.utc) + timedelta(days=1)
                statement = statement.where(AuditLog.created_at < end)
        total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0
        column = getattr(AuditLog, sort_by)
        order = column.desc() if sort_order == "desc" else column.asc()
        tie = AuditLog.id.desc() if sort_order == "desc" else AuditLog.id.asc()
        rows = db.scalars(statement.options(joinedload(AuditLog.user)).order_by(order, tie).offset(offset).limit(limit))
        return list(rows), total
