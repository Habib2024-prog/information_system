from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.models.scientific_member import ScientificMember


@dataclass(frozen=True)
class ScientificMemberFilters:
    search: str | None = None
    name: str | None = None
    surname: str | None = None
    father_name: str | None = None
    phone_number: str | None = None
    academic_rank: str | None = None
    department_id: int | None = None


class ScientificMemberRepository:
    def list_active(
        self,
        db: Session,
        *,
        filters: ScientificMemberFilters,
        sort_by: str,
        sort_order: str,
        offset: int,
        limit: int,
    ) -> tuple[list[ScientificMember], int]:
        statement = self._apply_filters(select(ScientificMember), filters)
        total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0

        sort_column = getattr(ScientificMember, sort_by)
        order_expression = sort_column.desc() if sort_order == "desc" else sort_column.asc()
        members = list(db.scalars(statement.order_by(order_expression).offset(offset).limit(limit)))
        return members, total

    def get_by_id(self, db: Session, member_id: int) -> ScientificMember | None:
        statement = select(ScientificMember).where(
            ScientificMember.id == member_id,
            ScientificMember.deleted_at.is_(None),
        )
        return db.scalar(statement)

    def create(self, db: Session, values: dict[str, object]) -> ScientificMember:
        member = ScientificMember(**values)
        db.add(member)
        db.flush()
        return member

    def update(
        self,
        db: Session,
        member: ScientificMember,
        values: dict[str, object],
    ) -> ScientificMember:
        for field_name, value in values.items():
            setattr(member, field_name, value)
        db.flush()
        return member

    def soft_delete(self, db: Session, member: ScientificMember) -> None:
        member.deleted_at = datetime.now(timezone.utc)
        db.flush()

    def _apply_filters(
        self,
        statement: Select[tuple[ScientificMember]],
        filters: ScientificMemberFilters,
    ) -> Select[tuple[ScientificMember]]:
        statement = statement.where(ScientificMember.deleted_at.is_(None))

        if filters.search:
            search_value = f"%{filters.search}%"
            statement = statement.where(
                or_(
                    ScientificMember.name.ilike(search_value),
                    ScientificMember.surname.ilike(search_value),
                    ScientificMember.father_name.ilike(search_value),
                    ScientificMember.phone_number.ilike(search_value),
                    ScientificMember.academic_rank.ilike(search_value),
                )
            )

        for field_name in (
            "name",
            "surname",
            "father_name",
            "phone_number",
            "academic_rank",
        ):
            value = getattr(filters, field_name)
            if value is not None:
                statement = statement.where(
                    getattr(ScientificMember, field_name).ilike(f"%{value}%")
                )

        if filters.department_id is not None:
            statement = statement.where(ScientificMember.department_id == filters.department_id)

        return statement
