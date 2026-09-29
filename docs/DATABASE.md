# PostgreSQL Relational Database Design

## 1. Scope and design status

This is a documentation-only relational design for PostgreSQL. It does not add
FastAPI code, SQLAlchemy models, Alembic migrations, or SQL files.

The design implements the supplied data relationships without duplicating
employee data. Items marked **TBD** require the referenced Excel form or a
business decision before a migration is created; they are not proposed as
guessed fields or rules.

## 2. Database-wide conventions

### 2.1 Naming, identifiers, and labels

- Table names, column names, API fields, and internal codes are English and use
  `snake_case`.
- Each primary key is `BIGINT GENERATED ALWAYS AS IDENTITY`. PostgreSQL creates
  its value, so application code and seed data never hard-code database IDs.
- Persian/Dari labels are not stored as enum keys or shown from internal values.
  The UI resolves stable internal codes through centralized Persian/Dari label
  mappings.
- `departments.code`, `employees.job_title_code`, and
  `employees.field_match_code` are `TEXT` codes, not PostgreSQL enums. Their
  permitted vocabularies are pending, so no guessed `CHECK` lists are added.

### 2.2 Timestamps and soft deletion

- Important domain tables use `created_at TIMESTAMPTZ NOT NULL DEFAULT
  CURRENT_TIMESTAMP` and `updated_at TIMESTAMPTZ NOT NULL DEFAULT
  CURRENT_TIMESTAMP`.
- The application or an approved database trigger must update `updated_at` on
  every modification; this document does not prescribe the implementation.
- Soft-deletable tables have `deleted_at TIMESTAMPTZ NULL DEFAULT NULL`.
  Ordinary reads, filters, department results, counts, and exports must exclude
  rows where `deleted_at IS NOT NULL` unless a future explicit rule says
  otherwise.
- Soft delete is used for independent business records and the
  employee/department assignment. It is not used for immutable audit records.

### 2.3 Requiredness notation

- **Yes** means the requirement is sufficiently defined to use `NOT NULL`.
- **No** means the column is intentionally nullable.
- **TBD** means the field must exist, but the requirements do not yet state
  whether it is mandatory; no `NOT NULL` decision should be implemented yet.

## 3. Relationship diagram

```mermaid
erDiagram
    EMPLOYEES ||--o{ EMPLOYEE_DEPARTMENTS : is_assigned_to
    DEPARTMENTS ||--o{ EMPLOYEE_DEPARTMENTS : has_members
    DEPARTMENTS ||--o{ SCIENTIFIC_MEMBERS : includes
    EMPLOYEES ||--o{ TEACHER_OBSERVATIONS : is_observed_in
    EMPLOYEES ||--o{ AMIR_OBSERVATIONS : is_observed_in
    SCIENTIFIC_MEMBERS ||--o{ TEACHER_OBSERVATIONS : observes
    SCIENTIFIC_MEMBERS ||--o{ AMIR_OBSERVATIONS : observes
    SCHOOLS ||--o{ SCHOOL_GRADE_SECTIONS : has_grade_sections
    USERS ||--o{ AUDIT_LOGS : performs
```

`SCHOOL_GRADE_SECTIONS` is the approved child table for named sections within
grades 1 through 12. Grade totals are calculated from active section rows.

## 4. Core tables

### 4.1 `employees`

**Purpose:** The single authoritative store for employee personnel data. No
department or observation table may copy these personnel columns.

| Column | PostgreSQL type | Required | Default | Key / constraint / notes |
| --- | --- | --- | --- | --- |
| `id` | `BIGINT GENERATED ALWAYS AS IDENTITY` | Yes | identity | Primary key |
| `name` | `TEXT` | Yes | none | Employee name (اسم) |
| `father_name` | `TEXT` | Yes | none | Father name (ولد) |
| `grandfather_name` | `TEXT` | Yes | none | Grandfather name (ولدیت) |
| `school_workplace` | `TEXT` | Yes | none | School/workplace (مکتب); not a foreign key because employee data must not make Schools a dependent module |
| `city_district` | `TEXT` | Yes | none | Required column for شهر/ولسوالی |
| `phone_number` | `TEXT` | Yes | none | Phone number; `TEXT` preserves leading zeroes and input formatting |
| `field_of_study` | `TEXT` | Yes | none | رشته تحصیلی |
| `education_level` | `TEXT` | Yes | none | درجه تحصیل |
| `subjects_taught` | `TEXT` | Yes | none | Free-text field; must not become a comma-separated department relation or controlled subject list |
| `job_title_code` | `TEXT` | Yes | none | Stable internal job-title value; UI uses centralized Persian/Dari mapping |
| `teaching_experience` | `INTEGER` | Yes | none | سابقه تدریس; integer-compatible value |
| `grade_post` | `INTEGER` | Yes | none | بست; integer-compatible value |
| `step` | `INTEGER` | Yes | none | قدم; integer-compatible value |
| `successful_evaluation` | `TEXT` | Yes | none | ارزیابی موفق; allowed values pending |
| `field_match_code` | `TEXT` | Yes | none | Stable internal field-match value; UI uses centralized Persian/Dari mapping |
| `notes` | `TEXT` | No | `NULL` | ملاحظات; long text |
| `created_at` | `TIMESTAMPTZ` | Yes | `CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | Yes | `CURRENT_TIMESTAMP` | Modification timestamp |
| `deleted_at` | `TIMESTAMPTZ` | No | `NULL` | Soft-delete marker |

**Foreign keys:** None. `school_workplace` remains employee-provided text;
Schools is explicitly an independent module, and no supplied rule defines a
relationship between it and employees.

**Unique constraints:** None are proposed. No employee natural-key or
deduplication rule has been supplied.

**Indexes:**

- B-tree index on `job_title_code` for job-title filtering.
- B-tree index on `field_match_code` for field-match filtering.
- B-tree index on `city_district` for location filtering when enabled.
- B-tree index on `school_workplace` for workplace filtering when enabled.
- B-tree index on `deleted_at` only if query planning shows it useful; every
  normal query must nevertheless exclude soft-deleted rows.

**Soft-delete behavior:** Set `deleted_at`; do not hard-delete an employee as a
normal action. The exact restore and historical-observation behavior is TBD.

### 4.2 `departments`

**Purpose:** Stores the predefined department catalogue. A stable code allows
services and label mappings to identify a department without hard-coding its
database ID.

| Column | PostgreSQL type | Required | Default | Key / constraint / notes |
| --- | --- | --- | --- | --- |
| `id` | `BIGINT GENERATED ALWAYS AS IDENTITY` | Yes | identity | Primary key |
| `code` | `TEXT` | Yes | none | Stable, English internal department code; unique |
| `created_at` | `TIMESTAMPTZ` | Yes | `CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | Yes | `CURRENT_TIMESTAMP` | Modification timestamp |
| `deleted_at` | `TIMESTAMPTZ` | No | `NULL` | Soft-delete marker |

**Foreign keys:** None.

**Unique constraints:** `UNIQUE (code)`. A department code remains unique even
if the department is soft-deleted, preventing a different department from
reusing the same stable identity.

**Indexes:** The unique constraint indexes `code`; add an index on
`deleted_at` only if query planning justifies it.

**Soft-delete behavior:** A deleted department is excluded from ordinary
department lists and new assignments. Existing assignments must not be silently
rewritten; the exact historical display policy is TBD.

**Mandatory non-teacher rule:** This is deliberately **not** a database ID
constraint. The service layer must resolve the department using its stable code
(for example, the code mapped to **تعلیم و تربیه**) and, when an employee's
`job_title_code` is not the code mapped to **معلم**, ensure an active
`employee_departments` row exists. The service must also permit additional
departments for non-teachers. This rule must be validated server-side, not only
in the UI.

### 4.3 `employee_departments`

**Purpose:** Explicit many-to-many association between employees and
departments. It permits one employee to appear in every assigned department
without duplicating employee data.

| Column | PostgreSQL type | Required | Default | Key / constraint / notes |
| --- | --- | --- | --- | --- |
| `id` | `BIGINT GENERATED ALWAYS AS IDENTITY` | Yes | identity | Primary key |
| `employee_id` | `BIGINT` | Yes | none | Foreign key to `employees.id` |
| `department_id` | `BIGINT` | Yes | none | Foreign key to `departments.id` |
| `created_at` | `TIMESTAMPTZ` | Yes | `CURRENT_TIMESTAMP` | Assignment creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | Yes | `CURRENT_TIMESTAMP` | Assignment modification timestamp |
| `deleted_at` | `TIMESTAMPTZ` | No | `NULL` | Assignment soft-delete marker |

**Foreign keys:**

- `employee_id REFERENCES employees(id)`.
- `department_id REFERENCES departments(id)`.
- Delete actions must be restrictive while records remain referenced; ordinary
  removal uses soft delete rather than cascading hard deletion.

**Unique constraints:** A partial unique index on
`(employee_id, department_id) WHERE deleted_at IS NULL` prevents duplicate
active assignments while allowing a previously removed assignment to be
recorded again.

**Indexes:**

- B-tree index on `(department_id, employee_id)` for a department page's
  employee result.
- B-tree index on `(employee_id, department_id)` for an employee's selected
  departments and service validation.
- The partial unique index above also supports active-pair lookup.

**Soft-delete behavior:** Removing a department selection sets `deleted_at`.
Active department queries require `deleted_at IS NULL`.

### 4.4 `scientific_members`

**Purpose:** Independent store for Scientific Members, who can be selected as
observers and can each perform many observations.

| Column | PostgreSQL type | Required | Default | Key / constraint / notes |
| --- | --- | --- | --- | --- |
| `id` | `BIGINT GENERATED ALWAYS AS IDENTITY` | Yes | identity | Primary key |
| `name` | `TEXT` | TBD | none | اسم |
| `surname` | `TEXT` | TBD | none | تخلص |
| `father_name` | `TEXT` | TBD | none | ولد |
| `phone_number` | `TEXT` | TBD | none | شماره تماس |
| `academic_rank` | `TEXT` | TBD | none | رتبه علمی |
| `department_id` | `BIGINT` | Yes | none | Foreign key to `departments.id`; selected existing system department |
| `notes` | `TEXT` | No | `NULL` | ملاحظات; long text |
| `created_at` | `TIMESTAMPTZ` | Yes | `CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | Yes | `CURRENT_TIMESTAMP` | Modification timestamp |
| `deleted_at` | `TIMESTAMPTZ` | No | `NULL` | Soft-delete marker |

**Foreign keys:** `department_id REFERENCES departments(id)`. Scientific Members
select an existing system department, so this foreign key preserves the
catalogue relationship without storing a free-text department value.

**Unique constraints:** None are proposed because no natural identifier or
uniqueness rule is supplied.

**Indexes:** B-tree index on `department_id` for department filtering and
joins; B-tree index on `academic_rank` (if filtering
requires it), and `deleted_at` if demonstrated useful.

**Soft-delete behavior:** Set `deleted_at` instead of deleting an observer that
may be referenced by historical observations. New observation forms should not
offer a soft-deleted member.

### 4.5 `teacher_observations`

**Purpose:** Stores Teacher Observation records separately from Amir/Senior
Teacher observations, including the six Teacher competencies and the selected
Scientific Member observer.

| Column | PostgreSQL type | Required | Default | Key / constraint / notes |
| --- | --- | --- | --- | --- |
| `id` | `BIGINT GENERATED ALWAYS AS IDENTITY` | Yes | identity | Primary key |
| `employee_id` | `BIGINT` | Yes | none | Foreign key to observed employee |
| `observer_scientific_member_id` | `BIGINT` | Yes | none | Foreign key to the observing Scientific Member |
| `observation_date` | `DATE` | TBD | none | تاریخ مشاهده |
| `observed_class` | `TEXT` | TBD | none | صنف مشاهده شده |
| `subject` | `TEXT` | TBD | none | مضمون |
| `subject_knowledge_score` | `NUMERIC(4,2)` | TBD | none | دانش مضمونی; `CHECK (value >= 0 AND value <= 3)` when non-null |
| `lesson_plan_score` | `NUMERIC(4,2)` | TBD | none | پلان درسی; same bounded check |
| `classroom_management_score` | `NUMERIC(4,2)` | TBD | none | مدیریت صنف; same bounded check |
| `assessment_score` | `NUMERIC(4,2)` | TBD | none | ارزیابی; same bounded check |
| `professional_learning_score` | `NUMERIC(4,2)` | TBD | none | آموزش های مسلکی; same bounded check |
| `community_engagement_score` | `NUMERIC(4,2)` | TBD | none | ارتباط با اجتماع; same bounded check |
| `total_score` | `NUMERIC` | No | `NULL` | Server-controlled calculated value; clients cannot set it |
| `final_result_code` | `TEXT` | No | `NULL` | Server-controlled calculated internal result; clients cannot set it; UI label mapping only |
| `strengths` | `TEXT` | No | `NULL` | نکات قوت; long text / textarea |
| `improvements` | `TEXT` | No | `NULL` | نکات قابل اصلاح; long text / textarea |
| `notes` | `TEXT` | No | `NULL` | ملاحظات; long text / textarea |
| `created_at` | `TIMESTAMPTZ` | Yes | `CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | Yes | `CURRENT_TIMESTAMP` | Modification timestamp |
| `deleted_at` | `TIMESTAMPTZ` | No | `NULL` | Soft-delete marker |

**Foreign keys:**

- `employee_id REFERENCES employees(id)` exists because one employee can have
  many Teacher Observations.
- `observer_scientific_member_id REFERENCES scientific_members(id)` exists
  because one Scientific Member can observe many records.
- Both foreign keys should restrict hard deletion; soft deletion preserves
  historical observation references.

**Unique constraints:** None. The requirements permit multiple observations for
the same employee, including on the same date unless a later rule forbids it.

**Indexes:**

- B-tree index on `(employee_id, observation_date DESC)` for employee details.
- B-tree index on `(observer_scientific_member_id, observation_date DESC)` for
  the Scientific Member observation count/list action.
- B-tree index on `observation_date` for date filtering.
- Index on `deleted_at` only when demonstrated useful.

**Scoring behavior:** The bounded per-competency checks allow values from 0
through 3. `total_score` and `final_result_code` are server-controlled service
layer values; clients must not set them directly. Final-result classification
uses the exact calculated decimal total and never rounds it. Totals below
`1.00`, or otherwise outside an approved range, remain `NULL`.
The known display mappings, to be resolved through UI label mappings rather than
database enum labels, are:

| Teacher competency score | Display result |
| --- | --- |
| 0–0.75 | قابلیت مشاهده نشد |
| 0.76–1.5 | نیازمند بهبود |
| 1.6–2.25 | دارای قابلیت |
| 2.26–3 | تسلط بر قابلیت |

| Teacher total score | Display result |
| --- | --- |
| 1.00–10.99 | نیازمند بهبود |
| 11.00–14.99 | دارای قابلیت |
| 15.00–18.00 | تسلط بر قابلیت |

**Soft-delete behavior:** Set `deleted_at`; do not remove historical observation
data through ordinary deletion.

### 4.6 `amir_observations`

**Purpose:** Stores Amir/Senior Teacher Observation records independently from
Teacher Observations, using its own four competency fields.

| Column | PostgreSQL type | Required | Default | Key / constraint / notes |
| --- | --- | --- | --- | --- |
| `id` | `BIGINT GENERATED ALWAYS AS IDENTITY` | Yes | identity | Primary key |
| `employee_id` | `BIGINT` | Yes | none | Foreign key to observed employee |
| `observer_scientific_member_id` | `BIGINT` | Yes | none | Foreign key to observing Scientific Member |
| `observation_date` | `DATE` | TBD | none | تاریخ مشاهده |
| `observed_class` | `TEXT` | TBD | none | صنف مشاهده شده |
| `subject` | `TEXT` | TBD | none | مضمون |
| `responsibility_score` | `NUMERIC(4,2)` | TBD | none | مسوولیت پذیری; `CHECK (value >= 0 AND value <= 3)` when non-null |
| `professional_leadership_score` | `NUMERIC(4,2)` | TBD | none | رهبری مسلکی; same bounded check |
| `community_relations_score` | `NUMERIC(4,2)` | TBD | none | روابط با جامعه; same bounded check |
| `professional_development_score` | `NUMERIC(4,2)` | TBD | none | انکشاف مسلکی; same bounded check |
| `total_score` | `NUMERIC` | No | `NULL` | Server-controlled calculated value; clients cannot set it |
| `final_result_code` | `TEXT` | No | `NULL` | Server-controlled calculated internal result; clients cannot set it; UI label mapping only |
| `strengths` | `TEXT` | No | `NULL` | نکات قوت; long-text UI field |
| `improvements` | `TEXT` | No | `NULL` | نکات قابل اصلاح; long-text UI field |
| `notes` | `TEXT` | No | `NULL` | ملاحظات; long-text UI field |
| `created_at` | `TIMESTAMPTZ` | Yes | `CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | Yes | `CURRENT_TIMESTAMP` | Modification timestamp |
| `deleted_at` | `TIMESTAMPTZ` | No | `NULL` | Soft-delete marker |

**Foreign keys:**

- `employee_id REFERENCES employees(id)` supports multiple Amir/Senior Teacher
  observations per employee.
- `observer_scientific_member_id REFERENCES scientific_members(id)` supports a
  Scientific Member observing many records and a unified observation count/list
  across both observation tables.

**Unique constraints:** None. Multiple observation records per employee are
allowed.

**Indexes:**

- B-tree index on `(employee_id, observation_date DESC)`.
- B-tree index on `(observer_scientific_member_id, observation_date DESC)`.
- B-tree index on `observation_date`.
- Index on `deleted_at` only when demonstrated useful.

**Scoring behavior:** Per-competency checks permit only 0 through 3. The
service layer controls `total_score` and `final_result_code`; clients cannot
set them. Final-result classification uses the exact calculated decimal total
without rounding. Totals below `1.00`, or otherwise outside an approved range,
remain `NULL`.

| Amir/Senior Teacher competency score | Display result |
| --- | --- |
| 0–0.75 | غیر قابل ارزیابی |
| 0.76–1.5 | نیازمند بهبود |
| 1.6–2.25 | دارای قابلیت |
| 2.26–3 | تسلط بر قابلیت |

| Amir/Senior Teacher total score | Display result |
| --- | --- |
| 1.00–4.99 | قابلیت ابتدایی |
| 5.00–8.99 | قابلیت بکارگیری |
| 9.00–12.00 | مسلط بر قابلیت |

**Soft-delete behavior:** Set `deleted_at`; do not hard-delete ordinary
historical observation data.

### 4.7 `schools`

**Purpose:** Independent Schools module. It must not reference employees or
reuse employee personnel columns.

| Column | PostgreSQL type | Required | Default | Key / constraint / notes |
| --- | --- | --- | --- | --- |
| `id` | `BIGINT GENERATED ALWAYS AS IDENTITY` | Yes | identity | Primary key |
| `school_name` | `TEXT` | Yes | none | School name |
| `school_head_phone` | `TEXT` | No | `NULL` | School head phone; `TEXT` preserves leading zeroes and formatting |
| `school_type_code` | `TEXT` | Yes | none | Stable internal school-type value; UI uses Persian/Dari label mapping |
| `gender_type_code` | `TEXT` | Yes | none | Stable internal gender/type value; UI uses Persian/Dari label mapping |
| `school_code` | `TEXT` | Yes | none | School code; unique |
| `school_formation` | `TEXT` | Yes | none | School formation |
| `senior_teacher_count` | `INTEGER` | Yes | `0` | Number of senior teachers; `CHECK (value >= 0)` |
| `male_teacher_count` | `INTEGER` | Yes | `0` | Number of male teachers; `CHECK (value >= 0)` |
| `female_teacher_count` | `INTEGER` | Yes | `0` | Number of female teachers; `CHECK (value >= 0)` |
| `incoming_service_teacher_count` | `INTEGER` | Yes | `0` | Number of incoming service teachers; `CHECK (value >= 0)` |
| `outgoing_service_teacher_count` | `INTEGER` | Yes | `0` | Number of outgoing service teachers; `CHECK (value >= 0)` |
| `volunteer_teacher_count` | `INTEGER` | Yes | `0` | Number of volunteer teachers; `CHECK (value >= 0)` |
| `active_class_section_count` | `INTEGER` | Yes | `0` | Number of active class sections; `CHECK (value >= 0)` |
| `school_needs` | `TEXT` | No | `NULL` | School needs; long descriptive text |
| `school_equipment` | `TEXT` | No | `NULL` | School equipment; long descriptive text |
| `created_at` | `TIMESTAMPTZ` | Yes | `CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | Yes | `CURRENT_TIMESTAMP` | Modification timestamp |
| `deleted_at` | `TIMESTAMPTZ` | No | `NULL` | Soft-delete marker |

**Foreign keys:** None are currently defined. Schools are an independent module.

**Unique constraints:** `UNIQUE (school_code)`. The code remains unique even
after soft deletion so it continues to identify the same school consistently.

**Indexes:**

- The unique constraint indexes `school_code`.
- B-tree index on `school_name` for school-name lookup.
- B-tree indexes on `school_type_code`, `gender_type_code`, and
  `school_formation` for filtering.
- Index `deleted_at` only if query planning demonstrates a benefit.

**Soft-delete behavior:** Set `deleted_at`; the precise restore and export
handling is pending.

### 4.8 `school_grade_sections`

**Purpose:** Stores statistics for one named section within a School grade.
One School can have zero, one, or many sections for each grade from 1 through
12, without repeating the School's own fields.

| Column | PostgreSQL type | Required | Default | Key / constraint / notes |
| --- | --- | --- | --- | --- |
| `id` | `BIGINT GENERATED ALWAYS AS IDENTITY` | Yes | identity | Primary key |
| `school_id` | `BIGINT` | Yes | none | Foreign key to `schools.id` |
| `grade_number` | `SMALLINT` | Yes | none | `CHECK (grade_number BETWEEN 1 AND 12)` |
| `section_name` | `TEXT` | Yes | none | Free-text section/class name; `CHECK (section_name <> '')` |
| `enrolled_count` | `INTEGER` | Yes | `0` | `CHECK (enrolled_count >= 0)` |
| `present_count` | `INTEGER` | Yes | `0` | `CHECK (present_count >= 0 AND present_count <= enrolled_count)` |
| `female_count` | `INTEGER` | Yes | `0` | `CHECK (female_count >= 0 AND female_count <= enrolled_count)` |
| `male_count` | `INTEGER` | Yes | `0` | `CHECK (male_count >= 0 AND male_count <= enrolled_count)` |
| `created_at` | `TIMESTAMPTZ` | Yes | `CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | Yes | `CURRENT_TIMESTAMP` | Modification timestamp |
| `deleted_at` | `TIMESTAMPTZ` | No | `NULL` | Soft-delete marker |

**Relationship reason:** A School has grade sections, and a section cannot
exist without its School. `grade_number` groups the sections under grades 1–12
without storing duplicate grade totals.

**Foreign keys:** `school_id REFERENCES schools(id)`. Hard deletion must be
restricted; ordinary removal uses the soft-delete marker.

**Unique constraints:** Partial unique index on
`(school_id, grade_number, section_name) WHERE deleted_at IS NULL`. It prevents
duplicate active section names within one School grade while allowing the same
name in another grade and preserving soft-deleted history.

**Count rule:** `present_count`, `female_count`, and `male_count` must not
individually exceed `enrolled_count`. The schema does not constrain
`male_count + female_count = enrolled_count`; that equality has not been
approved as a business rule. It does constrain
`male_count + female_count <= enrolled_count`.

**Indexes:** The partial unique index supports active School/grade/section
lookup. A B-tree index on `grade_number` supports cross-school grade filtering;
index `deleted_at` only when query planning demonstrates a benefit.

**Soft-delete behavior:** Set `deleted_at`; active statistics queries exclude
soft-deleted records.

## 5. Access control and audit logs

Username/password authentication and one role per account are now approved.
The current design below supersedes the earlier future `roles` / `user_roles`
proposal. Audit logging and the initial module-access policy are now approved;
finer permissions and audit retention remain future work.

### 5.1 `users`

**Purpose:** Authenticated-user account. It is separate from `employees`
because a user account is an access-control identity, not employee personnel
data.

| Column | PostgreSQL type | Required | Default | Key / constraint / notes |
| --- | --- | --- | --- | --- |
| `id` | `BIGINT GENERATED ALWAYS AS IDENTITY` | Yes | identity | Primary key |
| `username` | `TEXT` | Yes | none | Unique username; no email is required |
| `full_name` | `TEXT` | Yes | none | Persian/Dari user name |
| `password_hash` | `TEXT` | Yes | none | Argon2 hash only; never returned from the API |
| `role_code` | `TEXT` | Yes | none | `CHECK (role_code IN ('admin', 'user'))`; one role per account |
| `is_active` | `BOOLEAN` | Yes | `TRUE` | Account enablement flag |
| `created_at` | `TIMESTAMPTZ` | Yes | `CURRENT_TIMESTAMP` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | Yes | `CURRENT_TIMESTAMP` | Modification timestamp |
| `deleted_at` | `TIMESTAMPTZ` | No | `NULL` | Soft-delete marker |

**Foreign keys:** None. A user-to-employee relationship has not been supplied
and must not be invented.

**Unique constraints:** `UNIQUE (username)`; deleted accounts still reserve
their usernames. No username case-folding policy is introduced.

**Indexes:** The unique constraint indexes `username` for login and duplicate
checks. B-tree index on `role_code` supports role lookup. Normal user queries
exclude deleted accounts.

**Soft-delete behavior:** Set `deleted_at`. Deleted and inactive accounts
cannot log in or authenticate with an already-issued token. Password and role
changes update `updated_at`; only public fields are serialized to responses.

### 5.2 Role representation

`admin` and `user` are stable internal codes with centralized Persian/Dari
labels. The approved account payload contains one `role_code`, so no `roles`
or `user_roles` tables are created in this phase. There is no relationship to
employees or scientific members. Reusable authentication dependencies resolve
the account and check its current role/status from the database.

### 5.3 `audit_logs`

**Purpose:** Append-only record of successful application actions. It
supports actor lookup and entity history without forcing every audited entity
into a common parent table.

| Column | PostgreSQL type | Required | Default | Key / constraint / notes |
| --- | --- | --- | --- | --- |
| `id` | `BIGINT GENERATED ALWAYS AS IDENTITY` | Yes | identity | Primary key |
| `user_id` | `BIGINT` | Yes | none | Foreign key to `users.id`; authenticated actor, never supplied by the client |
| `action` | `TEXT` | Yes | none | Centralized stable action code |
| `entity_type` | `TEXT` | Yes | none | Stable internal table/entity type code |
| `entity_id` | `BIGINT` | No | `NULL` | Affected entity or export scope ID; global exports have no single entity ID; generic reference has no SQL foreign key |
| `description` | `TEXT` | Yes | none | Persian/Dari action description using centralized mappings |
| `before_data` | `JSONB` | No | `NULL` | Historical snapshots only; preserved, never populated for new logs |
| `after_data` | `JSONB` | No | `NULL` | Historical snapshots only; preserved, never populated for new logs |
| `metadata` | `JSONB` | No | `NULL` | Compact `changes` or `record` details, or effective export filters/scopes and sorting; never workbook content |
| `ip_address` | `TEXT` | No | `NULL` | Request client host when available; no custom forwarded-IP handling |
| `created_at` | `TIMESTAMPTZ` | Yes | `CURRENT_TIMESTAMP` | Time the audit event was recorded |

**Foreign keys:** `user_id REFERENCES users(id) ON DELETE RESTRICT`.
`entity_type` plus `entity_id` is intentionally not an SQL foreign key because
an audit event may refer to any of several tables. Soft-deleted users remain
referenced and readable as audit actors; hard deletion of a referenced user is
restricted.

**Unique constraints:** None; separate actions may legitimately concern the
same entity at the same time.

**Indexes:**

- B-tree index on `(entity_type, entity_id, created_at)` for an entity's
  audit history.
- B-tree indexes on `user_id`, `action`, `entity_type`, `entity_id`, and
  `created_at` for filtering and newest-first reporting. PostgreSQL B-tree
  indexes support reverse scans for descending ordering.

**Timestamps and deletion:** `audit_logs` has `created_at` only. It has no
`updated_at` or `deleted_at` because audit entries should be append-only and
immutable. An ORM guard and PostgreSQL trigger reject UPDATE, DELETE, and
TRUNCATE (the trigger covers raw/bulk SQL as well). Administrators have read-only
API access, with no create/edit/delete endpoints for logs. Retention remains
pending. Business changes and their audit rows commit together; export logs
are committed after successful workbook generation. Credentials are recursively
excluded before insertion and again before serialization.

**Compact storage:** New updates use `metadata.changes`, containing only
changed fields with `old` and `new` values. No-op updates and changes only to
automatic `updated_at` do not create audit entries. New CREATE/DELETE actions
use `metadata.record` with an entity-specific allowlist of identifying fields;
large notes and full record copies are omitted. The entity ID, actor, action,
and timestamp remain on the audit row and are not repeated in this object.
The API exposes `changes` additively from this existing JSONB column and keeps
legacy snapshot fields available. No schema migration, historical rewrite,
retention deletion, or general JSONB GIN index is needed for this change.

## 6. Relationship rationale

| Relationship | Why it exists |
| --- | --- |
| `employees` → `employee_departments` ← `departments` | Implements mandatory many-to-many department assignment, lets one employee appear in many department pages, and avoids copying personnel data. |
| `departments` → `scientific_members` | A Scientific Member selects an existing system department, so `department_id` preserves the catalogue relationship and prevents an unrelated free-text department value. |
| `employees` → `teacher_observations` | Preserves the requirement that a teacher/employee may receive many Teacher Observations. |
| `employees` → `amir_observations` | Preserves the requirement that an employee may receive many Amir/Senior Teacher Observations. |
| `scientific_members` → observation tables | Identifies the observer and supports the Scientific Member UI action that counts and lists observations performed. |
| `schools` → `school_grade_sections` | Stores one named section per School and grade, supports multiple sections for a grade, and prevents repeated School details or stored grade totals. |
| `users.role_code` | Each account has exactly one approved role; no role-assignment relationship table is necessary. |
| `users` → `audit_logs` | Associates each audited request with its authenticated actor and preserves history after account soft deletion. |

## 7. Filter and export support

- Employee filters use indexed employee columns and join through
  `employee_departments` only when a department filter is active. The query must
  return complete employee records, not merely the compact list columns.
- Department results query active `employee_departments` joined to active
  employees, so an employee appears in each assigned department without any
  copied data.
- Teacher and Amir observation lists use their employee, observer, and date
  indexes. The two tables remain separate; a Scientific Member's observation
  count/list is a combined read across them, excluding soft-deleted rows.
- School filters use indexes on school code, name, type, gender/type, and
  formation. Grade-section lookup uses `(school_id, grade_number, section_name)`.
- Excel export uses the same active filter criteria as the corresponding list
  query and exports complete matching records. It must not export all rows when
  the active filters select only a subset.

## 8. Explicitly deferred decisions

- The authoritative department-code catalogue, including the exact stable code
  for **تعلیم و تربیه** and **معلم**.
- Required/optional status, formats, allowed values, and uniqueness rules for
  unfinalized business-input fields.
- All unprovided columns from the Scientific Member, Teacher Observation,
  and Amir Observation Excel forms.
- Observation competency decimal-gap behavior. Final-result totals are
  server-controlled and use the approved exact-decimal ranges without rounding.
- Finer module-specific permissions, audit retention, and archival policy.
  Username/password authentication, the two roles, authenticated normal CRUD,
  admin-only audit reads, and the initial audit action vocabulary are finalized.
