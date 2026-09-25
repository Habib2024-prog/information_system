from decimal import Decimal

from sqlalchemy.orm import Session

from app.common.amir_observation_results import get_amir_final_result_code
from app.common.employee_codes import AMIR_OBSERVATION_ELIGIBLE_JOB_TITLE_CODES
from app.models.amir_observation import AmirObservation
from app.models.employee import Employee
from app.models.scientific_member import ScientificMember
from app.repositories.amir_observation_repository import (
    AmirObservationFilters,
    AmirObservationRepository,
)
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.scientific_member_repository import ScientificMemberRepository
from app.schemas.amir_observation import (
    AmirObservationCreate,
    AmirObservationListItem,
    AmirObservationListResponse,
    AmirObservationObserverRead,
    AmirObservationRead,
    AmirObservationUpdate,
)


class AmirObservationEmployeeNotFoundError(Exception):
    pass


class IneligibleAmirObservationEmployeeError(Exception):
    pass


class InvalidAmirObservationObserverError(Exception):
    pass


class AmirObservationNotFoundError(Exception):
    pass


class AmirObservationService:
    def __init__(
        self,
        repository: AmirObservationRepository | None = None,
        employee_repository: EmployeeRepository | None = None,
        scientific_member_repository: ScientificMemberRepository | None = None,
    ) -> None:
        self.repository = repository or AmirObservationRepository()
        self.employee_repository = employee_repository or EmployeeRepository()
        self.scientific_member_repository = (
            scientific_member_repository or ScientificMemberRepository()
        )

    def list_observations(
        self,
        db: Session,
        *,
        employee_id: int,
        filters: AmirObservationFilters,
        sort_by: str,
        sort_order: str,
        page: int,
        page_size: int,
    ) -> AmirObservationListResponse:
        self._require_active_employee(db, employee_id)
        observations, total = self.repository.list_active_for_employee(
            db,
            employee_id=employee_id,
            filters=filters,
            sort_by=sort_by,
            sort_order=sort_order,
            offset=(page - 1) * page_size,
            limit=page_size,
        )
        return AmirObservationListResponse(
            items=[self._to_list_item(observation) for observation in observations],
            total=total,
            page=page,
            page_size=page_size,
        )

    def get_observation(
        self,
        db: Session,
        *,
        employee_id: int,
        observation_id: int,
    ) -> AmirObservationRead:
        self._require_active_employee(db, employee_id)
        observation = self.repository.get_by_id_for_employee(
            db,
            employee_id=employee_id,
            observation_id=observation_id,
        )
        if observation is None:
            raise AmirObservationNotFoundError
        return self._to_read(observation)

    def list_observations_for_export(
        self,
        db: Session,
        *,
        employee_id: int | None,
        filters: AmirObservationFilters,
        sort_by: str,
        sort_order: str,
    ) -> list[tuple[AmirObservation, Employee, ScientificMember]]:
        return self.repository.list_active_for_export(
            db,
            employee_id=employee_id,
            filters=filters,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    def create_observation(
        self,
        db: Session,
        *,
        employee_id: int,
        data: AmirObservationCreate,
    ) -> AmirObservationRead:
        self._require_eligible_employee(db, employee_id)
        self._require_active_observer(db, data.observer_scientific_member_id)
        values = data.model_dump()
        values.update(self._calculated_values(data))
        values["employee_id"] = employee_id
        observation = self.repository.create(db, values)
        db.commit()
        db.refresh(observation)
        return self._to_read(observation)

    def update_observation(
        self,
        db: Session,
        *,
        employee_id: int,
        observation_id: int,
        data: AmirObservationUpdate,
    ) -> AmirObservationRead:
        self._require_active_employee(db, employee_id)
        observation = self.repository.get_by_id_for_employee(
            db,
            employee_id=employee_id,
            observation_id=observation_id,
        )
        if observation is None:
            raise AmirObservationNotFoundError

        self._require_active_observer(db, data.observer_scientific_member_id)
        values = data.model_dump()
        values.update(self._calculated_values(data))
        observation = self.repository.update(db, observation, values)
        db.commit()
        db.refresh(observation)
        return self._to_read(observation)

    def delete_observation(
        self,
        db: Session,
        *,
        employee_id: int,
        observation_id: int,
    ) -> None:
        self._require_active_employee(db, employee_id)
        observation = self.repository.get_by_id_for_employee(
            db,
            employee_id=employee_id,
            observation_id=observation_id,
        )
        if observation is None:
            raise AmirObservationNotFoundError
        self.repository.soft_delete(db, observation)
        db.commit()

    def _require_active_employee(self, db: Session, employee_id: int) -> Employee:
        employee = self.employee_repository.get_by_id(db, employee_id)
        if employee is None:
            raise AmirObservationEmployeeNotFoundError
        return employee

    def _require_eligible_employee(self, db: Session, employee_id: int) -> Employee:
        employee = self._require_active_employee(db, employee_id)
        if employee.job_title_code not in AMIR_OBSERVATION_ELIGIBLE_JOB_TITLE_CODES:
            raise IneligibleAmirObservationEmployeeError
        return employee

    def _require_active_observer(self, db: Session, observer_id: int) -> ScientificMember:
        observer = self.scientific_member_repository.get_by_id(db, observer_id)
        if observer is None:
            raise InvalidAmirObservationObserverError
        return observer

    @staticmethod
    def _calculated_values(data: AmirObservationCreate | AmirObservationUpdate) -> dict[str, object]:
        total_score = sum(
            (
                data.responsibility_score,
                data.professional_leadership_score,
                data.community_relations_score,
                data.professional_development_score,
            ),
            start=Decimal("0"),
        )
        return {
            "total_score": total_score,
            "final_result_code": get_amir_final_result_code(total_score),
        }

    @staticmethod
    def _observer_to_read(observer: ScientificMember) -> AmirObservationObserverRead:
        return AmirObservationObserverRead(
            id=observer.id,
            name=observer.name,
            surname=observer.surname,
            father_name=observer.father_name,
        )

    def _to_list_item(self, observation: AmirObservation) -> AmirObservationListItem:
        return AmirObservationListItem(
            id=observation.id,
            observation_date=observation.observation_date,
            subject=observation.subject,
            observer=self._observer_to_read(observation.observer),
            total_score=observation.total_score,
            final_result_code=observation.final_result_code,
        )

    def _to_read(self, observation: AmirObservation) -> AmirObservationRead:
        return AmirObservationRead(
            **self._to_list_item(observation).model_dump(),
            employee_id=observation.employee_id,
            observer_scientific_member_id=observation.observer_scientific_member_id,
            observed_class=observation.observed_class,
            responsibility_score=observation.responsibility_score,
            professional_leadership_score=observation.professional_leadership_score,
            community_relations_score=observation.community_relations_score,
            professional_development_score=observation.professional_development_score,
            strengths=observation.strengths,
            improvements=observation.improvements,
            notes=observation.notes,
            created_at=observation.created_at,
            updated_at=observation.updated_at,
        )
