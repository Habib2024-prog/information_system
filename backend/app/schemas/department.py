from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DepartmentWrite(BaseModel):
    code: str = Field(min_length=1, max_length=100, pattern=r"^[a-z][a-z0-9_]*$")

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        return value.strip().lower()


class DepartmentCreate(DepartmentWrite):
    pass


class DepartmentUpdate(DepartmentWrite):
    pass


class DepartmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    display_name: str
    created_at: datetime
    updated_at: datetime
