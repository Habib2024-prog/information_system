from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token, get_dummy_password_hash, require_secret_key, verify_password,
)
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import CurrentUserRead
from app.services.user_presenter import to_current_user_read
from app.common.audit_codes import AuditAction, AuditEntity
from app.services.audit_service import AuditContext, audit_service


class InvalidCredentialsError(Exception):
    pass


class AuthService:
    def __init__(self, repository: UserRepository | None = None) -> None:
        self.repository = repository or UserRepository()

    def login(self, db: Session, data: LoginRequest, *, ip_address: str | None = None) -> TokenResponse:
        require_secret_key()
        user = self.repository.get_by_username(db, data.username)
        active = user is not None and user.is_active and user.deleted_at is None
        password_hash = user.password_hash if active else get_dummy_password_hash()
        valid = verify_password(data.password.get_secret_value(), password_hash)
        if not active or not valid:
            raise InvalidCredentialsError
        response = TokenResponse(access_token=create_access_token(user.id), user=to_current_user_read(user))
        try:
            audit_service.log_action(db, action=AuditAction.LOGIN, entity_type=AuditEntity.USER,
                                     entity_id=user.id, context=AuditContext(user.id, ip_address))
            db.commit()
        except Exception:
            db.rollback()
            raise
        return response

    def get_current_user(self, db: Session, user_id: int) -> CurrentUserRead:
        user = self.repository.get_by_id(db, user_id)
        if user is None or not user.is_active:
            raise InvalidCredentialsError
        return to_current_user_read(user)
