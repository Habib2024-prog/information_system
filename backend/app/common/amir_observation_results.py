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
    if Decimal("1") <= total_score <= Decimal("4"):
        return AMIR_FINAL_RESULT_BASIC_CAPABILITY
    if Decimal("5") <= total_score <= Decimal("8"):
        return AMIR_FINAL_RESULT_APPLIED_CAPABILITY
    if Decimal("9") <= total_score <= Decimal("12"):
        return AMIR_FINAL_RESULT_MASTERY
    return None
