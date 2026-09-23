from typing import Final


EDUCATION_TRAINING_DEPARTMENT_CODE: Final = "education_training"

DEPARTMENT_DISPLAY_LABELS: Final[dict[str, str]] = {
    EDUCATION_TRAINING_DEPARTMENT_CODE: "تعلیم و تربیه",
    "dari_language_literature": "زبان و ادبیات دری",
    "pashto_language_literature": "زبان و ادبیات پشتو",
    "arabic_language": "زبان عربی",
    "science": "ساینس",
    "mathematics": "ریاضی",
    "english_language_literature": "زبان و ادبیات انگلیسی",
    "social_sciences": "علوم اجتماعی",
    "religious_sciences": "علوم دینی",
    "computer": "کمپیوتر",
}


def is_defined_department_code(code: str) -> bool:
    return code in DEPARTMENT_DISPLAY_LABELS


def get_department_display_label(code: str) -> str:
    return DEPARTMENT_DISPLAY_LABELS[code]
