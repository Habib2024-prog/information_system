from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.auth_dependencies import require_admin
from app.common.audit_codes import AuditAction, AuditEntity
from app.db.session import get_db
from app.schemas.audit_log import AuditLogFilters, AuditLogListResponse, AuditLogRead, AuditSortField, SortOrder
from app.services.audit_service import AuditLogNotFoundError, audit_service

router = APIRouter(prefix="/audit-logs", tags=["سوابق فعالیت‌ها"], dependencies=[Depends(require_admin)])
DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=AuditLogListResponse)
def list_audit_logs(
    db: DbSession, user_id: int | None = Query(default=None, ge=1),
    action: AuditAction | None = None, entity_type: AuditEntity | None = None,
    entity_id: int | None = Query(default=None, ge=1), date_from: date | None = None,
    date_to: date | None = None, page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: AuditSortField = "created_at", sort_order: SortOrder = "desc",
) -> AuditLogListResponse:
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=422, detail="تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.")
    filters = AuditLogFilters(user_id=user_id, action=action, entity_type=entity_type,
                             entity_id=entity_id, date_from=date_from, date_to=date_to)
    return audit_service.list_logs(db, filters=filters, sort_by=sort_by, sort_order=sort_order, page=page, page_size=page_size)


@router.get("/{log_id}", response_model=AuditLogRead)
def get_audit_log(log_id: int, db: DbSession) -> AuditLogRead:
    try:
        return audit_service.get_log(db, log_id)
    except AuditLogNotFoundError as error:
        raise HTTPException(status_code=404, detail="سابقهٔ فعالیت یافت نشد.") from error
