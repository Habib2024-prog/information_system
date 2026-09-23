from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.common.department_labels import (
    EDUCATION_TRAINING_DEPARTMENT_CODE,
    get_department_display_label,
)
from app.common.employee_codes import TEACHER_JOB_TITLE_CODE
from app.models.department import Department
from app.models.employee import Employee
from app.models.employee_department import EmployeeDepartment
from app.repositories.department_repository import DepartmentRepository
from app.repositories.employee_repository import EmployeeFilters, EmployeeRepository
from app.schemas.department import DepartmentRead
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeListResponse,
    EmployeeRead,
    EmployeeUpdate,
)


class EmployeeNotFoundError(Exception):
    pass


class InvalidDepartmentIdsError(Exception):
    pass


class RequiredDepartmentUnavailableError(Exception):
    pass


class EmployeeService:
    def __init__(
        self,
        employee_repository: EmployeeRepository | None = None,
        department_repository: DepartmentRepository | None = None,
    ) -> None:
        self.employee_repository = employee_repository or EmployeeRepository()
        self.department_repository = department_repository or DepartmentRepository()

    def list_employees(
        self,
        db: Session,
        *,
        filters: EmployeeFilters,
        sort_by: str,
        sort_order: str,
        page: int,
        page_size: int,
    ) -> EmployeeListResponse:
        employees, total = self.employee_repository.list_active(
            db,
            filters=filters,
            sort_by=sort_by,
            sort_order=sort_order,
            offset=(page - 1) * page_size,
            limit=page_size,
        )
        return EmployeeListResponse(
            items=[self._to_read(db, employee) for employee in employees],
            total=total,
            page=page,
            page_size=page_size,
        )

    def get_employee(self, db: Session, employee_id: int) -> EmployeeRead:
        employee = self.employee_repository.get_by_id(db, employee_id)
        if employee is None:
            raise EmployeeNotFoundError
        return self._to_read(db, employee)

    def create_employee(self, db: Session, data: EmployeeCreate) -> EmployeeRead:
        department_ids = self._resolve_department_ids(
            db,
            job_title_code=data.job_title_code,
            submitted_ids=data.department_ids,
        )
        employee = self.employee_repository.create(
            db,
            data.model_dump(exclude={"department_ids"}),
        )
        self._sync_assignments(db, employee.id, department_ids)
        db.commit()
        db.refresh(employee)
        return self._to_read(db, employee)

    def update_employee(
        self,
        db: Session,
        employee_id: int,
        data: EmployeeUpdate,
    ) -> EmployeeRead:
        employee = self.employee_repository.get_by_id(db, employee_id)
        if employee is None:
            raise EmployeeNotFoundError

        department_ids = self._resolve_department_ids(
            db,
            job_title_code=data.job_title_code,
            submitted_ids=data.department_ids,
        )
        employee = self.employee_repository.update(
            db,
            employee,
            data.model_dump(exclude={"department_ids"}),
        )
        self._sync_assignments(db, employee.id, department_ids)
        db.commit()
        db.refresh(employee)
        return self._to_read(db, employee)

    def delete_employee(self, db: Session, employee_id: int) -> None:
        employee = self.employee_repository.get_by_id(db, employee_id)
        if employee is None:
            raise EmployeeNotFoundError
        self.employee_repository.soft_delete(db, employee)
        db.commit()

    def _resolve_department_ids(
        self,
        db: Session,
        *,
        job_title_code: str,
        submitted_ids: list[int],
    ) -> list[int]:
        department_ids = list(dict.fromkeys(submitted_ids))
        active_departments = self.department_repository.list_active_by_ids(db, department_ids)
        if {department.id for department in active_departments} != set(department_ids):
            raise InvalidDepartmentIdsError

        if job_title_code != TEACHER_JOB_TITLE_CODE:
            required_department = self.department_repository.get_by_code(
                db,
                EDUCATION_TRAINING_DEPARTMENT_CODE,
            )
            if required_department is None:
                raise RequiredDepartmentUnavailableError
            if required_department.id not in department_ids:
                department_ids.append(required_department.id)

        return department_ids

    def _sync_assignments(self, db: Session, employee_id: int, department_ids: list[int]) -> None:
        target_ids = set(department_ids)
        assignments = self.employee_repository.list_assignments(db, employee_id)
        assignments_by_department: dict[int, EmployeeDepartment] = {}

        for assignment in assignments:
            assignments_by_department[assignment.department_id] = assignment
            if assignment.deleted_at is None and assignment.department_id not in target_ids:
                assignment.deleted_at = datetime.now(timezone.utc)

        for department_id in target_ids:
            assignment = assignments_by_department.get(department_id)
            if assignment is None:
                self.employee_repository.create_assignment(
                    db,
                    employee_id=employee_id,
                    department_id=department_id,
                )
            elif assignment.deleted_at is not None:
                assignment.deleted_at = None

        db.flush()

    def _to_read(self, db: Session, employee: Employee) -> EmployeeRead:
        return EmployeeRead(
            id=employee.id,
            name=employee.name,
            father_name=employee.father_name,
            grandfather_name=employee.grandfather_name,
            school_workplace=employee.school_workplace,
            city_district=employee.city_district,
            phone_number=employee.phone_number,
            field_of_study=employee.field_of_study,
            education_level=employee.education_level,
            subjects_taught=employee.subjects_taught,
            job_title_code=employee.job_title_code,
            teaching_experience=employee.teaching_experience,
            grade_post=employee.grade_post,
            step=employee.step,
            successful_evaluation=employee.successful_evaluation,
            field_match_code=employee.field_match_code,
            notes=employee.notes,
            departments=[
                self._department_to_read(department)
                for department in self.employee_repository.list_active_departments(db, employee.id)
            ],
            created_at=employee.created_at,
            updated_at=employee.updated_at,
        )

    @staticmethod
    def _department_to_read(department: Department) -> DepartmentRead:
        return DepartmentRead(
            id=department.id,
            code=department.code,
            display_name=get_department_display_label(department.code),
            created_at=department.created_at,
            updated_at=department.updated_at,
        )
