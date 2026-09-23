from typing import Final


TEACHER_JOB_TITLE_CODE: Final = "teacher"
AMIR_JOB_TITLE_CODE: Final = "amir"
SENIOR_TEACHER_JOB_TITLE_CODE: Final = "senior_teacher"

AMIR_OBSERVATION_ELIGIBLE_JOB_TITLE_CODES: Final[frozenset[str]] = frozenset(
    {AMIR_JOB_TITLE_CODE, SENIOR_TEACHER_JOB_TITLE_CODE}
)
