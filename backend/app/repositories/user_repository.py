from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.common.username_normalization import normalize_username
from app.models.user import User


class UserRepository:
    def get_by_id(self, db: Session, user_id: int) -> User | None:
        return db.scalar(select(User).where(User.id == user_id, User.deleted_at.is_(None)))

    def get_by_username(self, db: Session, username: str) -> User | None:
        # The global unique constraint reserves a username after deletion as well.
        return db.scalar(select(User).where(User.username_normalized == normalize_username(username)))

    def list_users(self, db: Session, *, offset: int, limit: int) -> tuple[list[User], int]:
        active_records = User.deleted_at.is_(None)
        total = db.scalar(select(func.count()).select_from(User).where(active_records)) or 0
        users = list(db.scalars(select(User).where(active_records).order_by(User.id).offset(offset).limit(limit)))
        return users, total

    def create(self, db: Session, values: dict[str, object]) -> User:
        user = User(**values)
        db.add(user)
        db.flush()
        return user

    def update(self, db: Session, user: User, values: dict[str, object]) -> None:
        for name, value in values.items():
            setattr(user, name, value)
        db.flush()

    def soft_delete(self, db: Session, user: User) -> None:
        user.deleted_at = datetime.now(timezone.utc)
        db.flush()
