from fastapi import APIRouter

from app.api.routes.departments import router as departments_router
from app.api.routes.employees import router as employees_router
from app.api.routes.scientific_members import router as scientific_members_router
from app.api.routes.teacher_observations import router as teacher_observations_router

api_router = APIRouter(prefix="/api")
api_router.include_router(departments_router)
api_router.include_router(employees_router)
api_router.include_router(scientific_members_router)
api_router.include_router(teacher_observations_router)
