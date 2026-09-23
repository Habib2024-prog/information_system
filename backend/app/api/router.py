from fastapi import APIRouter

from app.api.routes.departments import router as departments_router

api_router = APIRouter(prefix="/api")
api_router.include_router(departments_router)
