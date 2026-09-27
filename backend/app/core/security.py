import secrets
from datetime import datetime, timedelta, timezone
from functools import lru_cache

import jwt
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError

from app.core.config import settings

password_hasher = PasswordHash.recommended()


class InvalidTokenError(Exception):
    pass


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password, password_hash)
    except (ValueError, UnknownHashError):
        return False


@lru_cache
def get_dummy_password_hash() -> str:
    """Verify a real hash even for missing/inactive accounts to avoid quick rejection."""
    return hash_password(secrets.token_urlsafe(32))


def require_secret_key() -> str:
    secret = settings.secret_key.get_secret_value() if settings.secret_key else ""
    if len(secret.encode("utf-8")) < 32 or secret == "replace_with_a_long_random_secret":
        raise RuntimeError("SECRET_KEY must be configured with at least 32 bytes of random data.")
    return secret


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": str(user_id), "iat": now, "exp": now + timedelta(minutes=settings.access_token_expire_minutes)},
        require_secret_key(),
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> int:
    try:
        payload = jwt.decode(
            token, require_secret_key(), algorithms=[settings.jwt_algorithm],
            options={"require": ["sub", "exp", "iat"]},
        )
        subject = payload["sub"]
        if not isinstance(subject, str) or not subject.isascii() or not subject.isdecimal():
            raise InvalidTokenError
        user_id = int(subject)
        if not 0 < user_id <= 2**63 - 1:
            raise InvalidTokenError
        return user_id
    except (jwt.InvalidTokenError, TypeError, ValueError) as error:
        raise InvalidTokenError from error
