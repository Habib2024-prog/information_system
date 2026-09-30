from io import BytesIO

import pytest
from PIL import Image
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate
from app.services.profile_image_storage import (
    LOCAL_MEDIA_URL,
    LocalProfileImageStorage,
    S3ProfileImageStorage,
    get_profile_image_storage,
    validate_profile_image,
)
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


def test_profile_image_key_survives_later_login_and_current_user_requests(
    anonymous_client: TestClient, db_session: Session,
) -> None:
    user = create_user(db_session, "persistent-profile-key")
    uploaded = anonymous_client.put(
        f"/api/users/{user.id}/profile-image", headers=headers(user), files={"image": image_upload("png")},
    )
    assert uploaded.status_code == 200
    db_session.refresh(user)
    key = user.profile_image_key
    assert key is not None

    first_login = anonymous_client.post("/api/auth/login", json={"username": user.username, "password": PASSWORD})
    second_login = anonymous_client.post("/api/auth/login", json={"username": user.username, "password": PASSWORD})
    assert first_login.status_code == second_login.status_code == 200
    assert first_login.json()["user"]["profile_image_url"].endswith(key)
    assert second_login.json()["user"]["profile_image_url"].endswith(key)

    current = anonymous_client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {second_login.json()['access_token']}"},
    )
    assert current.status_code == 200
    assert current.json()["profile_image_url"].endswith(key)


def test_s3_profile_url_is_derived_from_the_stable_key_not_a_presigned_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "profile_image_storage_backend", "s3")
    monkeypatch.setattr(settings, "profile_image_s3_bucket", "profile-images")
    monkeypatch.setattr(settings, "profile_image_s3_public_base_url", "https://media.example.test")
    settings.validate_profile_image_storage()
    storage = object.__new__(S3ProfileImageStorage)
    storage.public_base_url = "https://media.example.test"
    storage.prefix = "profile-images"
    url = storage.url_for("stable-key.webp")
    assert url == "https://media.example.test/profile-images/stable-key.webp"
    assert "X-Amz-" not in url


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


def test_production_requires_explicit_persistent_local_profile_storage(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "app_environment", "production")
    monkeypatch.setattr(settings, "profile_image_storage_backend", "local")
    monkeypatch.setattr(settings, "profile_image_local_persistent", False)
    with pytest.raises(RuntimeError, match="PROFILE_IMAGE_LOCAL_PERSISTENT"):
        settings.validate_profile_image_storage()


def test_office_server_can_explicitly_use_persistent_local_profile_storage(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
) -> None:
    monkeypatch.setattr(settings, "app_environment", "production")
    monkeypatch.setattr(settings, "profile_image_storage_backend", "local")
    monkeypatch.setattr(settings, "profile_image_local_persistent", True)
    monkeypatch.setattr(settings, "profile_image_local_directory", str(tmp_path))
    settings.validate_profile_image_storage()
    filename, content, content_type = image_upload("png")
    image = validate_profile_image(content=content, content_type=content_type, filename=filename)
    storage = get_profile_image_storage()
    assert isinstance(storage, LocalProfileImageStorage)
    key = storage.save(image)
    assert (tmp_path / key).is_file()


def test_render_rejects_local_profile_storage_even_if_environment_is_misconfigured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "app_environment", "development")
    monkeypatch.setattr(settings, "profile_image_storage_backend", "local")
    monkeypatch.setenv("RENDER", "true")
    with pytest.raises(RuntimeError, match="Render local filesystem"):
        settings.validate_profile_image_storage()


def test_render_without_persistent_media_starts_and_rejects_profile_image_changes(
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
) -> None:
    """Cloud deployments remain usable but never write images to ephemeral disk."""
    from app.main import create_app

    ephemeral_directory = tmp_path / "render-ephemeral-profile-images"
    monkeypatch.setattr(settings, "app_environment", "cloud")
    monkeypatch.setattr(settings, "profile_image_storage_backend", "local")
    monkeypatch.setattr(settings, "profile_image_local_persistent", False)
    monkeypatch.setattr(settings, "profile_image_local_directory", str(ephemeral_directory))
    monkeypatch.setenv("RENDER", "true")

    unsafe_media_app = create_app()
    assert unsafe_media_app.state.profile_image_storage_unavailable_reason is not None
    assert not any(getattr(route, "path", None) == LOCAL_MEDIA_URL for route in unsafe_media_app.routes)

    def override_get_db():
        try:
            yield db_session
        finally:
            db_session.info.pop("audit_context", None)

    unsafe_media_app.dependency_overrides[get_db] = override_get_db
    user = create_user(db_session, "render-media-user")
    user.profile_image_key = "existing-profile-image.webp"
    db_session.commit()

    with TestClient(unsafe_media_app) as client:
        # Core endpoints retain normal behavior and existing keys render as a
        # fallback avatar because an image URL cannot safely be served.
        assert client.get("/health").status_code == 200
        login = client.post("/api/auth/login", json={"username": user.username, "password": PASSWORD})
        assert login.status_code == 200
        authenticated_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        current = client.get("/api/auth/me", headers=authenticated_headers)
        assert current.status_code == 200
        assert current.json()["profile_image_url"] is None
        assert client.get("/api/employees", headers=authenticated_headers).status_code == 200

        filename, content, content_type = image_upload("png")
        upload = client.put(
            f"/api/users/{user.id}/profile-image",
            headers=authenticated_headers,
            files={"image": (filename, content, content_type)},
        )
        assert upload.status_code == 503
        assert "ذخیره" in upload.json()["detail"]

        removal = client.delete(f"/api/users/{user.id}/profile-image", headers=authenticated_headers)
        assert removal.status_code == 503

    db_session.refresh(user)
    assert user.profile_image_key == "existing-profile-image.webp"
    assert not ephemeral_directory.exists()
    unsafe_media_app.dependency_overrides.clear()
