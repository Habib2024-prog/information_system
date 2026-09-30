from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.common.audit_codes import AuditAction, AuditEntity
from app.common.username_normalization import normalize_username
from app.services.audit_service import audit_service, record_snapshot

from app.core.security import hash_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import CurrentUserRead, UserCreate, UserListResponse, UserRead, UserUpdate
from app.services.profile_image_storage import ProfileImageStorage, ValidatedProfileImage, get_profile_image_storage
from app.services.user_presenter import to_user_read


class UserNotFoundError(Exception):
    pass


class UsernameExistsError(Exception):
    pass


class ProfileImagePermissionError(Exception):
    pass


class UserService:
    def __init__(self, repository: UserRepository | None = None) -> None:
        self.repository = repository or UserRepository()

    def list_users(self, db: Session, *, page: int, page_size: int) -> UserListResponse:
        users, total = self.repository.list_users(db, offset=(page - 1) * page_size, limit=page_size)
        return UserListResponse(items=[to_user_read(user) for user in users], total=total, page=page, page_size=page_size)

    def get_user(self, db: Session, user_id: int) -> UserRead:
        return to_user_read(self._require_user(db, user_id))

    def create_user(self, db: Session, data: UserCreate) -> UserRead:
        username_normalized = normalize_username(data.username)
        self._ensure_username_available(db, username_normalized)
        try:
            user = self.repository.create(db, {
                **data.model_dump(exclude={"password"}),
                "username_normalized": username_normalized,
                "password_hash": hash_password(data.password.get_secret_value()),
            })
        except IntegrityError as error:
            db.rollback()
            raise UsernameExistsError from error
        audit_service.commit_change(db, record=user, action=AuditAction.CREATE, entity_type=AuditEntity.USER)
        db.refresh(user)
        return to_user_read(user)

    def update_user(self, db: Session, user_id: int, data: UserUpdate) -> UserRead:
        user = self._require_user(db, user_id)
        username_normalized = normalize_username(data.username)
        self._ensure_username_available(db, username_normalized, excluding_user_id=user.id)
        before = record_snapshot(user)
        try:
            self.repository.update(db, user, {**data.model_dump(), "username_normalized": username_normalized})
        except IntegrityError as error:
            db.rollback()
            raise UsernameExistsError from error
        audit_service.commit_change(db, record=user, action=AuditAction.UPDATE,
                                    entity_type=AuditEntity.USER, before_data=before)
        db.refresh(user)
        return to_user_read(user)

    def replace_profile_image(
        self,
        db: Session,
        *,
        user_id: int,
        actor: CurrentUserRead,
        image: ValidatedProfileImage,
        storage: ProfileImageStorage | None = None,
    ) -> UserRead:
        user = self._require_profile_image_access(db, user_id, actor)
        storage = storage or get_profile_image_storage()
        old_key = user.profile_image_key
        new_key = storage.save(image)
        before = record_snapshot(user)
        try:
            self.repository.update(db, user, {"profile_image_key": new_key})
            audit_service.commit_change(
                db, record=user, action=AuditAction.UPDATE, entity_type=AuditEntity.USER, before_data=before,
            )
        except Exception:
            storage.delete(new_key)
            raise
        self._delete_stale_image(storage, old_key)
        db.refresh(user)
        return to_user_read(user)

    def remove_profile_image(
        self,
        db: Session,
        *,
        user_id: int,
        actor: CurrentUserRead,
        storage: ProfileImageStorage | None = None,
    ) -> UserRead:
        user = self._require_profile_image_access(db, user_id, actor)
        old_key = user.profile_image_key
        if old_key is None:
            return to_user_read(user)
        # Resolve storage before changing the reference.  In an unsafe cloud
        # configuration this raises a controlled error and preserves the key.
        storage = storage or get_profile_image_storage()
        before = record_snapshot(user)
        self.repository.update(db, user, {"profile_image_key": None})
        audit_service.commit_change(
            db, record=user, action=AuditAction.UPDATE, entity_type=AuditEntity.USER, before_data=before,
        )
        self._delete_stale_image(storage, old_key)
        db.refresh(user)
        return to_user_read(user)

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

    def _require_profile_image_access(self, db: Session, user_id: int, actor: CurrentUserRead) -> User:
        user = self._require_user(db, user_id)
        if actor.id != user.id and actor.role_code != "admin":
            raise ProfileImagePermissionError
        return user

    def _ensure_username_available(
        self,
        db: Session,
        username: str,
        *,
        excluding_user_id: int | None = None,
    ) -> None:
        existing = self.repository.get_by_username(db, username)
        if existing is not None and existing.id != excluding_user_id:
            raise UsernameExistsError

    @staticmethod
    def _delete_stale_image(storage: ProfileImageStorage, key: str | None) -> None:
        try:
            storage.delete(key)
        except Exception:
            # The database has already committed the new reference. A stale object can be cleaned
            # later, but a storage outage must not report a failed profile update to the user.
            return
