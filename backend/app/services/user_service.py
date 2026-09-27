from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.common.audit_codes import AuditAction, AuditEntity
from app.services.audit_service import audit_service, record_snapshot

from app.core.security import hash_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserListResponse, UserRead, UserUpdate


class UserNotFoundError(Exception):
    pass


class UsernameExistsError(Exception):
    pass


class UserService:
    def __init__(self, repository: UserRepository | None = None) -> None:
        self.repository = repository or UserRepository()

    def list_users(self, db: Session, *, page: int, page_size: int) -> UserListResponse:
        users, total = self.repository.list_users(db, offset=(page - 1) * page_size, limit=page_size)
        return UserListResponse(items=[UserRead.model_validate(user) for user in users], total=total, page=page, page_size=page_size)

    def get_user(self, db: Session, user_id: int) -> UserRead:
        return UserRead.model_validate(self._require_user(db, user_id))

    def create_user(self, db: Session, data: UserCreate) -> UserRead:
        self._ensure_username_available(db, data.username)
        try:
            user = self.repository.create(db, {
                **data.model_dump(exclude={"password"}),
                "password_hash": hash_password(data.password.get_secret_value()),
            })
        except IntegrityError as error:
            db.rollback()
            raise UsernameExistsError from error
        audit_service.commit_change(db, record=user, action=AuditAction.CREATE, entity_type=AuditEntity.USER)
        db.refresh(user)
        return UserRead.model_validate(user)

    def update_user(self, db: Session, user_id: int, data: UserUpdate) -> UserRead:
        user = self._require_user(db, user_id)
        if data.username != user.username:
            self._ensure_username_available(db, data.username)
        before = record_snapshot(user)
        try:
            self.repository.update(db, user, data.model_dump())
        except IntegrityError as error:
            db.rollback()
            raise UsernameExistsError from error
        audit_service.commit_change(db, record=user, action=AuditAction.UPDATE,
                                    entity_type=AuditEntity.USER, before_data=before)
        db.refresh(user)
        return UserRead.model_validate(user)

    def change_password(self, db: Session, user_id: int, password: str) -> None:
        user = self._require_user(db, user_id)
        before = record_snapshot(user)
        self.repository.update(db, user, {"password_hash": hash_password(password)})
        audit_service.commit_change(db, record=user, action=AuditAction.PASSWORD_CHANGE,
                                    entity_type=AuditEntity.USER, before_data=before)

    def delete_user(self, db: Session, user_id: int) -> None:
        user = self._require_user(db, user_id)
        before = record_snapshot(user)
        self.repository.soft_delete(db, user)
        audit_service.commit_change(db, record=user, action=AuditAction.DELETE,
                                    entity_type=AuditEntity.USER, before_data=before)

    def _require_user(self, db: Session, user_id: int) -> User:
        user = self.repository.get_by_id(db, user_id)
        if user is None:
            raise UserNotFoundError
        return user

    def _ensure_username_available(self, db: Session, username: str) -> None:
        if self.repository.get_by_username(db, username) is not None:
            raise UsernameExistsError
