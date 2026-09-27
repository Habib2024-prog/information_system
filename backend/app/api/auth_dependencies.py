from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.common.role_codes import ADMIN_ROLE_CODE
from app.core.security import InvalidTokenError, decode_access_token
from app.db.session import get_db
from app.schemas.user import CurrentUserRead
from app.services.auth_service import AuthService, InvalidCredentialsError
from app.services.audit_service import AUDIT_CONTEXT_KEY, AuditContext

bearer = HTTPBearer(auto_error=False)
auth_service = AuthService()


def authentication_error() -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="اطلاعات ورود معتبر نیست.", headers={"WWW-Authenticate": "Bearer"})


def get_current_user(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> CurrentUserRead:
    if credentials is None:
        raise authentication_error()
    try:
        user = auth_service.get_current_user(db, decode_access_token(credentials.credentials))
        db.info[AUDIT_CONTEXT_KEY] = AuditContext(user.id, request.client.host if request.client else None)
        return user
    except (InvalidTokenError, InvalidCredentialsError) as error:
        raise authentication_error() from error


def require_admin(user: Annotated[CurrentUserRead, Depends(get_current_user)]) -> CurrentUserRead:
    if user.role_code != ADMIN_ROLE_CODE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="اجازهٔ دسترسی به این بخش را ندارید.")
    return user
