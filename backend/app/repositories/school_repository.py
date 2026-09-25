from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.models.school import School
from app.models.school_grade_statistic import SchoolGradeStatistic


@dataclass(frozen=True)
class SchoolFilters:
    search: str | None = None
    school_name: str | None = None
    school_code: str | None = None
    school_type_code: str | None = None
    gender_type_code: str | None = None
    school_formation: str | None = None


class SchoolRepository:
    def list_active(
        self,
        db: Session,
        *,
        filters: SchoolFilters,
        sort_by: str,
        sort_order: str,
        offset: int,
        limit: int,
    ) -> tuple[list[School], int]:
        statement = self._apply_filters(select(School), filters)
        total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0

        sort_column = getattr(School, sort_by)
        order_expression = sort_column.desc() if sort_order == "desc" else sort_column.asc()
        schools = list(db.scalars(statement.order_by(order_expression).offset(offset).limit(limit)))
        return schools, total

    def get_by_id(self, db: Session, school_id: int) -> School | None:
        statement = select(School).where(School.id == school_id, School.deleted_at.is_(None))
        return db.scalar(statement)

    def list_active_for_export(
        self,
        db: Session,
        *,
        filters: SchoolFilters,
        sort_by: str,
        sort_order: str,
    ) -> list[School]:
        statement = self._apply_filters(select(School), filters)
        sort_column = getattr(School, sort_by)
        order_expression = sort_column.desc() if sort_order == "desc" else sort_column.asc()
        return list(db.scalars(statement.order_by(order_expression)))

    def get_by_code(
        self,
        db: Session,
        school_code: str,
        *,
        include_deleted: bool = False,
    ) -> School | None:
        statement = select(School).where(School.school_code == school_code)
        if not include_deleted:
            statement = statement.where(School.deleted_at.is_(None))
        return db.scalar(statement)

    def create(self, db: Session, values: dict[str, object]) -> School:
        school = School(**values)
        db.add(school)
        db.flush()
        return school

    def update(self, db: Session, school: School, values: dict[str, object]) -> School:
        for field_name, value in values.items():
            setattr(school, field_name, value)
        db.flush()
        return school

    def soft_delete(self, db: Session, school: School) -> None:
        school.deleted_at = datetime.now(timezone.utc)
        db.flush()

    def list_active_grade_statistics(
        self,
        db: Session,
        school_id: int,
    ) -> list[SchoolGradeStatistic]:
        statement = (
            select(SchoolGradeStatistic)
            .where(
                SchoolGradeStatistic.school_id == school_id,
                SchoolGradeStatistic.deleted_at.is_(None),
            )
            .order_by(SchoolGradeStatistic.grade_number)
        )
        return list(db.scalars(statement))

    def list_grade_statistics_for_update(
        self,
        db: Session,
        school_id: int,
    ) -> list[SchoolGradeStatistic]:
        statement = select(SchoolGradeStatistic).where(SchoolGradeStatistic.school_id == school_id)
        return list(db.scalars(statement))

    def create_grade_statistic(
        self,
        db: Session,
        values: dict[str, object],
    ) -> SchoolGradeStatistic:
        statistic = SchoolGradeStatistic(**values)
        db.add(statistic)
        db.flush()
        return statistic

    def update_grade_statistic(
        self,
        db: Session,
        statistic: SchoolGradeStatistic,
        values: dict[str, object],
    ) -> SchoolGradeStatistic:
        for field_name, value in values.items():
            setattr(statistic, field_name, value)
        db.flush()
        return statistic

    def _apply_filters(
        self,
        statement: Select[tuple[School]],
        filters: SchoolFilters,
    ) -> Select[tuple[School]]:
        statement = statement.where(School.deleted_at.is_(None))

        if filters.search:
            search_value = f"%{filters.search}%"
            statement = statement.where(
                or_(
                    School.school_name.ilike(search_value),
                    School.school_code.ilike(search_value),
                )
            )

        for field_name in (
            "school_name",
            "school_code",
            "school_type_code",
            "gender_type_code",
            "school_formation",
        ):
            value = getattr(filters, field_name)
            if value is not None:
                statement = statement.where(getattr(School, field_name).ilike(f"%{value}%"))

        return statement
