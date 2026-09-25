from decimal import Decimal
from typing import Final

from app.common.competency_display import format_competency_score_and_level


AMIR_COMPETENCY_LEVEL_NOT_EVALUABLE: Final = "not_evaluable"
AMIR_COMPETENCY_LEVEL_NEEDS_IMPROVEMENT: Final = "needs_improvement"
AMIR_COMPETENCY_LEVEL_HAS_CAPABILITY: Final = "has_capability"
AMIR_COMPETENCY_LEVEL_MASTERY: Final = "mastery"

AMIR_COMPETENCY_LEVEL_LABELS: Final[dict[str, str]] = {
    AMIR_COMPETENCY_LEVEL_NOT_EVALUABLE: "غیر قابل ارزیابی",
    AMIR_COMPETENCY_LEVEL_NEEDS_IMPROVEMENT: "نیازمند بهبود",
    AMIR_COMPETENCY_LEVEL_HAS_CAPABILITY: "دارای قابلیت",
    AMIR_COMPETENCY_LEVEL_MASTERY: "تسلط بر قابلیت",
}


def get_amir_competency_level(score: Decimal | None) -> str | None:
    if score is None:
        return None
    if Decimal("0") <= score <= Decimal("0.75"):
        return AMIR_COMPETENCY_LEVEL_NOT_EVALUABLE
    if Decimal("0.76") <= score <= Decimal("1.5"):
        return AMIR_COMPETENCY_LEVEL_NEEDS_IMPROVEMENT
    if Decimal("1.6") <= score <= Decimal("2.25"):
        return AMIR_COMPETENCY_LEVEL_HAS_CAPABILITY
    if Decimal("2.26") <= score <= Decimal("3"):
        return AMIR_COMPETENCY_LEVEL_MASTERY
    return None


def get_amir_competency_level_display_label(score: Decimal | None) -> str | None:
    level = get_amir_competency_level(score)
    return AMIR_COMPETENCY_LEVEL_LABELS[level] if level is not None else None


def format_amir_competency(score: Decimal | None) -> str | None:
    return format_competency_score_and_level(
        score,
        get_amir_competency_level_display_label(score),
    )
