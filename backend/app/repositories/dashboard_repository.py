from sqlalchemy import func, literal, select, union_all
from sqlalchemy.engine import RowMapping
from sqlalchemy.orm import Session

from app.models.amir_observation import AmirObservation
from app.models.employee import Employee
from app.models.school import School
from app.models.scientific_member import ScientificMember
from app.models.teacher_observation import TeacherObservation


class DashboardRepository:
    def get_record_counts(self, db: Session) -> RowMapping:
        # Count personnel rows once, never employee-department assignments.
        counts = [
            select(func.count()).select_from(model)
            .where(model.deleted_at.is_(None)).scalar_subquery().label(name)
            for name, model in (
                ("employees", Employee),
                ("scientific_members", ScientificMember),
                ("schools", School),
            )
        ]
        return db.execute(select(*counts)).mappings().one()

    def get_observation_result_counts(self, db: Session) -> list[RowMapping]:
        # Aggregate persisted result codes; do not recalculate scores or bands.
        # Active historical observations still count if their employee/observer
        # was subsequently deleted, since the observation itself still exists.
        statements = [
            select(
                literal(observation_type).label("observation_type"),
                model.final_result_code.label("final_result_code"),
                func.count().label("count"),
            )
            .where(model.deleted_at.is_(None))
            .group_by(model.final_result_code)
            for observation_type, model in (
                ("teacher", TeacherObservation),
                ("amir_senior_teacher", AmirObservation),
            )
        ]
        results = union_all(*statements).subquery("observation_results")
        return list(db.execute(
            select(results).order_by(
                results.c.observation_type,
                results.c.final_result_code.asc().nulls_first(),
            )
        ).mappings())
