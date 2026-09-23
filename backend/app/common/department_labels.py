from typing import Final


DEPARTMENT_DISPLAY_LABELS: Final[dict[str, str]] = {
    "education_training": "تعلیم و تربیه",
}


def is_defined_department_code(code: str) -> bool:
    return code in DEPARTMENT_DISPLAY_LABELS


def get_department_display_label(code: str) -> str:
    return DEPARTMENT_DISPLAY_LABELS[code]
