"""SQLAlchemy models imported for Alembic metadata discovery."""

from app.models.department import Department
from app.models.employee import Employee
from app.models.employee_department import EmployeeDepartment
from app.models.scientific_member import ScientificMember
from app.models.teacher_observation import TeacherObservation

__all__ = [
    "Department",
    "Employee",
    "EmployeeDepartment",
    "ScientificMember",
    "TeacherObservation",
]
