from fastapi import APIRouter

from app.api.routes.departments import router as departments_router
from app.api.routes.employees import router as employees_router

api_router = APIRouter(prefix="/api")
api_router.include_router(departments_router)
api_router.include_router(employees_router)
