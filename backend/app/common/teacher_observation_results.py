from decimal import Decimal
from typing import Final


TEACHER_FINAL_RESULT_NEEDS_IMPROVEMENT: Final = "needs_improvement"
TEACHER_FINAL_RESULT_HAS_CAPABILITY: Final = "has_capability"
TEACHER_FINAL_RESULT_MASTERY: Final = "mastery"

TEACHER_FINAL_RESULT_LABELS: Final[dict[str, str]] = {
    TEACHER_FINAL_RESULT_NEEDS_IMPROVEMENT: "نیازمند بهبود",
    TEACHER_FINAL_RESULT_HAS_CAPABILITY: "دارای قابلیت",
    TEACHER_FINAL_RESULT_MASTERY: "تسلط بر قابلیت",
}


def get_teacher_final_result_code(total_score: Decimal) -> str | None:
    """Classify an exact, unrounded Teacher Observation total."""
    if Decimal("1.00") <= total_score <= Decimal("10.99"):
        return TEACHER_FINAL_RESULT_NEEDS_IMPROVEMENT
    if Decimal("11.00") <= total_score <= Decimal("14.99"):
        return TEACHER_FINAL_RESULT_HAS_CAPABILITY
    if Decimal("15.00") <= total_score <= Decimal("18.00"):
        return TEACHER_FINAL_RESULT_MASTERY
    return None


def get_teacher_final_result_display_label(code: str | None) -> str | None:
    if code is None:
        return None
    return TEACHER_FINAL_RESULT_LABELS.get(code, "نامشخص")
