from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from pydantic import SecretStr

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Department  # noqa: F401
from app.models.user import User
from app.core.config import settings
from app.core.security import create_access_token, hash_password


@pytest.fixture(autouse=True)
def auth_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "secret_key", SecretStr("auth-tests-only-not-a-production-secret-123456789"))
    monkeypatch.setattr(settings, "jwt_algorithm", "HS256")


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    session = session_factory()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


@pytest.fixture
def anonymous_client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        try:
            yield db_session
        except Exception:
            db_session.rollback()
            raise
        finally:
            db_session.info.pop("audit_context", None)

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="session")
def test_password_hash() -> str:
    return hash_password("test-password")


@pytest.fixture
def authenticated_user(db_session: Session, test_password_hash: str) -> User:
    user = User(username="module-test-user", full_name="کاربر آزمایشی", role_code="user",
                password_hash=test_password_hash, is_active=True)
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def client(anonymous_client: TestClient, authenticated_user: User) -> TestClient:
    anonymous_client.headers["Authorization"] = f"Bearer {create_access_token(authenticated_user.id)}"
    return anonymous_client
