from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Protocol
from urllib.parse import quote
from uuid import uuid4
import warnings

from PIL import Image, UnidentifiedImageError

from app.core.config import settings


LOCAL_MEDIA_URL = "/media/profile-images"
MAX_IMAGE_PIXELS = 20_000_000

_FORMATS = {
    "JPEG": {"mime": "image/jpeg", "extensions": {".jpg", ".jpeg"}, "extension": ".jpg"},
    "PNG": {"mime": "image/png", "extensions": {".png"}, "extension": ".png"},
    "WEBP": {"mime": "image/webp", "extensions": {".webp"}, "extension": ".webp"},
}


class ProfileImageValidationError(Exception):
    """Raised when an uploaded image is not a safe supported image."""


@dataclass(frozen=True)
class ValidatedProfileImage:
    content: bytes
    content_type: str
    extension: str


class ProfileImageStorage(Protocol):
    def save(self, image: ValidatedProfileImage) -> str: ...

    def delete(self, key: str | None) -> None: ...

    def url_for(self, key: str | None) -> str | None: ...


def validate_profile_image(*, content: bytes, content_type: str | None, filename: str | None) -> ValidatedProfileImage:
    if not content:
        raise ProfileImageValidationError("فایل تصویر خالی است.")
    if len(content) > settings.profile_image_max_bytes:
        raise ProfileImageValidationError("حجم تصویر نباید بیشتر از ۵ مگابایت باشد.")

    declared_type = (content_type or "").split(";", 1)[0].strip().lower()
    if declared_type not in {item["mime"] for item in _FORMATS.values()}:
        raise ProfileImageValidationError("فقط فایل‌های JPG، PNG و WebP پذیرفته می‌شوند.")

    original_name = filename or ""
    if not original_name or "/" in original_name or "\\" in original_name:
        raise ProfileImageValidationError("نام فایل تصویر معتبر نیست.")
    suffix = Path(original_name).suffix.lower()
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(content)) as image:
                image_format = image.format
                width, height = image.size
                image.verify()
            if width * height > MAX_IMAGE_PIXELS:
                raise ProfileImageValidationError("ابعاد تصویر بیش از حد بزرگ است.")
            with Image.open(BytesIO(content)) as image:
                image.load()
    except ProfileImageValidationError:
        raise
    except (Image.DecompressionBombError, OSError, UnidentifiedImageError, ValueError) as error:
        raise ProfileImageValidationError("فایل انتخاب‌شده یک تصویر معتبر نیست.") from error

    format_details = _FORMATS.get(image_format or "")
    if format_details is None or declared_type != format_details["mime"] or suffix not in format_details["extensions"]:
        raise ProfileImageValidationError("نوع، پسوند و محتوای تصویر باید با هم مطابقت داشته باشند.")
    return ValidatedProfileImage(
        content=content,
        content_type=format_details["mime"],
        extension=format_details["extension"],
    )


def _safe_key(key: str) -> str:
    if not key or Path(key).name != key or Path(key).suffix.lower() not in {".jpg", ".png", ".webp"}:
        raise ValueError("Invalid profile image key.")
    return key


def _new_key(extension: str) -> str:
    return f"{uuid4().hex}{extension}"


class LocalProfileImageStorage:
    def __init__(self, directory: Path | None = None) -> None:
        project_root = Path(__file__).resolve().parents[3]
        configured = Path(settings.profile_image_local_directory)
        self.directory = directory or (configured if configured.is_absolute() else project_root / configured)

    def save(self, image: ValidatedProfileImage) -> str:
        self.directory.mkdir(parents=True, exist_ok=True)
        key = _new_key(image.extension)
        destination = self.directory / key
        destination.write_bytes(image.content)
        return key

    def delete(self, key: str | None) -> None:
        if not key:
            return
        try:
            (self.directory / _safe_key(key)).unlink(missing_ok=True)
        except OSError:
            # A missing or locked stale file must not undo the database update.
            return

    def url_for(self, key: str | None) -> str | None:
        if not key:
            return None
        return f"{LOCAL_MEDIA_URL}/{quote(_safe_key(key))}"


class S3ProfileImageStorage:
    def __init__(self) -> None:
        settings.validate_profile_image_storage()
        try:
            import boto3
        except ImportError as error:  # pragma: no cover - dependency is declared for production installs.
            raise RuntimeError("boto3 is required for S3 profile image storage.") from error
        self.bucket = settings.profile_image_s3_bucket
        self.public_base_url = settings.profile_image_s3_public_base_url.rstrip("/")
        self.prefix = settings.profile_image_s3_prefix.strip("/")
        self.client = boto3.client(
            "s3",
            region_name=settings.profile_image_s3_region,
            endpoint_url=settings.profile_image_s3_endpoint_url,
        )

    def _object_key(self, key: str) -> str:
        return f"{self.prefix}/{_safe_key(key)}" if self.prefix else _safe_key(key)

    def save(self, image: ValidatedProfileImage) -> str:
        key = _new_key(image.extension)
        self.client.put_object(
            Bucket=self.bucket,
            Key=self._object_key(key),
            Body=image.content,
            ContentType=image.content_type,
            CacheControl="public, max-age=31536000, immutable",
        )
        return key

    def delete(self, key: str | None) -> None:
        if key:
            self.client.delete_object(Bucket=self.bucket, Key=self._object_key(key))

    def url_for(self, key: str | None) -> str | None:
        return f"{self.public_base_url}/{quote(self._object_key(key))}" if key else None


def get_profile_image_storage() -> ProfileImageStorage:
    if settings.profile_image_storage_backend == "s3":
        return S3ProfileImageStorage()
    return LocalProfileImageStorage()


def profile_image_url(key: str | None) -> str | None:
    return get_profile_image_storage().url_for(key)
