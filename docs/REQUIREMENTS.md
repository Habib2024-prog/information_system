# Functional Requirements

## 1. Document purpose and scope

This document defines the functional requirements for the Persian/Dari,
right-to-left (RTL) government information management system. It covers the
General Employee Table, Departments, Scientific Members, Teacher Observations,
Amir/Senior Teacher Observations, Schools, filtering, Excel export, and the
required list/detail user-interface behavior.

Requirements are separated into the following categories:

- **Finalized requirements** — requirements ready to guide implementation.
- **Pending clarifications** — required decisions or source artifacts that have
  not yet been supplied. No business rules may be inferred for these items.
- **Future requirements** — intentionally deferred functionality.

This document specifies requirements only. It does not create or prescribe
backend, frontend, database, API, or migration implementation files.

## 2. Finalized requirements

### 2.1 System-wide language and presentation

- The entire user interface must be RTL.
- All visible user-interface content must be Persian/Dari. This includes labels,
  table headers, buttons, dropdown display values, filter labels and values,
  validation messages, notifications, and detail views.
- Internal enum keys must never be exposed to users.
- Persian/Dari labels must be maintained through centralized mappings.
- Internal code identifiers, Python variables, API field names, database table
  names, and database column names must remain English.

### 2.2 Data ownership and shared rules

- Employees are the authoritative source of personnel information.
- Employee information must be stored once only. Departments and department
  pages must retrieve employee data from the main employee data rather than
  duplicating personnel fields.
- One employee may belong to one or multiple departments.
- The employee-to-department relationship must be many-to-many.
- Department names must not be saved as a comma-separated value on an employee.
- One employee may have zero, one, or many observations.
- A Scientific Member may act as observer for many observations.
- Teacher observations and Amir/Senior Teacher observations are distinct record
  types with distinct forms and scoring rules.
- Schools are an independent module and are not employee-owned data.

### 2.3 General Employee Table

The General Employee Table is the main employee module. It must maintain the
following user-facing fields. Their internal field identifiers remain English.

| Persian/Dari field | Internal concept / required behavior |
| --- | --- |
| اسم | Employee name |
| ولد | Father name |
| ولدیت | Grandfather name |
| مکتب | School/workplace |
| شهر/ولسوالی | City/district; must exist on every employee record |
| شماره تماس | Phone number |
| رشته تحصیلی | Field of study |
| درجه تحصیل | Education level |
| مضامین که تدریس می‌کند | `subjects_taught`; a free `TEXT` field |
| عنوان وظیفه | Job title |
| سابقه تدریس | Teaching experience |
| بست | Grade/post |
| قدم | Step |
| ارزیابی موفق | Successful evaluation |
| مطابق رشته | Field-match status |
| دیپارتمنت مربوطه | Multi-select department association |
| ملاحظات | Notes; long text |

Employee requirements:

- `subjects_taught` must remain free text; it must not be restricted to a
  predefined subject list by this requirement.
- Department selection must support multiple selections.
- A single employee must be displayable in every department to which the
  employee is assigned.
- If the job title is anything other than **معلم**, the department **تعلیم و
  تربیه** must be automatically and mandatorily included in that employee's
  department assignments.
- A non-teacher employee may additionally belong to other departments.
- The mandatory **تعلیم و تربیه** assignment rule must be enforced by backend
  validation; frontend behavior alone is insufficient.
- The notes field must support long text.

### 2.4 Departments

- The system must display all departments.
- Selecting a department must show its assigned employees.
- Department employee results must be retrieved from the main employee data.
- A department must not store a duplicate copy of employee personnel data.
- An employee assigned to more than one department must appear in every
  applicable department's results.
- The department employee list initially shows only ID, name, father name, and
  actions.
- Department employee actions include:
  - **مشاهده جزئیات** to view the employee's complete details.
  - An Observation action to work with observations for that employee.

### 2.5 Scientific Members

Scientific Members are a separate module. Its schema must follow the provided
Scientific Members Excel form exactly. The currently known user-facing fields
are:

| Persian/Dari field | Internal concept |
| --- | --- |
| اسم | Name |
| تخلص | Surname |
| ولد | Father name |
| شماره تماس | Phone number |
| رتبه علمی | Academic rank |
| دیپارتمنت | Department |
| ملاحظات | Notes; long text |

Scientific Member requirements:

- Notes must support long text.
- A Scientific Member must be selectable as the observer in observation forms.
- Every Scientific Member list row must provide an action that shows the number
  of observations performed by that member.
- Selecting that action must show all observations performed by the member.

### 2.6 Teacher Observations

Teacher observations must follow the provided Teacher Observation Excel form
exactly. One teacher may have many Teacher Observation records. Every Teacher
Observation must reference one Scientific Member as its observer.

Known user-facing fields include:

| Field |
| --- |
| تاریخ مشاهده |
| صنف مشاهده شده |
| مضمون |
| مشاهده‌کننده |
| دانش مضمونی |
| پلان درسی |
| مدیریت صنف |
| ارزیابی |
| آموزش های مسلکی |
| ارتباط با اجتماع |
| نتیجه نهایی |
| نکات قوت |
| نکات قابل اصلاح |
| ملاحظات |

Teacher observation requirements:

- The six competency fields are: دانش مضمونی, پلان درسی, مدیریت صنف, ارزیابی,
  آموزش های مسلکی, and ارتباط با اجتماع.
- نکات قوت, نکات قابل اصلاح, and ملاحظات must support long text and be
  presented as text areas.
- Each competency uses these finalized result ranges:

| Score range | Display result |
| --- | --- |
| 0–0.75 | قابلیت مشاهده نشد |
| 0.76–1.5 | نیازمند بهبود |
| 1.6–2.25 | دارای قابلیت |
| 2.26–3 | تسلط بر قابلیت |

- The final Teacher Observation result uses these finalized ranges:

| Total score range | Display result |
| --- | --- |
| 1–10 | نیازمند بهبود |
| 11–14 | دارای قابلیت |
| 15–18 | تسلط بر قابلیت |

### 2.7 Amir/Senior Teacher Observations

Amir/Senior Teacher observations must follow the provided Amir Observation
Excel form exactly. They are used for Amir and Senior Teacher according to the
requirements. An employee may have many of these observation records.

The four competency fields are:

1. مسوولیت پذیری
2. رهبری مسلکی
3. روابط با جامعه
4. انکشاف مسلکی

The form also includes:

| Field |
| --- |
| تاریخ مشاهده |
| صنف مشاهده شده |
| مضمون |
| مشاهده‌کننده |
| نتیجه نهایی |
| نکات قوت |
| نکات قابل اصلاح |
| ملاحظات |

Amir/Senior Teacher observation requirements:

- The form is separate from the Teacher Observation form.
- Each competency uses these finalized result ranges:

| Score range | Display result |
| --- | --- |
| 0–0.75 | غیر قابل ارزیابی |
| 0.76–1.5 | نیاز مند بهبود |
| 1.6–2.25 | دارای قابلیت |
| 2.26–3 | تسلط بر قابلیت |

- The final result uses these finalized ranges:

| Total score range | Display result |
| --- | --- |
| 1–4 | قابلیت ابتدایی |
| 5–8 | قابلیت بکارگیری |
| 9–12 | مسلط بر قابلیت |

### 2.8 Schools

Schools are completely independent from employee management. School fields
must follow the provided Schools Excel file exactly.

The Schools module must support:

- Add
- View
- Edit
- Delete
- Search
- Filtering
- Excel export

School grade statistics requirements:

- Each School must store student statistics in separate rows for grades 1 through
  12; the School table must not use repeated per-grade columns.
- Each grade-statistics row includes grade number, enrolled count, present
  count, male count, and female count.
- The UI must clearly display these four counts for every available grade from
  **صنف ۱** through **صنف ۱۲**.
- Grade number must be from 1 through 12 and all counts must be non-negative.
- Present count must not exceed enrolled count.
- The system must allow one active grade-statistics row per School and grade.
- The system must not require male count plus female count to equal enrolled
  count unless that rule is later approved explicitly.
- School details and future complete School exports must include all available
  grade statistics.

### 2.9 Filtering

- Filtering must be performed server-side.
- Filtering affects returned rows, not the fields or columns available for a
  matching record.
- Multiple active filters must work together.
- Matching records must retain complete record details, even when a list view
  displays only its default summary columns.
- Example: applying `job title = معلم` and `field match = خلاف رشته` returns
  only employees satisfying both conditions; their full details remain available.
- Filtering must be available where required by the General Employee Table,
  department employee results, and Schools module.

### 2.10 Excel Export

Filtered Excel export must be supported for:

- General Employee Table
- Department employee results
- Schools

Export requirements:

- Export must respect every currently active filter.
- Export must include complete applicable record details, not merely the fields
  visible in a summary list table.
- If 1,000 records exist but active filters return 40, the Excel file must
  contain those 40 matching records and all applicable fields.
- School exports use one column for each grade from 1 through 12. A populated
  grade cell contains enrolled, present, male, and female counts on separate
  lines. When an active grade-statistics row has not been recorded for a
  School, that grade cell is blank; blank cells do not represent inferred
  student statistics.

### 2.11 UI list and detail behavior

- List tables must not show every record field by default.
- The default main list columns are ID, name, father name, and actions.
- The displayed Persian/Dari labels for those fields must be used in the UI.
- Every relevant list row must provide **مشاهده جزئیات** to show complete record
  details.
- Detail views may show all applicable information for the selected record.
- Rows may also offer Edit where that action is permitted.
- Department employee rows must additionally provide the Observation action.
- Summary-table column choices must not limit filtering or Excel export; full
  matching record details must remain available for both.

### 2.12 Architectural and data-quality constraints

- The backend technology is Python 3.12+, FastAPI, SQLAlchemy 2, PostgreSQL,
  Alembic, Pydantic, pytest, and psycopg.
- The future frontend technology is React, TypeScript, Tailwind CSS, and
  shadcn/ui.
- API routes, models, schemas, repositories, and services must be separate.
- Business logic must not be placed directly in route handlers.
- Database schema changes must use Alembic migrations.
- Pydantic validation is required.
- Soft deletion must be used where appropriate.
- Important tables require `created_at` and `updated_at`.
- Database IDs must never be hard-coded.
- Commonly filtered fields require indexes.
- Tests must be run after meaningful changes.
- Unrelated working modules must not be modified when implementing a feature.

## 3. Pending clarifications

The following items are intentionally unresolved. They must be clarified before
their missing behavior, validation, or schema details are implemented.

### 3.1 Observation scoring gaps and decimal totals

No behavior may be invented for scores that fall into gaps between the stated
ranges, or for decimal totals not covered by the stated final-result ranges.

This includes, at minimum:

- Teacher competency values between the stated category endpoints, if any occur.
- Teacher final totals that are decimal or otherwise do not fall within the
  explicit `1–10`, `11–14`, and `15–18` ranges.
- Amir/Senior Teacher competency values between stated category endpoints, if
  any occur.
- Amir/Senior Teacher final totals that are decimal or otherwise do not fall
  within the explicit `1–4`, `5–8`, and `9–12` ranges.

The required clarification is whether values/totals are restricted, rounded,
truncated, rejected, or mapped through another supplied rule. Until then, no
such handling is defined.

### 3.2 Source Excel forms and exact schemas

- The Teacher Observation Excel form is authoritative for all fields beyond the
  known fields listed above. Any missing columns, types, required status,
  formulas, and validation rules must come from that form.
- The Amir Observation Excel form is authoritative for all fields beyond the
  known fields listed above.
- The Scientific Members Excel form is authoritative for the full member
  schema. The listed known fields do not authorize adding permanent fields that
  are not in the form.
- The Schools Excel file is authoritative for the complete School schema. No
  School field, type, validation, or business rule may be invented before it is
  provided.

### 3.3 Remaining business and lifecycle decisions

- The authoritative set of departments, their display order, and active/inactive
  behavior have not been supplied.
- Employee, School, Scientific Member, and observation required/optional
  states, field types, input formats, uniqueness rules, and reference values are
  pending unless directly specified above.
- CRUD scope and deletion/recovery behavior for employees, departments,
  Scientific Members, and observations are not fully specified.
- The entities that require soft delete and any restore, visibility, filtering,
  or export behavior for deleted records are pending.
- The full list of available filters, operators, defaults, sorting, and
  pagination behavior is pending.
- Excel workbook layout, worksheet names, file naming, column order, formatting,
  and deleted-record treatment are pending.
- The exact availability and behavior of Edit actions is pending permissions and
  module-specific lifecycle decisions.

## 4. Future requirements

### 4.1 Authentication

Authentication is planned for a future phase. The login method, user identity
source, account lifecycle, session policy, and password or federation rules are
not yet defined.

### 4.2 Roles and permissions

Role-based permissions are planned for a future phase. The roles, permission
matrix, module access rules, field-level restrictions, approval workflows, and
conditions under which editing is permitted must be supplied before
implementation.

### 4.3 Audit logs

Audit logs are planned for a future phase. The events to record, historical
data to retain, user attribution, retention period, access controls, and audit
reporting requirements are not yet defined.
