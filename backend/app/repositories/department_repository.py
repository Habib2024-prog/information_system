from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from app.models.department import Department


class DepartmentRepository:
    def create_if_missing(self, db: Session, *, code: str) -> bool:
        """Insert by stable code atomically, leaving existing rows untouched."""
        dialect = db.get_bind().dialect.name
        if dialect == "postgresql":
            insert = postgres_insert
        elif dialect == "sqlite":
            insert = sqlite_insert
        else:
            raise RuntimeError("Department initialization requires PostgreSQL or SQLite.")
        statement = (
            insert(Department)
            .values(code=code)
            .on_conflict_do_nothing(index_elements=[Department.code])
            .returning(Department.id)
        )
        return db.scalar(statement) is not None

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

    def list_active_by_ids(self, db: Session, department_ids: list[int]) -> list[Department]:
        if not department_ids:
            return []

        statement = (
            select(Department)
            .where(
                Department.id.in_(department_ids),
                Department.deleted_at.is_(None),
            )
            .order_by(Department.code)
        )
        return list(db.scalars(statement))

    def create(self, db: Session, *, code: str) -> Department:
        department = Department(code=code)
        db.add(department)
        db.flush()
        return department

    def update(self, db: Session, department: Department, *, code: str) -> Department:
        department.code = code
        db.flush()
        return department
