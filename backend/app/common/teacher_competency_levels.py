from decimal import Decimal
from typing import Final

from app.common.competency_display import format_competency_score_and_level


TEACHER_COMPETENCY_LEVEL_NOT_OBSERVED: Final = "not_observed"
TEACHER_COMPETENCY_LEVEL_NEEDS_IMPROVEMENT: Final = "needs_improvement"
TEACHER_COMPETENCY_LEVEL_HAS_CAPABILITY: Final = "has_capability"
TEACHER_COMPETENCY_LEVEL_MASTERY: Final = "mastery"

TEACHER_COMPETENCY_LEVEL_LABELS: Final[dict[str, str]] = {
    TEACHER_COMPETENCY_LEVEL_NOT_OBSERVED: "قابلیت مشاهده نشد",
    TEACHER_COMPETENCY_LEVEL_NEEDS_IMPROVEMENT: "نیازمند بهبود",
    TEACHER_COMPETENCY_LEVEL_HAS_CAPABILITY: "دارای قابلیت",
    TEACHER_COMPETENCY_LEVEL_MASTERY: "تسلط بر قابلیت",
}


def get_teacher_competency_level(score: Decimal | None) -> str | None:
    if score is None:
        return None
    if Decimal("0") <= score <= Decimal("0.75"):
        return TEACHER_COMPETENCY_LEVEL_NOT_OBSERVED
    if Decimal("0.76") <= score <= Decimal("1.5"):
        return TEACHER_COMPETENCY_LEVEL_NEEDS_IMPROVEMENT
    if Decimal("1.6") <= score <= Decimal("2.25"):
        return TEACHER_COMPETENCY_LEVEL_HAS_CAPABILITY
    if Decimal("2.26") <= score <= Decimal("3"):
        return TEACHER_COMPETENCY_LEVEL_MASTERY
    return None


def get_teacher_competency_level_display_label(score: Decimal | None) -> str | None:
    level = get_teacher_competency_level(score)
    return TEACHER_COMPETENCY_LEVEL_LABELS[level] if level is not None else None


def format_teacher_competency(score: Decimal | None) -> str | None:
    return format_competency_score_and_level(
        score,
        get_teacher_competency_level_display_label(score),
    )
