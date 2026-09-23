# Project Instructions

This project is a Persian/Dari RTL government information management system.

## Technology

Backend:
- Python 3.12+
- FastAPI
- SQLAlchemy 2
- PostgreSQL
- Alembic
- Pydantic
- pytest
- psycopg

Frontend later:
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

## Language Rules

- All user-facing UI must be Persian/Dari.
- The entire UI must support RTL.
- Field labels, table headers, buttons, dropdown values, validation messages, filters and notifications must be Persian/Dari.
- Internal code identifiers, Python variables, API fields, database table names and database column names must be English.
- Never show internal enum keys to users.
- Use centralized mappings for Persian/Dari labels.

## Employee Rules

- Employees are the main source of personnel information.
- Do not duplicate employee information in department modules.
- subjects_taught must remain a free TEXT field.
- city_district must exist.
- one employee can belong to multiple departments.
- departments must use a many-to-many relationship.
- do not store comma-separated department names in employees.
- one employee can have zero, one or many observations.

## Department Rules

- Department pages retrieve employees from the main employee data.
- One employee may appear in several departments.
- If job_title is anything other than Teacher, the employee must automatically and mandatorily belong to the "تعلیم و تربیه" department.
- Non-teacher employees may also belong to additional departments.
- This rule must be validated in the backend, not only frontend.

## Observation Rules

Teacher observations:
- Six competencies.
- Each employee may have many teacher observations.
- Observation must reference one scientific member as observer.
- Exact fields must follow the provided Excel form.
- Long-text fields must remain text areas.

Amir/Senior Teacher observations:
- Four competencies.
- Used for Amir and Senior Teacher according to requirements.
- Each employee may have many observations.
- Exact fields must follow the provided Excel form.

## Teacher competency ranges

Each teacher competency uses:

0 - 0.75 = قابلیت مشاهده نشد
0.76 - 1.5 = نیازمند بهبود
1.6 - 2.25 = دارای قابلیت
2.26 - 3 = تسلط بر قابلیت

Teacher final result:
1 - 10 = نیازمند بهبود
11 - 14 = دارای قابلیت
15 - 18 = تسلط بر قابلیت

Do not invent handling for undefined decimal gaps or decimal totals.
Document this as a pending scoring clarification until explicitly resolved.

## Amir/Senior Teacher competency ranges

Each competency uses:

0 - 0.75 = غیر قابل ارزیابی
0.76 - 1.5 = نیازمند بهبود
1.6 - 2.25 = دارای قابلیت
2.26 - 3 = تسلط بر قابلیت

Final result:
1 - 4 = قابلیت ابتدایی
5 - 8 = قابلیت بکارگیری
9 - 12 = مسلط بر قابلیت

Do not invent handling for undefined decimal gaps or decimal totals.

## Scientific Members

- Scientific members are a separate module.
- Their fields must follow the provided Excel file.
- A scientific member can be the observer for many observations.
- Every scientific-member row must expose a UI action showing the number of observations performed by that member and allow viewing those observations.
- Notes must support long text.

## Schools

- Schools are a completely independent module.
- Fields must follow the provided Excel file exactly.
- Support CRUD, filtering and Excel export.

## UI Table Rules

- Do not show all columns in list tables.
- Main list tables should prioritize:
  - ID
  - Name
  - Father name
  - Actions
- Add a "مشاهده جزئیات" action to show complete details.
- Department employee rows also need an Observation action.
- Detail views may show all information.

## Filtering

- Filtering affects rows, not visible columns.
- Matching records must still preserve complete record details.
- Multiple filters must work together.
- Filtering should be performed server-side.

## Excel Export

- Excel export must respect all current active filters.
- Export complete matching records, not only columns visible in the UI.
- General employee table, department results and schools must support filtered Excel export.

## Architecture Rules

- Keep API routes, models, schemas, repositories and services separate.
- Do not put business logic directly in route handlers.
- Use Alembic for all schema changes.
- Use Pydantic validation.
- Use soft delete where appropriate.
- Important tables need created_at and updated_at.
- Never hard-code database IDs.
- Add indexes for commonly filtered fields.
- Run tests after meaningful changes.
- Do not modify unrelated working modules.
- Do not invent missing business rules.