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

5. Run the FastAPI application.

   ```powershell
   uvicorn backend.app.main:app --reload
   ```

   The health endpoint is available at `http://127.0.0.1:8000/health`.

6. Run the backend tests.

   ```powershell
   pytest backend/tests
   ```

7. Run Alembic commands from the repository root after starting PostgreSQL.

   ```powershell
   alembic -c backend/alembic.ini current
   alembic -c backend/alembic.ini revision --autogenerate -m "describe change"
   alembic -c backend/alembic.ini upgrade head
   ```

8. Seed the predefined departments after applying migrations.

   ```powershell
   Set-Location backend
   python -m app.db.seed_departments
   ```

The Department module is the only business module currently included.

