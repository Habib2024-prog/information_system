from dataclasses import asdict, dataclass, is_dataclass
from decimal import Decimal
from functools import wraps
from inspect import signature

from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, SecretStr
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.common.audit_codes import ACTION_LABELS, ENTITY_LABELS, AuditAction, AuditEntity
from app.models.audit_log import AuditLog
from app.repositories.audit_log_repository import AuditLogRepository
from app.schemas.audit_log import AuditLogFilters, AuditLogListResponse, AuditLogRead, AuditUserRead

AUDIT_CONTEXT_KEY = "audit_context"


@dataclass(frozen=True)
class AuditContext:
    user_id: int
    ip_address: str | None = None


def is_sensitive_key(key: str) -> bool:
    normalized = key.casefold().replace("-", "_")
    return any(word in normalized for word in ("password", "token", "secret", "authorization", "credential", "api_key", "cookie"))


def sanitize_audit_data(value):
    """Recursively remove credentials before converting snapshots to JSON-safe values."""
    if isinstance(value, BaseModel):
        value = value.model_dump()
    elif is_dataclass(value) and not isinstance(value, type):
        value = asdict(value)
    if isinstance(value, dict):
        return {str(key): sanitize_audit_data(item) for key, item in value.items() if not is_sensitive_key(str(key))}
    if isinstance(value, (list, tuple)):
        return [sanitize_audit_data(item) for item in value]
    if isinstance(value, SecretStr):
        return None
    if isinstance(value, (bytes, bytearray, memoryview)):
        raise ValueError("Binary data must not be included in audit logs.")
    return jsonable_encoder(value, custom_encoder={Decimal: str})


def record_snapshot(record) -> dict:
    return sanitize_audit_data({
        column.key: getattr(record, column.key)
        for column in inspect(record).mapper.column_attrs
        if not is_sensitive_key(column.key)
    })


class AuditLogNotFoundError(Exception):
    pass


class AuditService:
    def __init__(self, repository: AuditLogRepository | None = None) -> None:
        self.repository = repository or AuditLogRepository()

    def log_action(self, db: Session, *, action: AuditAction, entity_type: AuditEntity,
                   entity_id: int | None = None, before_data: dict | None = None,
                   after_data: dict | None = None, metadata: dict | None = None,
                   context: AuditContext | None = None) -> AuditLog | None:
        actor = context or db.info.get(AUDIT_CONTEXT_KEY)
        if actor is None:
            # Trusted local CLI/seed calls have no authenticated request actor.
            return None
        return self.repository.create(db, {
            "user_id": actor.user_id, "action": action.value, "entity_type": entity_type.value,
            "entity_id": entity_id,
            "description": f"{ACTION_LABELS[action]} — {ENTITY_LABELS[entity_type]}",
            "before_data": sanitize_audit_data(before_data), "after_data": sanitize_audit_data(after_data),
            "event_metadata": sanitize_audit_data(metadata), "ip_address": actor.ip_address,
        })

    def log_change(self, db: Session, *, record, action: AuditAction, entity_type: AuditEntity,
                   before_data: dict | None = None, after_data: dict | None = None) -> None:
        db.flush()
        self.log_action(db, action=action, entity_type=entity_type, entity_id=record.id,
                        before_data=before_data, after_data=after_data if after_data is not None else record_snapshot(record))

    def commit_change(self, db: Session, *, record, action: AuditAction, entity_type: AuditEntity,
                      before_data: dict | None = None, after_data: dict | None = None) -> None:
        try:
            self.log_change(db, record=record, action=action, entity_type=entity_type,
                            before_data=before_data, after_data=after_data)
            db.commit()
        except Exception:
            db.rollback()
            raise

    def get_log(self, db: Session, log_id: int) -> AuditLogRead:
        log = self.repository.get_by_id(db, log_id)
        if log is None:
            raise AuditLogNotFoundError
        return self._to_read(log)

    def list_logs(self, db: Session, *, filters: AuditLogFilters, sort_by: str,
                  sort_order: str, page: int, page_size: int) -> AuditLogListResponse:
        rows, total = self.repository.list_logs(db, filters=filters, sort_by=sort_by,
                                              sort_order=sort_order, offset=(page - 1) * page_size, limit=page_size)
        return AuditLogListResponse(items=[self._to_read(row) for row in rows], total=total, page=page, page_size=page_size)

    @staticmethod
    def _to_read(log: AuditLog) -> AuditLogRead:
        return AuditLogRead(
            id=log.id, user=AuditUserRead.model_validate(log.user), action=log.action,
            entity_type=log.entity_type, entity_id=log.entity_id, description=log.description,
            before_data=sanitize_audit_data(log.before_data), after_data=sanitize_audit_data(log.after_data),
            metadata=sanitize_audit_data(log.event_metadata), ip_address=log.ip_address, created_at=log.created_at,
        )


audit_service = AuditService()


def audited_export(entity_type: AuditEntity):
    """Log only successful workbook generation, with effective filters, never rows/binary."""
    def decorate(method):
        method_signature = signature(method)

        @wraps(method)
        def export(*args, **kwargs):
            arguments = method_signature.bind(*args, **kwargs).arguments
            db = arguments["db"]
            response = method(*args, **kwargs)
            if db.info.get(AUDIT_CONTEXT_KEY) is None:
                return response
            filters = sanitize_audit_data(arguments.get("filters", {}))
            filters = {key: value for key, value in filters.items() if value is not None}
            entity_id = None
            for name in ("department_id", "employee_id", "scientific_member_id"):
                if arguments.get(name) is not None:
                    filters[name] = arguments[name]
                    entity_id = arguments[name]
            metadata = {"filters": filters}
            for name in ("sort_by", "sort_order"):
                if name in arguments:
                    metadata[name] = arguments[name]
            try:
                audit_service.log_action(db, action=AuditAction.EXPORT, entity_type=entity_type,
                                         entity_id=entity_id, metadata=metadata)
                db.commit()
            except Exception:
                db.rollback()
                raise
            return response

        return export
    return decorate
