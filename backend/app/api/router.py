from fastapi import APIRouter, Depends

from app.api.auth_dependencies import get_current_user
from app.api.routes.audit_logs import router as audit_logs_router

from app.api.routes.amir_observations import router as amir_observations_router
from app.api.routes.auth import router as auth_router
from app.api.routes.departments import router as departments_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.employees import router as employees_router
from app.api.routes.observation_exports import router as observation_exports_router
from app.api.routes.observation_lists import router as observation_lists_router
from app.api.routes.profile_images import router as profile_images_router
from app.api.routes.scientific_members import router as scientific_members_router
from app.api.routes.schools import router as schools_router
from app.api.routes.teacher_observations import router as teacher_observations_router
from app.api.routes.users import router as users_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(profile_images_router)
api_router.include_router(audit_logs_router)
for business_router in (
    amir_observations_router, dashboard_router, departments_router, employees_router,
    observation_exports_router, observation_lists_router, scientific_members_router,
    schools_router, teacher_observations_router,
):
    api_router.include_router(business_router, dependencies=[Depends(get_current_user)])
