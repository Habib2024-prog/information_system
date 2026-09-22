# System Requirements

## 1. Purpose and scope

This document defines the requirements for a Persian/Dari, right-to-left (RTL)
government information management system. It records only requirements that
have been supplied or established for the project. Items whose details have not
been provided are intentionally marked as pending; this document does not infer
their fields, scoring ranges, or business rules.

The system's main modules are:

1. General Employee Table
2. Departments
3. Teacher Observations
4. Amir Observations
5. Scientific Members
6. Schools
7. Filtering
8. Excel Export
9. Authentication and permissions (future)
10. Audit logs (future)

## 2. Cross-cutting finalized requirements

### 2.1 Language and direction

- Every user-facing interface element must be Persian/Dari and RTL.
- This includes page titles, navigation, labels, buttons, filters, validation
  messages, table headers, empty states, confirmation messages, and displayed
  dropdown values.
- Internal implementation identifiers remain English, including code names, API
  fields, database table names, and database column names.

### 2.2 Data ownership and relationships

- Employees are the single source of personnel information.
- Employee information must be stored once only. Department views and other
  dependent modules must use employee data rather than duplicate it.
- An employee can belong to multiple departments.
- An employee can have zero, one, or many observations.
- Teacher observations and Amir observations are separate record types and use
  different forms.
- Schools are an independent module; their data is not an extension of the
  employee data model.

### 2.3 Data integrity and engineering constraints

- Important tables must include `created_at` and `updated_at` fields.
- Soft deletion must be used where appropriate; the exact entities and recovery
  behavior requiring soft deletion remain to be defined.
- Database identifiers must not be hard-coded.
- Database schema changes must be created through Alembic migrations.
- Input and API validation must use Pydantic.
- Backend structure must keep routes, services, repositories, models, and
  schemas separate. Business logic must not be placed directly in API routes.
- The backend platform is Python, FastAPI, SQLAlchemy 2, PostgreSQL, Alembic,
  Pydantic, and pytest.
- The future frontend platform is React, TypeScript, Tailwind CSS, and shadcn/ui.

## 3. Finalized functional requirements

### 3.1 General Employee Table

The General Employee Table is the authoritative employee module. It must store
the following employee concepts:

| Display concept | Implementation requirement / note |
| --- | --- |
| Name | Employee personnel data |
| Father name | Employee personnel data |
| Grandfather name | Employee personnel data |
| School/workplace | Employee personnel data |
| City/district | Must exist on the employee record |
| Phone number | Employee personnel data |
| Field of study | Employee personnel data |
| Education level | Employee personnel data |
| Subjects taught | Must remain a free `TEXT` field |
| Job title | Employee personnel data |
| Teaching experience | Employee personnel data |
| Grade/post | Employee personnel data |
| Step | Employee personnel data |
| Successful evaluation | Employee personnel data |
| Field match status | Employee personnel data |
| Departments | Multi-select association; an employee may have many |
| Notes | Employee personnel data |

Employee data must not be copied into department records or department views.
The department association must support displaying the same employee in every
department to which that employee is assigned.

### 3.2 Departments

- The system must show all predefined departments.
- Selecting or opening a department must show employees assigned to that
  department.
- Department employee results must be derived from the General Employee Table.
- An employee assigned to multiple departments must appear in each applicable
  department result.
- Each employee row in a department result will later include an **Observation**
  button. Its exact behavior and availability rules are not yet finalized.

### 3.3 Observations

#### Common observation behavior

- Observations are associated with an employee.
- Each employee may have no observations or multiple observations.
- The system must support Add, View, Edit, and Delete operations for
  observations.
- The observer will later be chosen from Scientific Members.

#### Teacher observations

- Teacher observations use a form separate from the Amir observation form.
- Teacher observation criteria are based on six competencies.
- The precise six competency definitions and all scoring ranges are pending.
- No scoring range, score calculation, result band, or validation threshold may
  be invented before it is supplied.

#### Amir observations

- Amir observations use their own form and fields, distinct from Teacher
  observations.
- The form fields, validation rules, scoring model, and any derived results are
  pending.

### 3.4 Scientific Members

- Scientific Members are an independent module.
- Its members will become selectable as observers for observations.
- Permanent Scientific Member fields must not be invented. The final schema is
  pending.

### 3.5 Schools

- Schools are a completely independent module.
- School fields must follow the provided Schools Excel file.
- The module must support CRUD operations.
- The module must support filtering.
- The module must support Excel export.

### 3.6 Filtering

- Filtering changes the returned rows; it must not reduce the columns or normal
  detail shown for matched records.
- A filter result must include only records satisfying the active criteria and
  retain all normal details for each returned record.
- Multiple filters must be combined and work together.
- Example: applying `job title = Teacher` and `field match = Out of Field` must
  return only employees satisfying both conditions, while retaining their full
  normal employee details.
- Filtering applies to employee results and the Schools module. Department
  result exports must also honor any active filters.

### 3.7 Excel Export

Excel export must be available for:

- General Employee Table results
- Department results
- Schools results

Export behavior must use the current active filters. For example, if 1,000
records exist and active filters return 40 records, the generated file must
contain those 40 records, including their complete normal details rather than a
reduced set of columns.

## 4. Pending requirements (not finalized)

The following inputs are required before their associated schemas, validation,
or workflows can be finalized:

| Area | Pending decision or artifact |
| --- | --- |
| Predefined departments | Authoritative department list, including Persian/Dari display values and any ordering or active/inactive rules |
| Employee fields | Data types, required/optional status, allowed values, validation rules, and reference lists for the listed concepts |
| Employee lifecycle | CRUD behavior, deletion policy, uniqueness requirements, and whether any fields have historical tracking requirements |
| Department assignment | How assignments are created/removed and whether an assignment needs dates, status, or other metadata |
| Teacher observations | Six competency definitions, form fields, score scales, ranges, aggregation, validation, and final output/status rules |
| Amir observations | Form fields, validation, scoring rules, and outputs |
| Observation lifecycle | Delete semantics, permissions, attachment needs, status workflow, and the precise behavior of the future Observation button |
| Scientific Members | Final field list, validation, lifecycle rules, and selection/display behavior as observation observers |
| Schools | The referenced Schools Excel file and its final column mapping, data types, required fields, validation, and uniqueness rules |
| Filtering | Complete filter list for each module, allowed operators, values, default behavior, and sort/pagination interaction |
| Excel files | Required workbook layout, worksheet names, column order and translations, file naming, formatting, and treatment of deleted records |
| Soft deletion | Which entities use it and whether deleted items can be viewed/restored/exported |
| Timestamps | Which tables are considered important beyond the project-wide rule |

## 5. Future requirements

### 5.1 Authentication and permissions

Authentication and permissions are planned for a later phase. No roles,
permission matrix, login method, user lifecycle, session policy, or access rules
have been specified and must not be assumed.

### 5.2 Audit logs

Audit logging is planned for a later phase. The events to capture, retention
period, access restrictions, reporting, and relationship to soft deletion have
not been specified.

### 5.3 Future observation integration

Once Scientific Members are finalized, observations must reference a Scientific
Member as their observer. The exact data relationship and behavior are pending
the Scientific Members schema and observation specifications.

## 6. Explicit non-requirements until clarified

- Do not define permanent Scientific Member fields.
- Do not define observation scoring ranges or score-derived decisions.
- Do not merge Teacher and Amir observations into one common form.
- Do not duplicate employee records or personnel fields in departments.
- Do not treat Schools as employee-owned data.
- Do not export all database rows when active filters return a smaller result
  set.
- Do not remove normal employee or school details from a record merely because
  filtering was used.
