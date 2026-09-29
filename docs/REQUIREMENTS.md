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
| 1.00–10.99 | نیازمند بهبود |
| 11.00–14.99 | دارای قابلیت |
| 15.00–18.00 | تسلط بر قابلیت |

The exact calculated decimal total is used without rounding. A total below
`1.00` has no final result (`NULL` / تعیین نشده).

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
| 1.00–4.99 | قابلیت ابتدایی |
| 5.00–8.99 | قابلیت بکارگیری |
| 9.00–12.00 | مسلط بر قابلیت |

The exact calculated decimal total is used without rounding. A total below
`1.00` has no final result (`NULL` / تعیین نشده).

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

School grade and section statistics requirements:

- Each School has grades 1 through 12, and each grade may have zero, one, or
  many named sections/classes. The School table must not use repeated per-grade
  columns.
- Each active section row includes grade number, section name, enrolled count,
  present count, male count, and female count.
- Section names are free text. Examples include **الف**, **ب**, **A**, and
  **1**; no fixed section-name catalogue is required.
- Grade number must be from 1 through 12 and all counts must be non-negative.
- Present, male, and female counts must not individually exceed enrolled count.
- The combined male and female count must not exceed enrolled count for each
  section. Therefore, dynamic totals for a grade cannot exceed that grade's
  enrolled total.
- A School may have only one active occurrence of the same section name within
  the same grade. The same section name may be used in another grade.
- The system must not require male count plus female count to equal enrolled
  count unless that rule is later approved explicitly.
- School details must return sections nested under their grade and include
  dynamic grade totals. Grade totals must not be stored as independent records.
- School create/edit screens must support adding, editing, and removing several
  sections for a grade before saving.

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
- School exports use an **مکاتب** worksheet for general school information and
  an **آمار صنوف و شعبات** worksheet with one row per active section. The
  section worksheet includes school name, school code, grade, section, enrolled,
  present, male, and female counts. A **خلاصه صنوف** worksheet may provide
  dynamic totals per School and grade. Exports exclude soft-deleted schools and
  sections and continue to apply active School filters.

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

### 2.13 Authentication, users, and roles

- Administrators create accounts directly with `username`, `full_name`,
  `password`, `role_code`, and `is_active`. No email, email verification, or
  invite links are required or implemented.
- The approved roles are `admin` and `user`; each account has one `role_code`.
  Administrators manage users and view audit logs. Both roles can perform
  normal business CRUD, observations, and exports.
- Username is unique, including deleted accounts. Passwords require at least
  eight characters and are stored only as secure Argon2 hashes. Plaintext
  passwords and password hashes must never be returned in API responses or
  logged, including validation failures.
- Login uses username and password and returns an expiring JWT access token
  plus public user information. Invalid credentials, unknown usernames,
  inactive accounts, and deleted accounts receive a generic authentication
  error without revealing which credential failed.
- The current-user endpoint returns id, username, full_name, role_code, and
  is_active. JWT signing configuration is provided through environment
  variables, never hard-coded production secrets.
- All user-management endpoints require an authenticated administrator.
  Administrators can list, view, create, update, and delete users. Password
  changes use a dedicated endpoint and store only the newly calculated hash.
- User deletion remains soft deletion internally. Deleted and inactive users
  cannot log in or use existing tokens; role checks use current database data.
- The initial administrator is created through a local interactive command
  that prompts for credentials; no default account/password is created.
- Employee, department, Scientific Member, observation, School, and export
  endpoints require an active authenticated user. Login and health remain
  public; API documentation also requires authentication.

### 2.14 Audit logs

- Record successful LOGIN, CREATE, UPDATE, DELETE, EXPORT,
  CREATE_OBSERVATION, UPDATE_OBSERVATION, DELETE_OBSERVATION, and
  PASSWORD_CHANGE actions using centralized stable internal codes.
- Track Employees (including department-assignment changes), mutable
  Departments, Scientific Members, Schools, named School sections, both
  observation types, and administrator actions on Users.
- The actor comes from the authenticated account, never the submitted payload.
  The IP is `Request.client.host` when available; do not implement additional
  forwarded-header trust rules.
- New creation/deletion records retain only compact identifying information,
  not full record snapshots or long text. Entity IDs, actors, actions, and
  timestamps are stored once in the audit row, not duplicated in details.
- Updates retain only changed business fields as `changes[field] = {old, new}`.
  Unchanged fields and automatic modification timestamps are omitted. No-op
  updates do not generate misleading activity entries.
- Compact details reuse the existing `metadata` JSONB column. Historical
  before/after snapshots remain intact and readable; their changed fields can
  be derived for display without rewriting or deleting existing logs.
- Activity details use Dari field/value labels, structured old/new changes,
  and a responsive scrollable dialog rather than raw JSON or backend keys.
- Audit writes and business changes share a transaction. A failed operation or
  audit write must not leave a successful-action record or partially committed
  business changes. Failed logins are not recorded.
- Export records are written after successful workbook generation. Store only
  effective filters/scopes and sorting metadata, not workbook bytes or rows.
- Recursively remove passwords, password hashes, tokens, secret keys,
  authorization headers, and other credential fields from all audit JSON.
- Audit logs are append-only and have no update/delete API or soft-delete
  marker. User soft deletion preserves the audit actor relationship.
- Only administrators can list or view audit records. Lists support combined
  user, action, entity type, entity ID, and inclusive UTC date filters,
  pagination, sorting, and newest-first ordering by default.
- Trusted local seed/maintenance tools without an authenticated actor do not
  fabricate an audit user; request-level actions are the current audit scope.

## 3. Pending clarifications

The following items are intentionally unresolved. They must be clarified before
their missing behavior, validation, or schema details are implemented.

### 3.1 Observation competency scoring gaps

No behavior may be invented for competency scores that fall into gaps between
the stated competency ranges.

This includes, at minimum:

- Teacher competency values between the stated category endpoints, if any occur.
- Amir/Senior Teacher competency values between stated category endpoints, if
  any occur.

The required clarification is whether such competency values are restricted,
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

### 4.1 Additional authentication functionality

Username/password login and administrator-created accounts are finalized in
section 2.13. Frontend login, refresh-token policy, and any additional session
features are outside the current backend implementation scope.

### 4.2 Roles and permissions

Roles `admin` and `user` and administrator-only user management are finalized.
Both roles may use normal business modules; audit log access is admin-only.
Additional field-level restrictions, approval workflows, and finer permission
policies remain future requirements.

### 4.3 Additional audit policies

The backend audit behavior is finalized in section 2.14. Retention policy,
additional reporting, archival, and auditing trusted local maintenance tools
remain future decisions. No retention deletion is implemented.
