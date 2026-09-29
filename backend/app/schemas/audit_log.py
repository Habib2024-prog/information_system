from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.common.audit_codes import AuditAction, AuditEntity


class AuditUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    full_name: str


class AuditLogRead(BaseModel):
    id: int
    user: AuditUserRead
    action: AuditAction
    entity_type: AuditEntity
    entity_id: int | None
    description: str
    before_data: dict | None
    after_data: dict | None
    # Additive API field backed by metadata JSONB; legacy snapshots remain readable.
    changes: dict | None = None
    metadata: dict | None
    ip_address: str | None
    created_at: datetime


class AuditLogFilters(BaseModel):
    user_id: int | None = Field(default=None, ge=1)
    action: AuditAction | None = None
    entity_type: AuditEntity | None = None
    entity_id: int | None = Field(default=None, ge=1)
    date_from: date | None = None
    date_to: date | None = None

    @model_validator(mode="after")
    def validate_date_range(self):
        if self.date_from and self.date_to and self.date_from > self.date_to:
            raise ValueError("تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.")
        return self


class AuditLogListResponse(BaseModel):
    items: list[AuditLogRead]
    total: int
    page: int
    page_size: int


AuditSortField = Literal["created_at", "id", "user_id", "action", "entity_type", "entity_id"]
SortOrder = Literal["asc", "desc"]
