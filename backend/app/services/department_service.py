from sqlalchemy.orm import Session

from app.common.department_labels import (
    DEPARTMENT_DISPLAY_LABELS,
    get_department_display_label,
    is_defined_department_code,
)
from app.models.department import Department
from app.repositories.department_repository import DepartmentRepository
from app.schemas.department import DepartmentCreate, DepartmentRead, DepartmentUpdate


class DepartmentNotFoundError(Exception):
    pass


class DepartmentCodeExistsError(Exception):
    pass


class UndefinedDepartmentCodeError(Exception):
    pass


class DepartmentService:
    def __init__(self, repository: DepartmentRepository | None = None) -> None:
        self.repository = repository or DepartmentRepository()

    def list_departments(self, db: Session) -> list[DepartmentRead]:
        return [self._to_read(department) for department in self.repository.list_active(db)]

    def get_department(self, db: Session, department_id: int) -> DepartmentRead:
        department = self.repository.get_by_id(db, department_id)
        if department is None:
            raise DepartmentNotFoundError
        return self._to_read(department)

    def create_department(self, db: Session, data: DepartmentCreate) -> DepartmentRead:
        self._ensure_defined_code(data.code)
        self._ensure_code_available(db, data.code)
        department = self.repository.create(db, code=data.code)
        db.commit()
        db.refresh(department)
        return self._to_read(department)

    def update_department(
        self,
        db: Session,
        department_id: int,
        data: DepartmentUpdate,
    ) -> DepartmentRead:
        department = self.repository.get_by_id(db, department_id)
        if department is None:
            raise DepartmentNotFoundError

        self._ensure_defined_code(data.code)
        if data.code != department.code:
            self._ensure_code_available(db, data.code)

        department = self.repository.update(db, department, code=data.code)
        db.commit()
        db.refresh(department)
        return self._to_read(department)

    def seed_predefined_departments(self, db: Session) -> int:
        created_count = 0
        for code in DEPARTMENT_DISPLAY_LABELS:
            if self.repository.get_by_code(db, code, include_deleted=True) is None:
                self.repository.create(db, code=code)
                created_count += 1
        db.commit()
        return created_count

    def _ensure_code_available(self, db: Session, code: str) -> None:
        if self.repository.get_by_code(db, code, include_deleted=True) is not None:
            raise DepartmentCodeExistsError

    @staticmethod
    def _ensure_defined_code(code: str) -> None:
        if not is_defined_department_code(code):
            raise UndefinedDepartmentCodeError

    @staticmethod
    def _to_read(department: Department) -> DepartmentRead:
        return DepartmentRead(
            id=department.id,
            code=department.code,
            display_name=get_department_display_label(department.code),
            created_at=department.created_at,
            updated_at=department.updated_at,
        )
