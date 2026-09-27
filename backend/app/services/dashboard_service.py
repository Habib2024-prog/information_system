from sqlalchemy.orm import Session

from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard import (
    DashboardObservationOverview,
    DashboardSummary,
    DashboardTotals,
    ObservationResultCount,
)


class DashboardService:
    def __init__(self, repository: DashboardRepository | None = None) -> None:
        self.repository = repository or DashboardRepository()

    def get_summary(self, db: Session) -> DashboardSummary:
        counts = self.repository.get_record_counts(db)
        overview = {
            "teacher": DashboardObservationOverview(observation_type="teacher", total=0, results=[]),
            "amir_senior_teacher": DashboardObservationOverview(
                observation_type="amir_senior_teacher", total=0, results=[],
            ),
        }
        for row in self.repository.get_observation_result_counts(db):
            item = overview[row["observation_type"]]
            item.results.append(ObservationResultCount(
                final_result_code=row["final_result_code"], count=row["count"],
            ))
            item.total += row["count"]
        return DashboardSummary(
            totals=DashboardTotals(
                **counts,
                observations=sum(item.total for item in overview.values()),
            ),
            observation_overview=list(overview.values()),
        )
