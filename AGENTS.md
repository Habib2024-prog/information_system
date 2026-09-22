# Project Instructions

This is a Persian/Dari RTL government information management system.

Backend:

- Python
- FastAPI
- SQLAlchemy 2
- PostgreSQL
- Alembic
- Pydantic
- pytest

Frontend later:

- React
- TypeScript
- Tailwind CSS
- shadcn/ui

GENERAL RULES

1. All user-facing UI must be Persian/Dari.
2. Entire UI must support RTL.
3. User-facing field labels, buttons, filters, validation messages, table headers and dropdown values must be Persian/Dari.
4. Internal code identifiers, variables, API field names, table names and column names must be English.
5. Do not duplicate employee data across modules.
6. Employees are the main source of personnel information.
7. One employee can belong to multiple departments.
8. subjects_taught must remain a TEXT field.
9. city_district must exist on employee.
10. One employee can have multiple observations.
11. Teacher and Amir observations are separate.
12. Observer will later reference scientific_members.
13. Scientific member fields are not finalized yet.
14. Observation scoring ranges are not finalized yet.
15. Do not invent missing scoring ranges.
16. Do not invent permanent scientific-member fields.
17. Schools are an independent module.
18. Filtering must return complete matching records.
19. Excel export must respect active filters.
20. Use Alembic for database migrations.
21. Use Pydantic validation.
22. Keep routes, services, repositories, models and schemas separated.
23. Do not place business logic directly in API routes.
24. Use soft delete where appropriate.
25. Important tables must have created_at and updated_at.
26. Do not hard-code database IDs.
27. Run tests after meaningful changes.
28. Do not modify unrelated working modules when implementing a new feature.
29. Show changed files after implementation.
30. Prefer maintainable, modular code over shortcuts.
