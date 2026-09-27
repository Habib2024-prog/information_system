from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator

from app.common.role_codes import RoleCode


class UserWrite(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)
    username: str = Field(min_length=1)
    full_name: str = Field(min_length=1)
    role_code: RoleCode
    is_active: bool = True

    @field_validator("username", "full_name")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("این فیلد الزامی است.")
        return value


def validate_password(value: SecretStr) -> SecretStr:
    if len(value.get_secret_value()) < 8:
        raise ValueError("رمز عبور باید حداقل ۸ حرف داشته باشد.")
    return value


class UserCreate(UserWrite):
    password: SecretStr

    _password_validation = field_validator("password")(validate_password)


class UserUpdate(UserWrite):
    pass


class UserPasswordUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)
    new_password: SecretStr

    _password_validation = field_validator("new_password")(validate_password)


class CurrentUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    full_name: str
    role_code: RoleCode
    is_active: bool


class UserRead(CurrentUserRead):
    created_at: datetime
    updated_at: datetime


class UserListResponse(BaseModel):
    items: list[UserRead]
    total: int
    page: int
    page_size: int
