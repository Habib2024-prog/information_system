from dataclasses import dataclass
from datetime import date
from typing import Literal

from sqlalchemy import Select, func, literal, select, union_all
from sqlalchemy.engine import RowMapping
from sqlalchemy.orm import Session

from app.models.amir_observation import AmirObservation
from app.models.employee import Employee
from app.models.teacher_observation import TeacherObservation


ObservationHistoryType = Literal["teacher", "amir_senior_teacher"]


@dataclass(frozen=True)
class ScientificMemberObservationHistoryFilters:
    observation_type: ObservationHistoryType | None = None
    date_from: date | None = None
    date_to: date | None = None
    employee_id: int | None = None
    final_result_code: str | None = None


class ScientificMemberObservationRepository:
    def count_active_by_member_ids(
        self,
        db: Session,
        member_ids: list[int],
    ) -> dict[int, int]:
        if not member_ids:
            return {}

        counts = {member_id: 0 for member_id in member_ids}
        for observation_model in (TeacherObservation, AmirObservation):
            statement = (
                select(
                    observation_model.observer_scientific_member_id,
                    func.count(),
                )
                .where(
                    observation_model.observer_scientific_member_id.in_(member_ids),
                    observation_model.deleted_at.is_(None),
                )
                .group_by(observation_model.observer_scientific_member_id)
            )
            for member_id, count in db.execute(statement):
                counts[member_id] = counts.get(member_id, 0) + count

        return counts

    def list_active_history(
        self,
        db: Session,
        *,
        scientific_member_id: int,
        filters: ScientificMemberObservationHistoryFilters,
        sort_order: str,
        offset: int,
        limit: int,
    ) -> tuple[list[RowMapping], int]:
        history = self._history_union(scientific_member_id).subquery("observation_history")
        statement = self._apply_filters(select(history), history, filters)
        total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0

        order_expression = (
            history.c.observation_date.desc(),
            history.c.observation_id.desc(),
        )
        if sort_order == "asc":
            order_expression = (
                history.c.observation_date.asc(),
                history.c.observation_id.asc(),
            )

        rows = list(
            db.execute(statement.order_by(*order_expression).offset(offset).limit(limit)).mappings()
        )
        return rows, total

    @staticmethod
    def _history_union(scientific_member_id: int):
        teacher_history = (
            select(
                TeacherObservation.id.label("observation_id"),
                literal("teacher").label("observation_type"),
                TeacherObservation.employee_id.label("observed_employee_id"),
                Employee.name.label("observed_employee_name"),
                Employee.father_name.label("observed_employee_father_name"),
                Employee.job_title_code.label("observed_employee_job_title_code"),
                TeacherObservation.observation_date.label("observation_date"),
                TeacherObservation.subject.label("subject"),
                TeacherObservation.total_score.label("total_score"),
                TeacherObservation.final_result_code.label("final_result_code"),
            )
            .join(Employee, Employee.id == TeacherObservation.employee_id)
            .where(
                TeacherObservation.observer_scientific_member_id == scientific_member_id,
                TeacherObservation.deleted_at.is_(None),
            )
        )
        amir_history = (
            select(
                AmirObservation.id.label("observation_id"),
                literal("amir_senior_teacher").label("observation_type"),
                AmirObservation.employee_id.label("observed_employee_id"),
                Employee.name.label("observed_employee_name"),
                Employee.father_name.label("observed_employee_father_name"),
                Employee.job_title_code.label("observed_employee_job_title_code"),
                AmirObservation.observation_date.label("observation_date"),
                AmirObservation.subject.label("subject"),
                AmirObservation.total_score.label("total_score"),
                AmirObservation.final_result_code.label("final_result_code"),
            )
            .join(Employee, Employee.id == AmirObservation.employee_id)
            .where(
                AmirObservation.observer_scientific_member_id == scientific_member_id,
                AmirObservation.deleted_at.is_(None),
            )
        )
        return union_all(teacher_history, amir_history)

    @staticmethod
    def _apply_filters(
        statement: Select[tuple[object]],
        history: object,
        filters: ScientificMemberObservationHistoryFilters,
    ) -> Select[tuple[object]]:
        columns = history.c
        if filters.observation_type is not None:
            statement = statement.where(columns.observation_type == filters.observation_type)
        if filters.date_from is not None:
            statement = statement.where(columns.observation_date >= filters.date_from)
        if filters.date_to is not None:
            statement = statement.where(columns.observation_date <= filters.date_to)
        if filters.employee_id is not None:
            statement = statement.where(columns.observed_employee_id == filters.employee_id)
        if filters.final_result_code is not None:
            statement = statement.where(columns.final_result_code == filters.final_result_code)
        return statement
