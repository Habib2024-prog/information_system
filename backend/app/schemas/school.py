from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class SchoolGradeSectionWrite(BaseModel):
    """A named section and its student counts within a grade."""

    id: int | None = Field(default=None, ge=1)
    section_name: str = Field(min_length=1)
    enrolled_count: int = Field(default=0, ge=0)
    present_count: int = Field(default=0, ge=0)
    female_count: int = Field(default=0, ge=0)
    male_count: int = Field(default=0, ge=0)

    @field_validator("section_name")
    @classmethod
    def normalize_section_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("نام شعبه الزامی است.")
        return value

    @model_validator(mode="after")
    def ensure_present_count_does_not_exceed_enrolled_count(self) -> "SchoolGradeSectionWrite":
        if self.present_count > self.enrolled_count:
            raise ValueError("تعداد شاگردان حاضر نمی‌تواند بیشتر از تعداد داخله باشد.")
        if self.male_count > self.enrolled_count:
            raise ValueError("تعداد شاگردان ذکور نمی‌تواند بیشتر از تعداد داخله باشد.")
        if self.female_count > self.enrolled_count:
            raise ValueError("تعداد شاگردان اناث نمی‌تواند بیشتر از تعداد داخله باشد.")
        if self.male_count + self.female_count > self.enrolled_count:
            raise ValueError("مجموع شاگردان ذکور و اناث نمی‌تواند بیشتر از تعداد داخله باشد.")
        return self


class SchoolGradeSectionRead(BaseModel):
    id: int
    school_id: int
    section_name: str
    enrolled_count: int
    present_count: int
    female_count: int
    male_count: int
    created_at: datetime
    updated_at: datetime


class SchoolGradeTotalsRead(BaseModel):
    enrolled_count: int
    present_count: int
    female_count: int
    male_count: int


class SchoolGradeStatisticWrite(BaseModel):
    grade_number: int = Field(ge=1, le=12)
    sections: list[SchoolGradeSectionWrite] = Field(default_factory=list)

    @model_validator(mode="after")
    def ensure_unique_section_names(self) -> "SchoolGradeStatisticWrite":
        names = [section.section_name for section in self.sections]
        if len(names) != len(set(names)):
            raise ValueError("نام شعبه در یک صنف تکراری است.")
        return self


class SchoolGradeStatisticRead(BaseModel):
    grade_number: int
    sections: list[SchoolGradeSectionRead]
    totals: SchoolGradeTotalsRead


class SchoolWrite(BaseModel):
    school_name: str = Field(min_length=1)
    school_head_phone: str | None = None
    school_type_code: str = Field(min_length=1, max_length=100)
    gender_type_code: str = Field(min_length=1, max_length=100)
    school_code: str = Field(min_length=1, max_length=100)
    school_formation: str = Field(min_length=1)
    senior_teacher_count: int = Field(default=0, ge=0)
    male_teacher_count: int = Field(default=0, ge=0)
    female_teacher_count: int = Field(default=0, ge=0)
    incoming_service_teacher_count: int = Field(default=0, ge=0)
    outgoing_service_teacher_count: int = Field(default=0, ge=0)
    volunteer_teacher_count: int = Field(default=0, ge=0)
    active_class_section_count: int = Field(default=0, ge=0)
    school_needs: str | None = None
    school_equipment: str | None = None
    grade_statistics: list[SchoolGradeStatisticWrite] = Field(default_factory=list)

    @field_validator("school_type_code", "gender_type_code")
    @classmethod
    def normalize_display_code(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("school_code")
    @classmethod
    def normalize_school_code(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def ensure_unique_grade_numbers_and_section_ids(self) -> "SchoolWrite":
        grade_numbers = [grade.grade_number for grade in self.grade_statistics]
        if len(grade_numbers) != len(set(grade_numbers)):
            raise ValueError("شماره‌های صنف تکراری است.")
        section_ids = [section.id for grade in self.grade_statistics for section in grade.sections if section.id]
        if len(section_ids) != len(set(section_ids)):
            raise ValueError("شعبه‌های تکراری ارسال شده است.")
        return self


class SchoolCreate(SchoolWrite):
    pass


class SchoolUpdate(SchoolWrite):
    pass


class SchoolRead(BaseModel):
    id: int
    school_name: str
    school_head_phone: str | None
    school_type_code: str
    school_type_display_name: str
    gender_type_code: str
    gender_type_display_name: str
    school_code: str
    school_formation: str
    senior_teacher_count: int
    male_teacher_count: int
    female_teacher_count: int
    incoming_service_teacher_count: int
    outgoing_service_teacher_count: int
    volunteer_teacher_count: int
    active_class_section_count: int
    school_needs: str | None
    school_equipment: str | None
    grade_statistics: list[SchoolGradeStatisticRead]
    created_at: datetime
    updated_at: datetime


class SchoolListResponse(BaseModel):
    items: list[SchoolRead]
    total: int
    page: int
    page_size: int


SchoolSortField = Literal[
    "id",
    "school_name",
    "school_code",
    "school_type_code",
    "gender_type_code",
    "school_formation",
]
SortOrder = Literal["asc", "desc"]
