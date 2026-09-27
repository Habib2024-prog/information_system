from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.user import UserCreate
from app.services.user_service import UserService

TEST_SECRET = "auth-tests-only-not-a-production-secret-123456789"
PASSWORD = "secure-password"


@pytest.fixture
def client(anonymous_client: TestClient) -> TestClient:
    # Authentication tests intentionally start without an implicit module user.
    return anonymous_client


@pytest.fixture(autouse=True)
def configure_auth(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "secret_key", SecretStr(TEST_SECRET))
    monkeypatch.setattr(settings, "jwt_algorithm", "HS256")


def create_account(db: Session, username: str = "ahmad", role: str = "user", **values) -> User:
    result = UserService().create_user(db, UserCreate(
        username=username, full_name="احمد احمدی", password=PASSWORD,
        role_code=role, **values,
    ))
    return db.get(User, result.id)


def auth_header(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


@pytest.fixture
def admin(db_session: Session) -> User:
    return create_account(db_session, "administrator", "admin")


@pytest.fixture
def admin_headers(admin: User) -> dict[str, str]:
    return auth_header(admin)


def user_payload(**values) -> dict:
    return {
        "username": "ahmad", "full_name": "احمد احمدی", "password": PASSWORD,
        "role_code": "user", "is_active": True, **values,
    }


def assert_no_secrets(response) -> None:
    assert "password_hash" not in response.text
    assert PASSWORD not in response.text


def test_admin_creates_user_and_only_hash_is_stored(client: TestClient, db_session: Session, admin_headers: dict) -> None:
    response = client.post("/api/users", json=user_payload(), headers=admin_headers)
    assert response.status_code == 201
    assert response.json()["full_name"] == "احمد احمدی"
    assert_no_secrets(response)
    user = db_session.get(User, response.json()["id"])
    assert user.password_hash.startswith("$argon2id$")
    assert user.password_hash != PASSWORD
    assert verify_password(PASSWORD, user.password_hash)
    assert not hasattr(user, "password")
    assert "email" not in inspect(User).columns


def test_login_and_current_user(client: TestClient, db_session: Session) -> None:
    user = create_account(db_session)
    response = client.post("/api/auth/login", json={"username": user.username, "password": PASSWORD})
    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["user"]["id"] == user.id
    assert_no_secrets(response)
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {data['access_token']}"})
    assert response.status_code == 200
    assert response.json() == {
        "id": user.id, "username": user.username, "full_name": user.full_name,
        "role_code": "user", "is_active": True,
    }
    assert_no_secrets(response)


@pytest.mark.parametrize("failure", ["wrong_password", "unknown", "inactive", "deleted"])
def test_generic_login_rejection(client: TestClient, db_session: Session, failure: str) -> None:
    user = create_account(db_session, is_active=failure != "inactive")
    if failure == "deleted":
        UserService().delete_user(db_session, user.id)
    response = client.post("/api/auth/login", json={
        "username": "unknown" if failure == "unknown" else user.username,
        "password": "wrong-password" if failure == "wrong_password" else PASSWORD,
    })
    assert response.status_code == 401
    assert response.json() == {"detail": "اطلاعات ورود معتبر نیست."}
    assert response.headers["www-authenticate"] == "Bearer"
    assert_no_secrets(response)


@pytest.mark.parametrize("failure", ["missing", "invalid", "expired", "wrong_secret", "no_exp", "bad_subject", "oversize_subject", "unsigned"])
def test_invalid_tokens_rejected(client: TestClient, db_session: Session, failure: str) -> None:
    user = create_account(db_session)
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user.id), "iat": now, "exp": now + timedelta(minutes=5)}
    if failure == "expired":
        payload["exp"] = now - timedelta(minutes=1)
    elif failure == "no_exp":
        del payload["exp"]
    elif failure == "bad_subject":
        payload["sub"] = "not-an-id"
    elif failure == "oversize_subject":
        payload["sub"] = str(2**64)
    secret = "another-secret-with-at-least-32-bytes" if failure == "wrong_secret" else TEST_SECRET
    token = jwt.encode(payload, secret, algorithm="HS256")
    if failure == "unsigned":
        token = jwt.encode(payload, key="", algorithm="none")
    elif failure == "invalid":
        token = "not-a-token"
    headers = {} if failure == "missing" else {"Authorization": f"Bearer {token}"}
    assert client.get("/api/auth/me", headers=headers).status_code == 401


@pytest.mark.parametrize("method,path,payload", [
    ("GET", "/api/users", None), ("GET", "/api/users/1", None),
    ("POST", "/api/users", user_payload()),
    ("PUT", "/api/users/1", {k: v for k, v in user_payload().items() if k != "password"}),
    ("DELETE", "/api/users/1", None),
    ("PUT", "/api/users/1/password", {"new_password": "new-password"}),
])
def test_all_user_endpoints_are_admin_only(client: TestClient, db_session: Session, method: str, path: str, payload: dict | None) -> None:
    user = create_account(db_session)
    assert client.request(method, path, json=payload, headers=auth_header(user)).status_code == 403
    assert client.request(method, path, json=payload).status_code == 401


def test_admin_list_detail_and_pagination(client: TestClient, db_session: Session, admin_headers: dict) -> None:
    user = create_account(db_session)
    response = client.get("/api/users?page=1&page_size=1", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["total"] == 2
    assert len(response.json()["items"]) == 1
    assert_no_secrets(response)
    response = client.get(f"/api/users/{user.id}", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["username"] == user.username
    assert_no_secrets(response)


def test_update_user_and_password_remains_unchanged(client: TestClient, db_session: Session, admin_headers: dict) -> None:
    user = create_account(db_session)
    original_hash = user.password_hash
    response = client.put(f"/api/users/{user.id}", headers=admin_headers, json={
        "username": "renamed", "full_name": "نام جدید", "role_code": "admin", "is_active": False,
    })
    assert response.status_code == 200
    assert response.json()["username"] == "renamed"
    assert response.json()["role_code"] == "admin"
    assert response.json()["is_active"] is False
    db_session.refresh(user)
    assert user.password_hash == original_hash
    assert_no_secrets(response)


def test_delete_is_soft_and_excludes_user(client: TestClient, db_session: Session, admin_headers: dict) -> None:
    user = create_account(db_session)
    response = client.delete(f"/api/users/{user.id}", headers=admin_headers)
    assert response.status_code == 204
    db_session.refresh(user)
    assert user.deleted_at is not None
    assert client.get(f"/api/users/{user.id}", headers=admin_headers).status_code == 404
    result = client.get("/api/users", headers=admin_headers).json()
    assert result["total"] == 1
    assert all(item["id"] != user.id for item in result["items"])


def test_duplicate_username_create_update_and_deleted_account(client: TestClient, db_session: Session, admin_headers: dict) -> None:
    user = create_account(db_session)
    assert client.post("/api/users", json=user_payload(), headers=admin_headers).status_code == 409
    other = create_account(db_session, "other")
    response = client.put(f"/api/users/{other.id}", headers=admin_headers, json={
        "username": user.username, "full_name": other.full_name, "role_code": "user", "is_active": True,
    })
    assert response.status_code == 409
    UserService().delete_user(db_session, user.id)
    assert client.post("/api/users", json=user_payload(), headers=admin_headers).status_code == 409


def test_password_change_hashes_and_changes_login(client: TestClient, db_session: Session, admin_headers: dict) -> None:
    user = create_account(db_session)
    previous_hash = user.password_hash
    response = client.put(f"/api/users/{user.id}/password", headers=admin_headers, json={"new_password": "new-password"})
    assert response.status_code == 204
    assert response.content == b""
    db_session.refresh(user)
    assert user.password_hash != previous_hash
    assert verify_password("new-password", user.password_hash)
    assert not verify_password(PASSWORD, user.password_hash)
    assert client.post("/api/auth/login", json={"username": user.username, "password": PASSWORD}).status_code == 401
    assert client.post("/api/auth/login", json={"username": user.username, "password": "new-password"}).status_code == 200


@pytest.mark.parametrize("field,value", [
    ("password", "short"), ("password", 123), ("role_code", "superadmin"),
    ("username", "   "), ("full_name", "   "), ("password_hash", "must-not-be-accepted"),
])
def test_user_validation_hides_password_input(client: TestClient, admin_headers: dict, field: str, value) -> None:
    response = client.post("/api/users", headers=admin_headers, json=user_payload(**{field: value}))
    assert response.status_code == 422
    assert PASSWORD not in response.text
    assert "input" not in response.text
    assert "ctx" not in response.text
    if field == "password" and value == "short":
        assert "short" not in response.text
        assert "۸" in response.json()["detail"][0]["msg"]


def test_password_validation_for_change_and_login(client: TestClient, db_session: Session, admin_headers: dict) -> None:
    user = create_account(db_session)
    response = client.put(f"/api/users/{user.id}/password", headers=admin_headers, json={"new_password": "short"})
    assert response.status_code == 422
    assert "short" not in response.text
    response = client.post("/api/auth/login", json={"username": "ahmad", "password": 123})
    assert response.status_code == 422
    assert "input" not in response.text


@pytest.mark.parametrize("action", ["inactive", "deleted"])
def test_existing_token_rejects_disabled_accounts(client: TestClient, db_session: Session, action: str) -> None:
    user = create_account(db_session)
    headers = auth_header(user)
    if action == "inactive":
        user.is_active = False
        db_session.commit()
    else:
        UserService().delete_user(db_session, user.id)
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_role_is_checked_live_not_trusted_from_token(client: TestClient, db_session: Session, admin: User) -> None:
    headers = auth_header(admin)
    admin.role_code = "user"
    db_session.commit()
    assert client.get("/api/users", headers=headers).status_code == 403


@pytest.mark.parametrize("method,path,payload", [
    ("GET", "/api/users/99999", None), ("DELETE", "/api/users/99999", None),
    ("PUT", "/api/users/99999", {k: v for k, v in user_payload().items() if k != "password"}),
    ("PUT", "/api/users/99999/password", {"new_password": "new-password"}),
])
def test_nonexistent_user_returns_404(client: TestClient, admin_headers: dict, method: str, path: str, payload: dict | None) -> None:
    assert client.request(method, path, json=payload, headers=admin_headers).status_code == 404


def test_cli_creates_admin_with_prompted_password(db_session: Session, monkeypatch: pytest.MonkeyPatch, capsys) -> None:
    from app.scripts import create_admin

    answers = iter(["initial-admin", "مدیر سیستم"])
    monkeypatch.setattr("builtins.input", lambda prompt: next(answers))
    monkeypatch.setattr(create_admin, "getpass", lambda prompt: PASSWORD)
    monkeypatch.setattr(create_admin, "get_engine", lambda: db_session.get_bind())
    assert create_admin.main() == 0
    user = db_session.scalar(select(User).where(User.username == "initial-admin"))
    assert user.role_code == "admin"
    assert verify_password(PASSWORD, user.password_hash)
    assert PASSWORD not in capsys.readouterr().out


@pytest.mark.parametrize("failure", ["mismatch", "short_password", "duplicate"])
def test_cli_does_not_create_invalid_or_duplicate_admin(db_session: Session, monkeypatch: pytest.MonkeyPatch, capsys, failure: str) -> None:
    from app.scripts import create_admin

    if failure == "duplicate":
        create_account(db_session, "initial-admin", "admin")
    answers = iter(["initial-admin", "مدیر سیستم"])
    passwords = iter([PASSWORD, "different-password"] if failure == "mismatch" else
                     ["short", "short"] if failure == "short_password" else [PASSWORD, PASSWORD])
    monkeypatch.setattr("builtins.input", lambda prompt: next(answers))
    monkeypatch.setattr(create_admin, "getpass", lambda prompt: next(passwords))
    monkeypatch.setattr(create_admin, "get_engine", lambda: db_session.get_bind())
    assert create_admin.main() == 1
    rows = list(db_session.scalars(select(User)))
    assert len(rows) == (1 if failure == "duplicate" else 0)
    output = capsys.readouterr().out
    assert PASSWORD not in output
    assert "different-password" not in output
    assert "short" not in output


def test_login_validation_never_echoes_raw_json_password(client: TestClient) -> None:
    response = client.post("/api/auth/login", content='{"password":"secret-do-not-echo",',
                           headers={"Content-Type": "application/json"})
    assert response.status_code == 422
    assert "secret-do-not-echo" not in response.text
    assert "input" not in response.text


def test_secret_key_has_no_insecure_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "secret_key", None)
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        create_access_token(1)
    monkeypatch.setattr(settings, "secret_key", SecretStr("replace_with_a_long_random_secret"))
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        create_access_token(1)
