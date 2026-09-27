from fastapi import APIRouter, Depends, Request
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from fastapi.responses import HTMLResponse, JSONResponse

from app.api.auth_dependencies import get_current_user

router = APIRouter(include_in_schema=False, dependencies=[Depends(get_current_user)])


@router.get("/openapi.json")
def openapi_document(request: Request) -> JSONResponse:
    return JSONResponse(request.app.openapi())


@router.get("/docs")
def swagger_documentation() -> HTMLResponse:
    return get_swagger_ui_html(openapi_url="/openapi.json", title="مستندات سیستم")


@router.get("/redoc")
def redoc_documentation() -> HTMLResponse:
    return get_redoc_html(openapi_url="/openapi.json", title="مستندات سیستم")
