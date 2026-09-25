from fastapi import APIRouter

from app.api.routes.amir_observations import router as amir_observations_router
from app.api.routes.departments import router as departments_router
from app.api.routes.employees import router as employees_router
from app.api.routes.observation_exports import router as observation_exports_router
from app.api.routes.observation_lists import router as observation_lists_router
from app.api.routes.scientific_members import router as scientific_members_router
from app.api.routes.schools import router as schools_router
from app.api.routes.teacher_observations import router as teacher_observations_router

api_router = APIRouter(prefix="/api")
api_router.include_router(amir_observations_router)
api_router.include_router(departments_router)
api_router.include_router(employees_router)
api_router.include_router(observation_exports_router)
api_router.include_router(observation_lists_router)
api_router.include_router(scientific_members_router)
api_router.include_router(schools_router)
api_router.include_router(teacher_observations_router)
