from sqlalchemy.orm import Session

from app.common.department_labels import get_department_display_label
from app.models.department import Department
from app.models.scientific_member import ScientificMember
from app.repositories.department_repository import DepartmentRepository
from app.repositories.scientific_member_repository import (
    ScientificMemberFilters,
    ScientificMemberRepository,
)
from app.schemas.department import DepartmentRead
from app.schemas.scientific_member import (
    ScientificMemberCreate,
    ScientificMemberListResponse,
    ScientificMemberRead,
    ScientificMemberUpdate,
)


class ScientificMemberNotFoundError(Exception):
    pass


class InvalidScientificMemberDepartmentError(Exception):
    pass


class ScientificMemberService:
    def __init__(
        self,
        repository: ScientificMemberRepository | None = None,
        department_repository: DepartmentRepository | None = None,
    ) -> None:
        self.repository = repository or ScientificMemberRepository()
        self.department_repository = department_repository or DepartmentRepository()

    def list_members(
        self,
        db: Session,
        *,
        filters: ScientificMemberFilters,
        sort_by: str,
        sort_order: str,
        page: int,
        page_size: int,
    ) -> ScientificMemberListResponse:
        members, total = self.repository.list_active(
            db,
            filters=filters,
            sort_by=sort_by,
            sort_order=sort_order,
            offset=(page - 1) * page_size,
            limit=page_size,
        )
        return ScientificMemberListResponse(
            items=[self._to_read(db, member) for member in members],
            total=total,
            page=page,
            page_size=page_size,
        )

    def get_member(self, db: Session, member_id: int) -> ScientificMemberRead:
        member = self.repository.get_by_id(db, member_id)
        if member is None:
            raise ScientificMemberNotFoundError
        return self._to_read(db, member)

    def create_member(self, db: Session, data: ScientificMemberCreate) -> ScientificMemberRead:
        self._require_active_department(db, data.department_id)
        member = self.repository.create(db, data.model_dump())
        db.commit()
        db.refresh(member)
        return self._to_read(db, member)

    def update_member(
        self,
        db: Session,
        member_id: int,
        data: ScientificMemberUpdate,
    ) -> ScientificMemberRead:
        member = self.repository.get_by_id(db, member_id)
        if member is None:
            raise ScientificMemberNotFoundError

        self._require_active_department(db, data.department_id)
        member = self.repository.update(db, member, data.model_dump())
        db.commit()
        db.refresh(member)
        return self._to_read(db, member)

    def delete_member(self, db: Session, member_id: int) -> None:
        member = self.repository.get_by_id(db, member_id)
        if member is None:
            raise ScientificMemberNotFoundError
        self.repository.soft_delete(db, member)
        db.commit()

    def _require_active_department(self, db: Session, department_id: int) -> Department:
        department = self.department_repository.get_by_id(db, department_id)
        if department is None:
            raise InvalidScientificMemberDepartmentError
        return department

    def _to_read(self, db: Session, member: ScientificMember) -> ScientificMemberRead:
        department = self._require_active_department(db, member.department_id)
        return ScientificMemberRead(
            id=member.id,
            name=member.name,
            surname=member.surname,
            father_name=member.father_name,
            phone_number=member.phone_number,
            academic_rank=member.academic_rank,
            department_id=member.department_id,
            department=self._department_to_read(department),
            notes=member.notes,
            created_at=member.created_at,
            updated_at=member.updated_at,
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
