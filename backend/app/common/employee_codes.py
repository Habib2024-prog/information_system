from typing import Final


TEACHER_JOB_TITLE_CODE: Final = "teacher"
AMIR_JOB_TITLE_CODE: Final = "amir"
SENIOR_TEACHER_JOB_TITLE_CODE: Final = "senior_teacher"

AMIR_OBSERVATION_ELIGIBLE_JOB_TITLE_CODES: Final[frozenset[str]] = frozenset(
    {AMIR_JOB_TITLE_CODE, SENIOR_TEACHER_JOB_TITLE_CODE}
)

JOB_TITLE_DISPLAY_LABELS: Final[dict[str, str]] = {
    TEACHER_JOB_TITLE_CODE: "معلم",
    AMIR_JOB_TITLE_CODE: "آمر",
    SENIOR_TEACHER_JOB_TITLE_CODE: "سرمعلم",
}

FIELD_MATCH_DISPLAY_LABELS: Final[dict[str, str]] = {
    "in_field": "مطابق رشته",
    "out_of_field": "خلاف رشته",
}


def get_job_title_display_label(code: str) -> str:
    return JOB_TITLE_DISPLAY_LABELS.get(code, "نامشخص")


def get_field_match_display_label(code: str) -> str:
    return FIELD_MATCH_DISPLAY_LABELS.get(code, "نامشخص")
