from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Annotated

from pydantic import AfterValidator, BeforeValidator, Field


def validate_observation_date(value: date) -> date:
    if value > date.today():
        raise ValueError("تاریخ مشاهده نمی‌تواند بعد از امروز باشد.")
    return value


def validate_competency_score(value: object) -> Decimal:
    try:
        score = value if isinstance(value, Decimal) else Decimal(str(value))
    except (InvalidOperation, ValueError) as error:
        raise ValueError("نمره باید بین ۰ تا ۳ و حداکثر دارای دو رقم اعشار باشد.") from error

    if not score.is_finite() or score < Decimal("0") or score > Decimal("3") or score.as_tuple().exponent < -2:
        raise ValueError("نمره باید بین ۰ تا ۳ و حداکثر دارای دو رقم اعشار باشد.")
    return score


ObservationDate = Annotated[date, AfterValidator(validate_observation_date)]
CompetencyScore = Annotated[
    Decimal,
    BeforeValidator(validate_competency_score),
    Field(ge=Decimal("0"), le=Decimal("3"), max_digits=4, decimal_places=2),
]
