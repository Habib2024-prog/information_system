from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from app.common.audit_codes import AuditAction, AuditEntity
from app.services.audit_service import audit_service, record_snapshot

from app.common.school_labels import (
    get_gender_type_display_label,
    get_school_type_display_label,
    is_defined_gender_type_code,
    is_defined_school_type_code,
)
from app.models.school import School
from app.models.school_grade_section import SchoolGradeSection
from app.repositories.school_repository import SchoolFilters, SchoolRepository
from app.schemas.school import (
    SchoolCreate,
    SchoolGradeSectionRead,
    SchoolGradeSectionWrite,
    SchoolGradeStatisticRead,
    SchoolGradeStatisticWrite,
    SchoolGradeTotalsRead,
    SchoolListResponse,
    SchoolRead,
    SchoolUpdate,
)


class SchoolNotFoundError(Exception):
    pass


class SchoolCodeExistsError(Exception):
    pass


class UndefinedSchoolTypeCodeError(Exception):
    pass


class UndefinedGenderTypeCodeError(Exception):
    pass


class SchoolSectionNotFoundError(Exception):
    pass


class SchoolService:
    def __init__(self, repository: SchoolRepository | None = None) -> None:
        self.repository = repository or SchoolRepository()

    def list_schools(
        self,
        db: Session,
        *,
        filters: SchoolFilters,
        sort_by: str,
        sort_order: str,
        page: int,
        page_size: int,
    ) -> SchoolListResponse:
        schools, total = self.repository.list_active(
            db,
            filters=filters,
            sort_by=sort_by,
            sort_order=sort_order,
            offset=(page - 1) * page_size,
            limit=page_size,
        )
        return SchoolListResponse(
            items=[self._to_read(db, school) for school in schools],
            total=total,
            page=page,
            page_size=page_size,
        )

    def get_school(self, db: Session, school_id: int) -> SchoolRead:
        return self._to_read(db, self._require_active_school(db, school_id))

    def list_schools_for_export(
        self,
        db: Session,
        *,
        filters: SchoolFilters,
        sort_by: str,
        sort_order: str,
    ) -> list[SchoolRead]:
        schools = self.repository.list_active_for_export(
            db,
            filters=filters,
            sort_by=sort_by,
            sort_order=sort_order,
        )
        return [self._to_read(db, school) for school in schools]

    def list_grade_statistics(self, db: Session, school_id: int) -> list[SchoolGradeStatisticRead]:
        self._require_active_school(db, school_id)
        return self._group_grade_sections(
            self.repository.list_active_grade_sections(db, school_id)
        )

    def create_school(self, db: Session, data: SchoolCreate) -> SchoolRead:
        self._validate_codes(data.school_type_code, data.gender_type_code)
        self._ensure_school_code_available(db, data.school_code)
        school = self.repository.create(db, data.model_dump(exclude={"grade_statistics"}))
        self._replace_grade_sections(db, school.id, data.grade_statistics)
        audit_service.commit_change(db, record=school, action=AuditAction.CREATE, entity_type=AuditEntity.SCHOOL)
        db.refresh(school)
        return self._to_read(db, school)

    def update_school(self, db: Session, school_id: int, data: SchoolUpdate) -> SchoolRead:
        school = self._require_active_school(db, school_id)
        self._validate_codes(data.school_type_code, data.gender_type_code)
        if data.school_code != school.school_code:
            self._ensure_school_code_available(db, data.school_code)

        before = record_snapshot(school)
        school = self.repository.update(db, school, data.model_dump(exclude={"grade_statistics"}))
        self._replace_grade_sections(db, school.id, data.grade_statistics)
        audit_service.commit_change(db, record=school, action=AuditAction.UPDATE,
                                    entity_type=AuditEntity.SCHOOL, before_data=before)
        db.refresh(school)
        return self._to_read(db, school)

    def delete_school(self, db: Session, school_id: int) -> None:
        school = self._require_active_school(db, school_id)
        before = record_snapshot(school)
        self.repository.soft_delete(db, school)
        audit_service.commit_change(db, record=school, action=AuditAction.DELETE,
                                    entity_type=AuditEntity.SCHOOL, before_data=before)

    def _require_active_school(self, db: Session, school_id: int) -> School:
        school = self.repository.get_by_id(db, school_id)
        if school is None:
            raise SchoolNotFoundError
        return school

    def _ensure_school_code_available(self, db: Session, school_code: str) -> None:
        if self.repository.get_by_code(db, school_code, include_deleted=True) is not None:
            raise SchoolCodeExistsError

    @staticmethod
    def _validate_codes(school_type_code: str, gender_type_code: str) -> None:
        if not is_defined_school_type_code(school_type_code):
            raise UndefinedSchoolTypeCodeError
        if not is_defined_gender_type_code(gender_type_code):
            raise UndefinedGenderTypeCodeError

    def _replace_grade_sections(
        self,
        db: Session,
        school_id: int,
        statistics: list[SchoolGradeStatisticWrite],
    ) -> None:
        """Replace active section rows while retaining removed rows as soft-deleted history."""
        existing_by_id = {
            section.id: section
            for section in self.repository.list_grade_sections_for_update(db, school_id)
        }
        submitted_ids = {
            section.id
            for grade in statistics
            for section in grade.sections
            if section.id is not None
        }

        for section in existing_by_id.values():
            if section.deleted_at is None and section.id not in submitted_ids:
                before = record_snapshot(section)
                section.deleted_at = datetime.now(timezone.utc)
                audit_service.log_change(db, record=section, action=AuditAction.DELETE,
                                        entity_type=AuditEntity.SCHOOL_GRADE_SECTION, before_data=before)

        for grade in statistics:
            for section_data in grade.sections:
                self._upsert_grade_section(
                    db,
                    school_id=school_id,
                    grade_number=grade.grade_number,
                    section_data=section_data,
                    existing_by_id=existing_by_id,
                )

    def _upsert_grade_section(
        self,
        db: Session,
        *,
        school_id: int,
        grade_number: int,
        section_data: SchoolGradeSectionWrite,
        existing_by_id: dict[int, SchoolGradeSection],
    ) -> None:
        values = section_data.model_dump(exclude={"id"})
        if section_data.id is None:
            section = self.repository.create_grade_section(
                db,
                {"school_id": school_id, "grade_number": grade_number, **values},
            )
            audit_service.log_change(db, record=section, action=AuditAction.CREATE,
                                    entity_type=AuditEntity.SCHOOL_GRADE_SECTION)
            return

        existing = existing_by_id.get(section_data.id)
        if existing is None:
            raise SchoolSectionNotFoundError
        before = record_snapshot(existing)
        existing.deleted_at = None
        self.repository.update_grade_section(
            db,
            existing,
            {"grade_number": grade_number, **values},
        )
        audit_service.log_change(db, record=existing, action=AuditAction.UPDATE,
                                entity_type=AuditEntity.SCHOOL_GRADE_SECTION, before_data=before)

    def _to_read(self, db: Session, school: School) -> SchoolRead:
        return SchoolRead(
            id=school.id,
            school_name=school.school_name,
            school_head_phone=school.school_head_phone,
            school_type_code=school.school_type_code,
            school_type_display_name=get_school_type_display_label(school.school_type_code),
            gender_type_code=school.gender_type_code,
            gender_type_display_name=get_gender_type_display_label(school.gender_type_code),
            school_code=school.school_code,
            school_formation=school.school_formation,
            senior_teacher_count=school.senior_teacher_count,
            male_teacher_count=school.male_teacher_count,
            female_teacher_count=school.female_teacher_count,
            incoming_service_teacher_count=school.incoming_service_teacher_count,
            outgoing_service_teacher_count=school.outgoing_service_teacher_count,
            volunteer_teacher_count=school.volunteer_teacher_count,
            active_class_section_count=school.active_class_section_count,
            school_needs=school.school_needs,
            school_equipment=school.school_equipment,
            grade_statistics=self._group_grade_sections(
                self.repository.list_active_grade_sections(db, school.id)
            ),
            created_at=school.created_at,
            updated_at=school.updated_at,
        )

    @staticmethod
    def _group_grade_sections(
        sections: list[SchoolGradeSection],
    ) -> list[SchoolGradeStatisticRead]:
        grouped: dict[int, list[SchoolGradeSection]] = defaultdict(list)
        for section in sections:
            grouped[section.grade_number].append(section)

        return [
            SchoolGradeStatisticRead(
                grade_number=grade_number,
                sections=[SchoolService._section_to_read(section) for section in grade_sections],
                totals=SchoolGradeTotalsRead(
                    enrolled_count=sum(section.enrolled_count for section in grade_sections),
                    present_count=sum(section.present_count for section in grade_sections),
                    female_count=sum(section.female_count for section in grade_sections),
                    male_count=sum(section.male_count for section in grade_sections),
                ),
            )
            for grade_number, grade_sections in sorted(grouped.items())
        ]

    @staticmethod
    def _section_to_read(section: SchoolGradeSection) -> SchoolGradeSectionRead:
        return SchoolGradeSectionRead(
            id=section.id,
            school_id=section.school_id,
            section_name=section.section_name,
            enrolled_count=section.enrolled_count,
            present_count=section.present_count,
            female_count=section.female_count,
            male_count=section.male_count,
            created_at=section.created_at,
            updated_at=section.updated_at,
        )
