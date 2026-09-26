from decimal import Decimal
from typing import Final


AMIR_FINAL_RESULT_BASIC_CAPABILITY: Final = "basic_capability"
AMIR_FINAL_RESULT_APPLIED_CAPABILITY: Final = "applied_capability"
AMIR_FINAL_RESULT_MASTERY: Final = "mastery"

AMIR_FINAL_RESULT_LABELS: Final[dict[str, str]] = {
    AMIR_FINAL_RESULT_BASIC_CAPABILITY: "قابلیت ابتدایی",
    AMIR_FINAL_RESULT_APPLIED_CAPABILITY: "قابلیت بکارگیری",
    AMIR_FINAL_RESULT_MASTERY: "مسلط بر قابلیت",
}


def get_amir_final_result_code(total_score: Decimal) -> str | None:
    """Classify an exact, unrounded Amir/Senior Teacher Observation total."""
    if Decimal("1.00") <= total_score <= Decimal("4.99"):
        return AMIR_FINAL_RESULT_BASIC_CAPABILITY
    if Decimal("5.00") <= total_score <= Decimal("8.99"):
        return AMIR_FINAL_RESULT_APPLIED_CAPABILITY
    if Decimal("9.00") <= total_score <= Decimal("12.00"):
        return AMIR_FINAL_RESULT_MASTERY
    return None


def get_amir_final_result_display_label(code: str | None) -> str | None:
    if code is None:
        return None
    return AMIR_FINAL_RESULT_LABELS.get(code, "نامشخص")
