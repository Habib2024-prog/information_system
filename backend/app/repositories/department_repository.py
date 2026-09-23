from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.department import Department


class DepartmentRepository:
    def list_active(self, db: Session) -> list[Department]:
        statement = (
            select(Department)
            .where(Department.deleted_at.is_(None))
            .order_by(Department.code)
        )
        return list(db.scalars(statement))

    def get_by_id(self, db: Session, department_id: int) -> Department | None:
        statement = select(Department).where(
            Department.id == department_id,
            Department.deleted_at.is_(None),
        )
        return db.scalar(statement)

    def get_by_code(
        self,
        db: Session,
        code: str,
        *,
        include_deleted: bool = False,
    ) -> Department | None:
        statement = select(Department).where(Department.code == code)
        if not include_deleted:
            statement = statement.where(Department.deleted_at.is_(None))
        return db.scalar(statement)

    def create(self, db: Session, *, code: str) -> Department:
        department = Department(code=code)
        db.add(department)
        db.flush()
        return department

    def update(self, db: Session, department: Department, *, code: str) -> Department:
        department.code = code
        db.flush()
        return department
