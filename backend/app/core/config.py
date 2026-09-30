from functools import lru_cache
import os
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    """Environment-backed application settings."""

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    postgres_db: str | None = None
    postgres_user: str | None = None
    postgres_password: str | None = None
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    cors_origins_raw: str = "http://localhost:3000,http://localhost:5173"
    secret_key: SecretStr | None = None
    jwt_algorithm: Literal["HS256", "HS384", "HS512"] = "HS256"
    access_token_expire_minutes: int = Field(default=60, gt=0)
    app_environment: Literal["development", "test", "cloud", "production"] = "development"
    profile_image_storage_backend: Literal["local", "s3"] = "local"
    profile_image_local_directory: str = "backend/uploads/profile-images"
    profile_image_local_persistent: bool = False
    profile_image_max_bytes: int = Field(default=5 * 1024 * 1024, gt=0)
    profile_image_s3_bucket: str | None = None
    profile_image_s3_region: str | None = None
    profile_image_s3_endpoint_url: str | None = None
    profile_image_s3_public_base_url: str | None = None
    profile_image_s3_prefix: str = "profile-images"

    @property
    def database_url(self) -> str:
        if not all((self.postgres_db, self.postgres_user, self.postgres_password)):
            raise RuntimeError(
                "POSTGRES_DB, POSTGRES_USER, and POSTGRES_PASSWORD must be configured."
            )

        return (
            "postgresql+psycopg://"
            f"{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]

    def profile_image_storage_unavailable_reason(self) -> str | None:
        """Return why profile-image storage is unavailable without blocking app startup.

        Profile images are an optional media feature.  Calling code that needs to
        read or write media can use this result to fail closed, while core API
        endpoints remain available when a cloud service has not configured
        persistent media storage yet.
        """
        render_runtime = bool(
            os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID") or os.getenv("RENDER_EXTERNAL_URL")
        )
        if self.profile_image_storage_backend == "local" and render_runtime:
            return (
                "Render local filesystem is not persistent for profile images; configure S3 storage."
            )
        if (
            self.app_environment in {"cloud", "production"}
            and self.profile_image_storage_backend == "local"
            and not self.profile_image_local_persistent
        ):
            return (
                "PROFILE_IMAGE_LOCAL_PERSISTENT=true is required for verified persistent local production storage."
            )
        if self.profile_image_storage_backend == "s3" and not all((
            self.profile_image_s3_bucket,
            self.profile_image_s3_public_base_url,
        )):
            return (
                "PROFILE_IMAGE_S3_BUCKET and PROFILE_IMAGE_S3_PUBLIC_BASE_URL are required for S3 storage."
            )
        return None

    def validate_profile_image_storage(self) -> None:
        """Raise when a profile-image storage operation is attempted unsafely."""
        if reason := self.profile_image_storage_unavailable_reason():
            raise RuntimeError(reason)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
