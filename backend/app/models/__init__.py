"""SQLAlchemy models imported for Alembic metadata discovery."""

from app.models.department import Department
from app.models.amir_observation import AmirObservation
from app.models.employee import Employee
from app.models.employee_department import EmployeeDepartment
from app.models.scientific_member import ScientificMember
from app.models.school import School
from app.models.school_grade_statistic import SchoolGradeStatistic
from app.models.teacher_observation import TeacherObservation

__all__ = [
    "AmirObservation",
    "Department",
    "Employee",
    "EmployeeDepartment",
    "ScientificMember",
    "School",
    "SchoolGradeStatistic",
    "TeacherObservation",
]
