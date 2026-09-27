from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth_errors import safe_auth_validation_errors
from app.api.router import api_router
from app.api.routes.health import router as health_router
from app.api.routes.documentation import router as documentation_router
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(title="سیستم مدیریت اطلاعات دولتی", docs_url=None, redoc_url=None, openapi_url=None)
    app.add_exception_handler(RequestValidationError, safe_auth_validation_errors)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    app.include_router(health_router)
    app.include_router(documentation_router)
    app.include_router(api_router)
    return app


app = create_app()
