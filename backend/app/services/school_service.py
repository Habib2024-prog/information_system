from sqlalchemy.orm import Session

from app.common.school_labels import (
    get_gender_type_display_label,
    get_school_type_display_label,
    is_defined_gender_type_code,
    is_defined_school_type_code,
)
from app.models.school import School
from app.models.school_grade_statistic import SchoolGradeStatistic
from app.repositories.school_repository import SchoolFilters, SchoolRepository
from app.schemas.school import (
    SchoolCreate,
    SchoolGradeStatisticRead,
    SchoolGradeStatisticWrite,
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
        school = self._require_active_school(db, school_id)
        return self._to_read(db, school)

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
        return [
            self._grade_statistic_to_read(statistic)
            for statistic in self.repository.list_active_grade_statistics(db, school_id)
        ]

    def create_school(self, db: Session, data: SchoolCreate) -> SchoolRead:
        self._validate_codes(data.school_type_code, data.gender_type_code)
        self._ensure_school_code_available(db, data.school_code)
        school = self.repository.create(db, data.model_dump(exclude={"grade_statistics"}))
        self._upsert_grade_statistics(db, school.id, data.grade_statistics)
        db.commit()
        db.refresh(school)
        return self._to_read(db, school)

    def update_school(self, db: Session, school_id: int, data: SchoolUpdate) -> SchoolRead:
        school = self._require_active_school(db, school_id)
        self._validate_codes(data.school_type_code, data.gender_type_code)
        if data.school_code != school.school_code:
            self._ensure_school_code_available(db, data.school_code)

        school = self.repository.update(db, school, data.model_dump(exclude={"grade_statistics"}))
        self._upsert_grade_statistics(db, school.id, data.grade_statistics)
        db.commit()
        db.refresh(school)
        return self._to_read(db, school)

    def delete_school(self, db: Session, school_id: int) -> None:
        school = self._require_active_school(db, school_id)
        self.repository.soft_delete(db, school)
        db.commit()

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

    def _upsert_grade_statistics(
        self,
        db: Session,
        school_id: int,
        statistics: list[SchoolGradeStatisticWrite],
    ) -> None:
        existing_statistics = {
            statistic.grade_number: statistic
            for statistic in self.repository.list_grade_statistics_for_update(db, school_id)
        }
        for statistic_data in statistics:
            values = statistic_data.model_dump()
            existing = existing_statistics.get(statistic_data.grade_number)
            if existing is None:
                self.repository.create_grade_statistic(
                    db,
                    {"school_id": school_id, **values},
                )
            else:
                existing.deleted_at = None
                self.repository.update_grade_statistic(db, existing, values)

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
            grade_statistics=[
                self._grade_statistic_to_read(statistic)
                for statistic in self.repository.list_active_grade_statistics(db, school.id)
            ],
            created_at=school.created_at,
            updated_at=school.updated_at,
        )

    @staticmethod
    def _grade_statistic_to_read(statistic: SchoolGradeStatistic) -> SchoolGradeStatisticRead:
        return SchoolGradeStatisticRead(
            id=statistic.id,
            school_id=statistic.school_id,
            grade_number=statistic.grade_number,
            enrolled_count=statistic.enrolled_count,
            present_count=statistic.present_count,
            female_count=statistic.female_count,
            male_count=statistic.male_count,
            created_at=statistic.created_at,
            updated_at=statistic.updated_at,
        )
