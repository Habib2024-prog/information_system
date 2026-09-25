from decimal import Decimal

from sqlalchemy.orm import Session

from app.common.employee_codes import TEACHER_JOB_TITLE_CODE
from app.common.teacher_observation_results import get_teacher_final_result_code
from app.models.employee import Employee
from app.models.scientific_member import ScientificMember
from app.models.teacher_observation import TeacherObservation
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.scientific_member_repository import ScientificMemberRepository
from app.repositories.teacher_observation_repository import (
    TeacherObservationFilters,
    TeacherObservationRepository,
)
from app.schemas.teacher_observation import (
    ObserverBasicRead,
    TeacherObservationCreate,
    TeacherObservationListItem,
    TeacherObservationListResponse,
    TeacherObservationRead,
    TeacherObservationUpdate,
)


class ObservationEmployeeNotFoundError(Exception):
    pass


class ObservationEmployeeNotTeacherError(Exception):
    pass


class InvalidObservationObserverError(Exception):
    pass


class TeacherObservationNotFoundError(Exception):
    pass


class TeacherObservationService:
    def __init__(
        self,
        repository: TeacherObservationRepository | None = None,
        employee_repository: EmployeeRepository | None = None,
        scientific_member_repository: ScientificMemberRepository | None = None,
    ) -> None:
        self.repository = repository or TeacherObservationRepository()
        self.employee_repository = employee_repository or EmployeeRepository()
        self.scientific_member_repository = (
            scientific_member_repository or ScientificMemberRepository()
        )

    def list_observations(
        self,
        db: Session,
        *,
        employee_id: int,
        filters: TeacherObservationFilters,
        sort_by: str,
        sort_order: str,
        page: int,
        page_size: int,
    ) -> TeacherObservationListResponse:
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
        return TeacherObservationListResponse(
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
    ) -> TeacherObservationRead:
        self._require_active_employee(db, employee_id)
        observation = self.repository.get_by_id_for_employee(
            db,
            employee_id=employee_id,
            observation_id=observation_id,
        )
        if observation is None:
            raise TeacherObservationNotFoundError
        return self._to_read(observation)

    def list_observations_for_export(
        self,
        db: Session,
        *,
        employee_id: int | None,
        filters: TeacherObservationFilters,
        sort_by: str,
        sort_order: str,
    ) -> list[tuple[TeacherObservation, Employee, ScientificMember]]:
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
        data: TeacherObservationCreate,
    ) -> TeacherObservationRead:
        self._require_active_teacher(db, employee_id)
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
        data: TeacherObservationUpdate,
    ) -> TeacherObservationRead:
        self._require_active_employee(db, employee_id)
        observation = self.repository.get_by_id_for_employee(
            db,
            employee_id=employee_id,
            observation_id=observation_id,
        )
        if observation is None:
            raise TeacherObservationNotFoundError

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
            raise TeacherObservationNotFoundError
        self.repository.soft_delete(db, observation)
        db.commit()

    def _require_active_employee(self, db: Session, employee_id: int) -> Employee:
        employee = self.employee_repository.get_by_id(db, employee_id)
        if employee is None:
            raise ObservationEmployeeNotFoundError
        return employee

    def _require_active_teacher(self, db: Session, employee_id: int) -> Employee:
        employee = self._require_active_employee(db, employee_id)
        if employee.job_title_code != TEACHER_JOB_TITLE_CODE:
            raise ObservationEmployeeNotTeacherError
        return employee

    def _require_active_observer(self, db: Session, observer_id: int) -> ScientificMember:
        observer = self.scientific_member_repository.get_by_id(db, observer_id)
        if observer is None:
            raise InvalidObservationObserverError
        return observer

    @staticmethod
    def _calculated_values(data: TeacherObservationCreate | TeacherObservationUpdate) -> dict[str, object]:
        total_score = sum(
            (
                data.subject_knowledge_score,
                data.lesson_plan_score,
                data.classroom_management_score,
                data.assessment_score,
                data.professional_learning_score,
                data.community_engagement_score,
            ),
            start=Decimal("0"),
        )
        return {
            "total_score": total_score,
            "final_result_code": get_teacher_final_result_code(total_score),
        }

    @staticmethod
    def _observer_to_read(observer: ScientificMember) -> ObserverBasicRead:
        return ObserverBasicRead(
            id=observer.id,
            name=observer.name,
            surname=observer.surname,
            father_name=observer.father_name,
        )

    def _to_list_item(self, observation: TeacherObservation) -> TeacherObservationListItem:
        return TeacherObservationListItem(
            id=observation.id,
            observation_date=observation.observation_date,
            subject=observation.subject,
            observer=self._observer_to_read(observation.observer),
            total_score=observation.total_score,
            final_result_code=observation.final_result_code,
        )

    def _to_read(self, observation: TeacherObservation) -> TeacherObservationRead:
        return TeacherObservationRead(
            **self._to_list_item(observation).model_dump(),
            employee_id=observation.employee_id,
            observer_scientific_member_id=observation.observer_scientific_member_id,
            observed_class=observation.observed_class,
            subject_knowledge_score=observation.subject_knowledge_score,
            lesson_plan_score=observation.lesson_plan_score,
            classroom_management_score=observation.classroom_management_score,
            assessment_score=observation.assessment_score,
            professional_learning_score=observation.professional_learning_score,
            community_engagement_score=observation.community_engagement_score,
            strengths=observation.strengths,
            improvements=observation.improvements,
            notes=observation.notes,
            created_at=observation.created_at,
            updated_at=observation.updated_at,
        )
