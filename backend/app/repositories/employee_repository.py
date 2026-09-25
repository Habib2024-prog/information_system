from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import Select, and_, func, or_, select
from sqlalchemy.orm import Session

from app.models.department import Department
from app.models.employee import Employee
from app.models.employee_department import EmployeeDepartment


@dataclass(frozen=True)
class EmployeeFilters:
    search: str | None = None
    name: str | None = None
    father_name: str | None = None
    school_workplace: str | None = None
    city_district: str | None = None
    field_of_study: str | None = None
    education_level: str | None = None
    job_title_code: str | None = None
    grade_post: int | None = None
    step: int | None = None
    successful_evaluation: str | None = None
    field_match_code: str | None = None
    department_id: int | None = None


class EmployeeRepository:
    def list_active(
        self,
        db: Session,
        *,
        filters: EmployeeFilters,
        sort_by: str,
        sort_order: str,
        offset: int,
        limit: int,
    ) -> tuple[list[Employee], int]:
        statement = self._apply_filters(select(Employee), filters)
        total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0

        sort_column = getattr(Employee, sort_by)
        order_expression = sort_column.desc() if sort_order == "desc" else sort_column.asc()
        employees = list(db.scalars(statement.order_by(order_expression).offset(offset).limit(limit)))
        return employees, total

    def get_by_id(self, db: Session, employee_id: int) -> Employee | None:
        statement = select(Employee).where(
            Employee.id == employee_id,
            Employee.deleted_at.is_(None),
        )
        return db.scalar(statement)

    def list_active_for_export(
        self,
        db: Session,
        *,
        filters: EmployeeFilters,
        sort_by: str,
        sort_order: str,
    ) -> list[Employee]:
        statement = self._apply_filters(select(Employee), filters)
        sort_column = getattr(Employee, sort_by)
        order_expression = sort_column.desc() if sort_order == "desc" else sort_column.asc()
        return list(db.scalars(statement.order_by(order_expression)))

    def create(self, db: Session, values: dict[str, object]) -> Employee:
        employee = Employee(**values)
        db.add(employee)
        db.flush()
        return employee

    def update(self, db: Session, employee: Employee, values: dict[str, object]) -> Employee:
        for field_name, value in values.items():
            setattr(employee, field_name, value)
        db.flush()
        return employee

    def soft_delete(self, db: Session, employee: Employee) -> None:
        employee.deleted_at = datetime.now(timezone.utc)
        db.flush()

    def list_active_departments(self, db: Session, employee_id: int) -> list[Department]:
        statement = (
            select(Department)
            .join(
                EmployeeDepartment,
                EmployeeDepartment.department_id == Department.id,
            )
            .where(
                EmployeeDepartment.employee_id == employee_id,
                EmployeeDepartment.deleted_at.is_(None),
                Department.deleted_at.is_(None),
            )
            .order_by(Department.code)
        )
        return list(db.scalars(statement))

    def list_assignments(self, db: Session, employee_id: int) -> list[EmployeeDepartment]:
        statement = select(EmployeeDepartment).where(EmployeeDepartment.employee_id == employee_id)
        return list(db.scalars(statement))

    def create_assignment(
        self,
        db: Session,
        *,
        employee_id: int,
        department_id: int,
    ) -> EmployeeDepartment:
        assignment = EmployeeDepartment(
            employee_id=employee_id,
            department_id=department_id,
        )
        db.add(assignment)
        db.flush()
        return assignment

    def _apply_filters(
        self,
        statement: Select[tuple[Employee]],
        filters: EmployeeFilters,
    ) -> Select[tuple[Employee]]:
        statement = statement.where(Employee.deleted_at.is_(None))

        if filters.search:
            search_value = f"%{filters.search}%"
            statement = statement.where(
                or_(
                    Employee.name.ilike(search_value),
                    Employee.father_name.ilike(search_value),
                    Employee.grandfather_name.ilike(search_value),
                    Employee.school_workplace.ilike(search_value),
                    Employee.phone_number.ilike(search_value),
                )
            )

        for field_name in (
            "name",
            "father_name",
            "school_workplace",
            "city_district",
            "field_of_study",
            "education_level",
            "job_title_code",
            "successful_evaluation",
            "field_match_code",
        ):
            value = getattr(filters, field_name)
            if value is not None:
                statement = statement.where(getattr(Employee, field_name).ilike(f"%{value}%"))

        if filters.grade_post is not None:
            statement = statement.where(Employee.grade_post == filters.grade_post)
        if filters.step is not None:
            statement = statement.where(Employee.step == filters.step)
        if filters.department_id is not None:
            statement = statement.join(
                EmployeeDepartment,
                and_(
                    EmployeeDepartment.employee_id == Employee.id,
                    EmployeeDepartment.deleted_at.is_(None),
                ),
            ).where(EmployeeDepartment.department_id == filters.department_id)

        return statement
