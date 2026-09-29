"""Canonical validation for human telephone numbers stored by this application.

Phone values are deliberately kept as text so an initial zero remains part of
the value.  Only ASCII digits are stored after accepting the two common
Persian/Arabic digit sets at the API boundary.
"""

import re


PHONE_NUMBER_ERROR = "شماره تماس باید دقیقاً ۱۰ رقم باشد."

_DIGIT_TRANSLATION = str.maketrans({
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
})


def normalize_phone_number(value: str | None, *, optional: bool) -> str | None:
    """Return an ASCII 10-digit phone value, or ``None`` for optional blanks.

    Delimiters and internal whitespace are intentionally not removed: they
    are not part of the canonical stored format and must be corrected by the
    caller instead of being silently changed.
    """
    if value is None:
        if optional:
            return None
        raise ValueError(PHONE_NUMBER_ERROR)

    normalized = value.strip().translate(_DIGIT_TRANSLATION)
    if not normalized and optional:
        return None
    if re.fullmatch(r"[0-9]{10}", normalized) is None:
        raise ValueError(PHONE_NUMBER_ERROR)
    return normalized
