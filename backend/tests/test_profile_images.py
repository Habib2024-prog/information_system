from io import BytesIO

import pytest
from PIL import Image
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.user import UserCreate
from app.services.user_service import UserService


PASSWORD = "profile-image-test-password"


@pytest.fixture(autouse=True)
def local_profile_storage(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    monkeypatch.setattr(settings, "secret_key", SecretStr("profile-images-test-secret-key-123456789"))
    monkeypatch.setattr(settings, "profile_image_storage_backend", "local")
    monkeypatch.setattr(settings, "profile_image_local_directory", str(tmp_path))
    monkeypatch.setattr(settings, "profile_image_max_bytes", 5 * 1024 * 1024)


def create_user(db: Session, username: str, role: str = "user") -> User:
    result = UserService().create_user(db, UserCreate(
        username=username, full_name=f"کاربر {username}", password=PASSWORD, role_code=role,
    ))
    return db.get(User, result.id)


def headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


def image_upload(kind: str) -> tuple[str, bytes, str]:
    formats = {
        "jpeg": ("avatar.jpg", "JPEG", "image/jpeg"),
        "png": ("avatar.png", "PNG", "image/png"),
        "webp": ("avatar.webp", "WEBP", "image/webp"),
    }
    filename, pillow_format, content_type = formats[kind]
    output = BytesIO()
    Image.new("RGB", (8, 8), (30, 80, 120)).save(output, format=pillow_format)
    return filename, output.getvalue(), content_type


@pytest.mark.parametrize("kind", ["jpeg", "png", "webp"])
def test_user_uploads_supported_profile_images(
    anonymous_client: TestClient, db_session: Session, tmp_path, kind: str,
) -> None:
    user = create_user(db_session, f"image-{kind}")
    filename, content, content_type = image_upload(kind)
    response = anonymous_client.put(
        f"/api/users/{user.id}/profile-image",
        headers=headers(user),
        files={"image": (filename, content, content_type)},
    )
    assert response.status_code == 200
    db_session.refresh(user)
    assert user.profile_image_key is not None
    assert (tmp_path / user.profile_image_key).is_file()
    assert response.json()["profile_image_url"].endswith(user.profile_image_key)


def test_replace_and_remove_profile_image_cleans_local_file(
    anonymous_client: TestClient, db_session: Session, tmp_path,
) -> None:
    user = create_user(db_session, "replace-image")
    first = image_upload("png")
    first_response = anonymous_client.put(
        f"/api/users/{user.id}/profile-image", headers=headers(user), files={"image": first},
    )
    assert first_response.status_code == 200
    db_session.refresh(user)
    first_key = user.profile_image_key
    second = image_upload("webp")
    second_response = anonymous_client.put(
        f"/api/users/{user.id}/profile-image", headers=headers(user), files={"image": second},
    )
    assert second_response.status_code == 200
    db_session.refresh(user)
    assert user.profile_image_key != first_key
    assert not (tmp_path / first_key).exists()
    assert (tmp_path / user.profile_image_key).exists()
    deleted = anonymous_client.delete(f"/api/users/{user.id}/profile-image", headers=headers(user))
    assert deleted.status_code == 200
    assert deleted.json()["profile_image_url"] is None
    assert user.profile_image_key is None
    assert not (tmp_path / second_response.json()["profile_image_url"].rsplit("/", 1)[-1]).exists()


def test_rejects_invalid_and_oversized_profile_uploads(
    anonymous_client: TestClient, db_session: Session,
) -> None:
    user = create_user(db_session, "bad-image")
    invalid = anonymous_client.put(
        f"/api/users/{user.id}/profile-image",
        headers=headers(user),
        files={"image": ("not-image.jpg", b"not an image", "image/jpeg")},
    )
    assert invalid.status_code == 422
    oversized = anonymous_client.put(
        f"/api/users/{user.id}/profile-image",
        headers=headers(user),
        files={"image": ("large.jpg", b"x" * (settings.profile_image_max_bytes + 1), "image/jpeg")},
    )
    assert oversized.status_code == 422
    db_session.refresh(user)
    assert user.profile_image_key is None


def test_rejects_path_like_original_filenames(
    anonymous_client: TestClient, db_session: Session,
) -> None:
    user = create_user(db_session, "path-image")
    _, content, content_type = image_upload("png")
    response = anonymous_client.put(
        f"/api/users/{user.id}/profile-image",
        headers=headers(user),
        files={"image": ("../avatar.png", content, content_type)},
    )
    assert response.status_code == 422


def test_only_owner_or_admin_can_change_a_profile_image(
    anonymous_client: TestClient, db_session: Session,
) -> None:
    owner = create_user(db_session, "owner")
    other = create_user(db_session, "other")
    admin = create_user(db_session, "profile-admin", "admin")
    image = image_upload("png")
    assert anonymous_client.put(
        f"/api/users/{owner.id}/profile-image", headers=headers(other), files={"image": image},
    ).status_code == 403
    assert anonymous_client.put(
        f"/api/users/{owner.id}/profile-image", files={"image": image},
    ).status_code == 401
    assert anonymous_client.put(
        f"/api/users/{owner.id}/profile-image", headers=headers(admin), files={"image": image},
    ).status_code == 200


def test_users_store_only_a_profile_image_key(db_session: Session) -> None:
    columns = inspect(User).columns
    assert "profile_image_key" in columns
    assert not any(column.name in {"profile_image", "profile_image_bytes", "profile_image_base64"} for column in columns)


def test_production_rejects_ephemeral_local_profile_storage(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "app_environment", "production")
    monkeypatch.setattr(settings, "profile_image_storage_backend", "local")
    with pytest.raises(RuntimeError, match="persistent object storage"):
        settings.validate_profile_image_storage()
