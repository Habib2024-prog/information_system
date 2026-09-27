from pydantic import BaseModel, ConfigDict, Field, SecretStr

from app.schemas.user import CurrentUserRead


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)
    username: str = Field(min_length=1)
    password: SecretStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: CurrentUserRead
