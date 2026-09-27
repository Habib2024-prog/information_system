from fastapi import Request
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from starlette.responses import JSONResponse, Response


async def safe_auth_validation_errors(request: Request, error: RequestValidationError) -> Response:
    """Do not echo submitted credentials in account/auth validation responses."""
    is_account_request = request.url.path.startswith(("/api/auth/", "/api/users/")) or request.url.path == "/api/users"
    if not is_account_request:
        return await request_validation_exception_handler(request, error)

    details = []
    for item in error.errors():
        field = item["loc"][-1] if item["loc"] else None
        message = "مقدار این فیلد معتبر نیست."
        if item["type"] == "missing":
            message = "این فیلد الزامی است."
        elif field in {"password", "new_password"} and item["type"] == "value_error":
            message = "رمز عبور باید حداقل ۸ حرف داشته باشد."
        elif item["type"] == "extra_forbidden":
            message = "ارسال این فیلد مجاز نیست."
        details.append({"loc": item["loc"], "msg": message, "type": item["type"]})
    return JSONResponse(status_code=422, content={"detail": details})
