from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.auth_dependencies import authentication_error, get_current_user
from app.db.session import get_db
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import CurrentUserRead
from app.services.auth_service import AuthService, InvalidCredentialsError

router = APIRouter(prefix="/auth", tags=["احراز هویت"])
service = AuthService()


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, request: Request, db: Annotated[Session, Depends(get_db)]) -> TokenResponse:
    try:
        return service.login(db, data, ip_address=request.client.host if request.client else None)
    except InvalidCredentialsError as error:
        raise authentication_error() from error


@router.get("/me", response_model=CurrentUserRead)
def me(user: Annotated[CurrentUserRead, Depends(get_current_user)]) -> CurrentUserRead:
    return user
