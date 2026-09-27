# Government Information Management System

## Local backend setup

1. Create and activate a Python 3.12+ virtual environment.

   ```powershell
   py -3.12 -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

2. Install backend dependencies.

   ```powershell
   pip install -r backend/requirements.txt
   ```

3. Create local configuration without committing credentials.

   ```powershell
   Copy-Item .env.example .env
   ```

4. Start PostgreSQL 16 with a persistent named Docker volume.

   ```powershell
   docker compose up -d
   ```

5. Enter the backend project directory, apply migrations, and run FastAPI.

   ```powershell
   Set-Location backend
   python -m alembic -c alembic.ini upgrade head
   uvicorn app.main:app --reload
   ```

   The health endpoint is available at `http://127.0.0.1:8000/health`.

6. Run the backend tests.

   ```powershell
   python -m pytest
   ```

7. Run Alembic commands from `backend/` after starting PostgreSQL.

   ```powershell
   python -m alembic -c alembic.ini current
   python -m alembic -c alembic.ini revision --autogenerate -m "describe change"
   python -m alembic -c alembic.ini upgrade head
   python -m alembic -c alembic.ini upgrade head --sql
   ```

8. Migrations initialize the ten predefined departments automatically. The
   optional repair command below inserts missing codes only; repeated runs do
   not create duplicates or modify existing rows.

   ```powershell
   python -m app.db.seed_departments
   ```

## Production departments: Render, Neon, and Vercel

Migration `20260927_0013` fixes the previous local-only initialization: older
migrations created the department table, but the catalogue required a manual
seed. The new migration inserts the ten approved English codes with
`ON CONFLICT (code) DO NOTHING`. It does not update/delete existing departments,
restore deliberately deleted departments, or change employee/member references.
Its downgrade retains the data for the same reason. No numeric IDs are assumed.

Configure Render's backend root directory as `backend`. Its environment must
point to the intended Neon database using `POSTGRES_HOST`, `POSTGRES_PORT`,
`POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`; this application's
current configuration does **not** read `DATABASE_URL`. Keep all credentials
in Render's environment, never in Vercel's `VITE_*` variables. Retain the
existing secure `SECRET_KEY` and JWT settings.

Apply migrations **against that same Neon database**, from `backend`, before
starting the new backend version:

```sh
python -m alembic -c alembic.ini upgrade head
python -m alembic -c alembic.ini current
```

Use the upgrade command as Render's **Pre-Deploy Command** where available
(paid web services), or run it once through an authorized deployment job/shell
before starting the service. `--sql` only generates SQL; it does not apply the
migration. Do not run concurrent Alembic upgrades from multiple workers. Normal
API startup remains read-only with respect to department initialization.

For this deployment, configure:

- Render: `CORS_ORIGINS_RAW=https://information-system-lake.vercel.app`.
- Vercel: `VITE_API_BASE_URL=https://information-system-989w.onrender.com`.
  Use the backend origin, **not** a URL ending in `/api`; request paths already
  include `/api`. A trailing slash is safely normalized by the shared client.
  Vite embeds this variable at build time, so redeploy Vercel after changing it.

Log in normally, then check `/api/departments` in the browser's Network panel:

- `200` with ten rows: fresh database initialization and authenticated loading
  are working. The UI uses database-provided IDs and centralized Persian labels.
- `200` with `[]`: check migration revision and that Render is connecting to
  the correct Neon database/branch. Also inspect whether rows were deliberately
  marked deleted; initialization does not silently restore them.
- `401`: log in again/check the bearer session; the catalogue remains protected.
- A browser CORS error: check the exact allowed frontend origin.
- `5xx`: inspect Render logs and database configuration; do not treat an API
  failure as an empty catalogue or replace it with fake frontend departments.

Optional database verification in the Neon SQL editor (read-only):

```sql
SELECT version_num FROM alembic_version;
SELECT id, code, deleted_at FROM departments ORDER BY code;
```

If migration `0013` has already been applied and missing codes need repair,
`python -m app.db.seed_departments` is also safe to repeat. It uses a database
unique-key conflict guard, so competing seed runs cannot create duplicates.
Existing codes, including soft-deleted ones, are left untouched.

## Authentication and user administration

Configure the repository-root `.env` (never commit it) before using login:

- `SECRET_KEY`: a random secret of at least 32 bytes. Replace the example
  placeholder. Generate a local secret with
  `python -c "import secrets; print(secrets.token_hex(32))"` and store it privately.
- `JWT_ALGORITHM`: `HS256` by default; `HS384` and `HS512` are also supported.
- `ACCESS_TOKEN_EXPIRE_MINUTES`: a positive integer, default `60`.

After applying migrations, create the initial administrator from `backend/`:

```powershell
python -m app.scripts.create_admin
```

The command prompts for username, full name, password, and password confirmation.
No default account or predictable password is created. Passwords require at
least eight characters and are stored as Argon2 hashes, never plaintext. The
CLI is a trusted local administration tool; control access to the host and its
database credentials.

`POST /api/auth/login` accepts JSON `username` and `password`; it returns a JWT
access token and public user data. Send the token as `Authorization: Bearer
<token>`. `GET /api/auth/me` returns the current active user. Invalid login
credentials, inactive accounts, and deleted accounts receive the same generic
authentication error. Account status and role are checked against the database
on every authenticated request.

Only administrators (`role_code=admin`) can use:

- `GET /api/users` (paginated) and `GET /api/users/{id}`.
- `POST /api/users`: username, full_name, password, role_code, is_active.
- `PUT /api/users/{id}`: username, full_name, role_code, is_active.
- `PUT /api/users/{id}/password`: new_password; successful response is `204`.
- `DELETE /api/users/{id}`: marks the account deleted; successful response is `204`.

The other approved role is `user`. Each account has one role; no email,
verification, invites, role catalogue, or multi-role assignment is introduced.
Usernames remain unique after deletion. Passwords and password hashes are
excluded from responses, including credential validation errors.

**Authorization scope:** all business CRUD, observations, and Excel exports
require a valid Bearer token. Both approved roles may use those modules; only
`admin` may manage users or read audit logs. `/api/auth/login` and `/health`
remain public. `/docs`, `/redoc`, and `/openapi.json` also require authentication;
documentation requests must carry the same Authorization header. Existing
frontend now supplies the token centrally. Refresh tokens and finer permission
policies are not implemented.

## Audit logs

Apply the new `20260927_0012` migration before starting the updated API:

```powershell
python -m alembic -c alembic.ini upgrade head
```

Admin-only read endpoints:

- `GET /api/audit-logs` supports `user_id`, `action`, `entity_type`, `entity_id`,
  `date_from`, `date_to`, `page`, `page_size`, `sort_by`, and `sort_order`.
- `GET /api/audit-logs/{id}` returns one record with basic actor information.

Date filters include the entire given UTC calendar date. Default ordering is
`created_at DESC, id DESC`. The API has no log write/delete endpoints.

Successful login, domain CRUD, observation changes, user/password administration,
and all existing Excel exports are audited. School section changes are recorded
separately in the parent School transaction. Employee snapshots include active
department IDs. Export metadata contains effective filters and scope IDs only,
not exported rows or workbook bytes. Business writes and audit writes share a
transaction; audit storage failures propagate rather than being silently ignored.

Credential keys are stripped recursively from all JSON snapshots and metadata.
Actor IDs are server-controlled and the IP comes from `Request.client.host`.
No custom proxy-header trust logic is introduced. Account soft deletion retains
audit history. PostgreSQL prevents changing/removing existing logs via an
append-only trigger; application code also rejects ORM updates/deletes. Trusted
CLI/seed tools without an authenticated actor do not fabricate an audit identity.
Retention and archival policies remain undecided.

## Frontend login and administration

Run the existing frontend with `npm install` and `npm run dev` from `frontend/`.
Apply all backend migrations and create an initial administrator with the
interactive command above first. Open `/login` and enter that account's
username and password. No email or invite is needed.

The auth context verifies `/api/auth/me` before displaying protected content.
All API calls, including deletion and Excel downloads, send the bearer token
through the shared client. A protected `401` clears the session and returns to
login. Logout unmounts protected pages; responses from older sessions are
discarded. Administrators additionally see `/admin/users` and
`/admin/audit-logs`; backend authorization remains the security boundary.

The access token is held in memory and persisted in **sessionStorage** for
same-tab reloads, not localStorage. Passwords and user records are never
persisted. Browser storage is not HttpOnly and remains vulnerable to XSS;
use HTTPS in deployment and keep the frontend free of untrusted HTML/scripts.
Cookie-based sessions would require a separate backend design decision.

User management supports creation, editing, activation, password changes, and
deletion. Audit reads use the backend's action, entity, user-ID, entity-ID, and
date filters; unsupported text-search parameters are not sent. Audit detail
JSON is presented with Persian labels and sensitive fields are removed again
in the frontend. Audit dates filter UTC days; displayed timestamps use the
browser's local timezone.

Verify from `frontend/`: `npm test` and `npm run build`.

An optional real-browser smoke check is available at
`node tests/browser-smoke.mjs`. It expects Vite on `127.0.0.1:5179` and a
separate headless Chrome debugging instance on port `9339` (use an isolated
temporary browser profile, never your personal profile). It intercepts API
requests with test fixtures and checks login/logout, role guards, user CRUD,
password confirmation, audit details/date filters, and mobile layout. It does
not substitute for testing against your configured backend and database.

