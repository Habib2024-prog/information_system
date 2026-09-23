from app.db.session import SessionLocal, get_engine
from app.services.department_service import DepartmentService


def seed_departments() -> int:
    """Create missing predefined departments without relying on numeric IDs."""

    with SessionLocal(bind=get_engine()) as db:
        return DepartmentService().seed_predefined_departments(db)


if __name__ == "__main__":
    created_count = seed_departments()
    print(f"Created {created_count} predefined department(s).")
