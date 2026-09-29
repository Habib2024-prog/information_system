from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.common.username_normalization import normalize_username
from app.models.user import User


PASSWORD = "username-normalization-test-password"


def _make_admin(db_session: Session, authenticated_user: User) -> None:
    authenticated_user.role_code = "admin"
    db_session.commit()


def _user_payload(username: str, password: str = PASSWORD) -> dict[str, object]:
    return {
        "username": username,
        "full_name": "کاربر آزمایشی",
        "password": password,
        "role_code": "user",
        "is_active": True,
    }


def _create_user(client: TestClient, username: str, password: str = PASSWORD) -> dict[str, object]:
    response = client.post("/api/users", json=_user_payload(username, password))
    assert response.status_code == 201
    return response.json()


def _login(client: TestClient, username: str, password: str = PASSWORD):
    return client.post("/api/auth/login", json={"username": username, "password": password})


def test_username_normalization_is_conservative_and_does_not_casefold() -> None:
    assert normalize_username(" حبيب ") == "حبیب"
    assert normalize_username("كاتب") == "کاتب"
    assert normalize_username("ح\u200cب\u200eی\u200fب") == "حبیب"
    assert normalize_username("Habib") == "Habib"
    assert normalize_username("HABIB") == "HABIB"


def test_persian_yeh_username_authenticates_with_arabic_yeh(
    client: TestClient, db_session: Session, authenticated_user: User,
) -> None:
    _make_admin(db_session, authenticated_user)
    created = _create_user(client, "حبیب")

    response = _login(client, "حبيب")

    assert response.status_code == 200
    assert response.json()["user"]["id"] == created["id"]
    assert response.json()["user"]["username"] == "حبیب"


def test_arabic_yeh_username_authenticates_with_persian_yeh(
    client: TestClient, db_session: Session, authenticated_user: User,
) -> None:
    _make_admin(db_session, authenticated_user)
    created = _create_user(client, "حبيب")

    response = _login(client, "حبیب")

    assert response.status_code == 200
    assert response.json()["user"]["id"] == created["id"]


def test_persian_keheh_username_authenticates_with_arabic_kaf(
    client: TestClient, db_session: Session, authenticated_user: User,
) -> None:
    _make_admin(db_session, authenticated_user)
    created = _create_user(client, "کاتب")

    response = _login(client, "كاتب")

    assert response.status_code == 200
    assert response.json()["user"]["id"] == created["id"]


def test_username_whitespace_and_invisible_formatting_do_not_block_login(
    client: TestClient, db_session: Session, authenticated_user: User,
) -> None:
    _make_admin(db_session, authenticated_user)
    created = _create_user(client, "  حبیب  ")

    response = _login(client, " \u200fح\u200cبيب\u200e ")

    assert response.status_code == 200
    assert response.json()["user"]["id"] == created["id"]
    assert response.json()["user"]["username"] == "حبیب"


def test_normal_latin_username_and_existing_admin_still_authenticate(
    client: TestClient, db_session: Session, authenticated_user: User,
) -> None:
    _make_admin(db_session, authenticated_user)
    _create_user(client, "Habib")

    assert _login(client, "Habib").status_code == 200
    assert _login(client, authenticated_user.username, "test-password").status_code == 200


def test_correct_password_is_required_and_passwords_are_not_normalized(
    client: TestClient, db_session: Session, authenticated_user: User,
) -> None:
    _make_admin(db_session, authenticated_user)
    strict_password = "strict\u200c-password"
    _create_user(client, "password-check", strict_password)

    assert _login(client, "password-check", strict_password).status_code == 200
    assert _login(client, "password-check", "strict-password").status_code == 401
    assert _login(client, "password-check", "wrong-password").status_code == 401


def test_equivalent_normalized_usernames_cannot_be_created_twice(
    client: TestClient, db_session: Session, authenticated_user: User,
) -> None:
    _make_admin(db_session, authenticated_user)
    _create_user(client, "حبیب")

    response = client.post("/api/users", json=_user_payload("حبيب"))

    assert response.status_code == 409
    assert response.json()["detail"] == "این نام کاربری یا شکل معادل آن قبلاً ثبت شده است."


def test_username_update_respects_normalized_uniqueness(
    client: TestClient, db_session: Session, authenticated_user: User,
) -> None:
    _make_admin(db_session, authenticated_user)
    _create_user(client, "حبیب")
    second = _create_user(client, "different-user")

    response = client.put(
        f"/api/users/{second['id']}",
        json={"username": "حبيب", "full_name": "کاربر دوم", "role_code": "user", "is_active": True},
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "این نام کاربری یا شکل معادل آن قبلاً ثبت شده است."


def test_username_update_can_change_only_the_display_form_for_its_own_canonical_username(
    client: TestClient, db_session: Session, authenticated_user: User,
) -> None:
    _make_admin(db_session, authenticated_user)
    created = _create_user(client, "حبیب")

    response = client.put(
        f"/api/users/{created['id']}",
        json={"username": "حبيب", "full_name": "کاربر آزمایشی", "role_code": "user", "is_active": True},
    )

    assert response.status_code == 200
    assert response.json()["username"] == "حبيب"
    assert _login(client, "حبیب").status_code == 200
