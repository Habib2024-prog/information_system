from decimal import Decimal


def format_competency_score_and_level(score: Decimal | None, level_label: str | None) -> str | None:
    if score is None:
        return None

    score_text = _format_score(score)
    return f"{score_text} - {level_label}" if level_label is not None else score_text


def _format_score(score: Decimal) -> str:
    if score.as_tuple().exponent >= -2:
        return f"{score:.2f}"
    return format(score, "f")
