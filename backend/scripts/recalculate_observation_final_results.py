"""Recalculate active observation result codes after approved scoring-rule changes.

Run a report first:
    python -m scripts.recalculate_observation_final_results

Apply only after reviewing the report:
    python -m scripts.recalculate_observation_final_results --apply
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.amir_observation_results import get_amir_final_result_code
from app.common.teacher_observation_results import get_teacher_final_result_code
from app.db.session import SessionLocal
from app.models.amir_observation import AmirObservation
from app.models.teacher_observation import TeacherObservation


@dataclass(frozen=True)
class RecalculationSummary:
    teacher_changed: int
    amir_changed: int

    @property
    def total_changed(self) -> int:
        return self.teacher_changed + self.amir_changed


def recalculate_active_observation_final_results(db: Session) -> RecalculationSummary:
    """Update only changed result codes for active observations.

    Scores, total scores, and all other observation form data are left intact.
    The caller owns the transaction so a dry run has no side effects.
    """
    teacher_changed = 0
    for observation in db.scalars(
        select(TeacherObservation).where(TeacherObservation.deleted_at.is_(None))
    ):
        result_code = get_teacher_final_result_code(observation.total_score)
        if observation.final_result_code != result_code:
            observation.final_result_code = result_code
            teacher_changed += 1

    amir_changed = 0
    for observation in db.scalars(
        select(AmirObservation).where(AmirObservation.deleted_at.is_(None))
    ):
        result_code = get_amir_final_result_code(observation.total_score)
        if observation.final_result_code != result_code:
            observation.final_result_code = result_code
            amir_changed += 1

    return RecalculationSummary(teacher_changed=teacher_changed, amir_changed=amir_changed)


def main() -> None:
    parser = argparse.ArgumentParser(description="Recalculate active observation final-result codes.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Persist changes. Without this flag, the command is a rollback-only dry run.",
    )
    args = parser.parse_args()

    with SessionLocal() as db:
        summary = recalculate_active_observation_final_results(db)
        if args.apply:
            db.commit()
            action = "Applied"
        else:
            db.rollback()
            action = "Dry run"

    print(
        f"{action}: {summary.teacher_changed} teacher and {summary.amir_changed} "
        f"Amir/Senior Teacher observation result codes would change."
    )


if __name__ == "__main__":
    main()
