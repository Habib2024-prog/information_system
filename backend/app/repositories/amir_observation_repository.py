from dataclasses import dataclass
from datetime import date, datetime, timezone

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, joinedload

from app.models.employee import Employee
from app.models.scientific_member import ScientificMember
from app.models.amir_observation import AmirObservation


@dataclass(frozen=True)
class AmirObservationFilters:
    observation_date_from: date | None = None
    observation_date_to: date | None = None
    subject: str | None = None
    observer_scientific_member_id: int | None = None
    final_result_code: str | None = None


class AmirObservationRepository:
    def list_active_for_employee(
        self,
        db: Session,
        *,
        employee_id: int,
        filters: AmirObservationFilters,
        sort_by: str,
        sort_order: str,
        offset: int,
        limit: int,
    ) -> tuple[list[AmirObservation], int]:
        statement = self._apply_filters(
            select(AmirObservation).where(AmirObservation.employee_id == employee_id),
            filters,
        )
        total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0

        sort_column = getattr(AmirObservation, sort_by)
        order_expression = sort_column.desc() if sort_order == "desc" else sort_column.asc()
        observations = list(
            db.scalars(
                statement.options(joinedload(AmirObservation.observer))
                .order_by(order_expression)
                .offset(offset)
                .limit(limit)
            )
        )
        return observations, total

    def get_by_id_for_employee(
        self,
        db: Session,
        *,
        employee_id: int,
        observation_id: int,
    ) -> AmirObservation | None:
        statement = (
            select(AmirObservation)
            .options(joinedload(AmirObservation.observer))
            .where(
                AmirObservation.id == observation_id,
                AmirObservation.employee_id == employee_id,
                AmirObservation.deleted_at.is_(None),
            )
        )
        return db.scalar(statement)

    def list_active_for_export(
        self,
        db: Session,
        *,
        employee_id: int | None,
        filters: AmirObservationFilters,
        sort_by: str,
        sort_order: str,
    ) -> list[tuple[AmirObservation, Employee, ScientificMember]]:
        statement = self._apply_filters(
            select(AmirObservation, Employee, ScientificMember)
            .join(Employee, Employee.id == AmirObservation.employee_id)
            .join(
                ScientificMember,
                ScientificMember.id == AmirObservation.observer_scientific_member_id,
            )
            .where(
                Employee.deleted_at.is_(None),
                ScientificMember.deleted_at.is_(None),
            ),
            filters,
        )
        if employee_id is not None:
            statement = statement.where(AmirObservation.employee_id == employee_id)

        sort_column = getattr(AmirObservation, sort_by)
        order_expression = sort_column.desc() if sort_order == "desc" else sort_column.asc()
        return list(db.execute(statement.order_by(order_expression)).tuples())

    def create(self, db: Session, values: dict[str, object]) -> AmirObservation:
        observation = AmirObservation(**values)
        db.add(observation)
        db.flush()
        return observation

    def update(
        self,
        db: Session,
        observation: AmirObservation,
        values: dict[str, object],
    ) -> AmirObservation:
        for field_name, value in values.items():
            setattr(observation, field_name, value)
        db.flush()
        return observation

    def soft_delete(self, db: Session, observation: AmirObservation) -> None:
        observation.deleted_at = datetime.now(timezone.utc)
        db.flush()

    def _apply_filters(
        self,
        statement: Select[tuple[AmirObservation]],
        filters: AmirObservationFilters,
    ) -> Select[tuple[AmirObservation]]:
        statement = statement.where(AmirObservation.deleted_at.is_(None))

        if filters.observation_date_from is not None:
            statement = statement.where(
                AmirObservation.observation_date >= filters.observation_date_from
            )
        if filters.observation_date_to is not None:
            statement = statement.where(
                AmirObservation.observation_date <= filters.observation_date_to
            )
        if filters.subject is not None:
            statement = statement.where(AmirObservation.subject.ilike(f"%{filters.subject}%"))
        if filters.observer_scientific_member_id is not None:
            statement = statement.where(
                AmirObservation.observer_scientific_member_id
                == filters.observer_scientific_member_id
            )
        if filters.final_result_code is not None:
            statement = statement.where(AmirObservation.final_result_code == filters.final_result_code)

        return statement
