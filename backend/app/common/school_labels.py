from typing import Final


SCHOOL_TYPE_DISPLAY_LABELS: Final[dict[str, str]] = {
    "high_school": "لیسه",
    "middle_school": "متوسطه",
    "primary_school": "ابتدائیه",
}

GENDER_TYPE_DISPLAY_LABELS: Final[dict[str, str]] = {
    "boys": "پسرانه",
    "girls": "دخترانه",
    "mixed": "مختلط",
}


def is_defined_school_type_code(code: str) -> bool:
    return code in SCHOOL_TYPE_DISPLAY_LABELS


def is_defined_gender_type_code(code: str) -> bool:
    return code in GENDER_TYPE_DISPLAY_LABELS


def get_school_type_display_label(code: str) -> str:
    return SCHOOL_TYPE_DISPLAY_LABELS[code]


def get_gender_type_display_label(code: str) -> str:
    return GENDER_TYPE_DISPLAY_LABELS[code]
