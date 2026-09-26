from datetime import date, datetime, timezone
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.common.amir_observation_results import get_amir_final_result_code
from app.common.teacher_observation_results import get_teacher_final_result_code
from app.models.amir_observation import AmirObservation
from app.models.teacher_observation import TeacherObservation
from scripts.recalculate_observation_final_results import (
    recalculate_active_observation_final_results,
)


@pytest.mark.parametrize(
    ("total", "expected"),
    [
        ("0.99", None),
        ("1.00", "needs_improvement"),
        ("10.99", "needs_improvement"),
        ("11.00", "has_capability"),
        ("14.80", "has_capability"),
        ("14.99", "has_capability"),
        ("14.995", None),
        ("15.00", "mastery"),
        ("18.00", "mastery"),
    ],
)
def test_teacher_final_result_uses_exact_decimal_ranges(total: str, expected: str | None) -> None:
    assert get_teacher_final_result_code(Decimal(total)) == expected


@pytest.mark.parametrize(
    ("total", "expected"),
    [
        ("0.99", None),
        ("1.00", "basic_capability"),
        ("4.50", "basic_capability"),
        ("4.99", "basic_capability"),
        ("5.00", "applied_capability"),
        ("8.50", "applied_capability"),
        ("8.99", "applied_capability"),
        ("8.995", None),
        ("9.00", "mastery"),
        ("12.00", "mastery"),
    ],
)
def test_amir_final_result_uses_exact_decimal_ranges(total: str, expected: str | None) -> None:
    assert get_amir_final_result_code(Decimal(total)) == expected


def test_maintenance_recalculates_only_active_rows_and_preserves_total_scores(
    db_session: Session,
) -> None:
    teacher = TeacherObservation(
        employee_id=1,
        observer_scientific_member_id=1,
        observation_date=date(2026, 9, 1),
        observed_class="صنف دهم",
        subject="ریاضی",
        subject_knowledge_score=Decimal("3.00"),
        lesson_plan_score=Decimal("3.00"),
        classroom_management_score=Decimal("3.00"),
        assessment_score=Decimal("3.00"),
        professional_learning_score=Decimal("2.80"),
        community_engagement_score=Decimal("0.00"),
        total_score=Decimal("14.80"),
        final_result_code=None,
    )
    amir = AmirObservation(
        employee_id=2,
        observer_scientific_member_id=2,
        observation_date=date(2026, 9, 1),
        observed_class="صنف دهم",
        subject="رهبری",
        responsibility_score=Decimal("2.00"),
        professional_leadership_score=Decimal("2.00"),
        community_relations_score=Decimal("2.00"),
        professional_development_score=Decimal("2.50"),
        total_score=Decimal("8.50"),
        final_result_code=None,
    )
    deleted_teacher = TeacherObservation(
        employee_id=3,
        observer_scientific_member_id=3,
        observation_date=date(2026, 9, 1),
        observed_class="صنف دهم",
        subject="فزیک",
        subject_knowledge_score=Decimal("3.00"),
        lesson_plan_score=Decimal("3.00"),
        classroom_management_score=Decimal("3.00"),
        assessment_score=Decimal("3.00"),
        professional_learning_score=Decimal("2.80"),
        community_engagement_score=Decimal("0.00"),
        total_score=Decimal("14.80"),
        final_result_code=None,
        deleted_at=datetime.now(timezone.utc),
    )
    db_session.add_all([teacher, amir, deleted_teacher])
    db_session.flush()

    summary = recalculate_active_observation_final_results(db_session)

    assert summary.teacher_changed == 1
    assert summary.amir_changed == 1
    assert teacher.total_score == Decimal("14.80")
    assert amir.total_score == Decimal("8.50")
    assert teacher.final_result_code == "has_capability"
    assert amir.final_result_code == "applied_capability"
    assert deleted_teacher.final_result_code is None
