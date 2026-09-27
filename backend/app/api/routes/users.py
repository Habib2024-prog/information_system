from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.auth_dependencies import require_admin
from app.db.session import get_db
from app.schemas.user import UserCreate, UserListResponse, UserPasswordUpdate, UserRead, UserUpdate
from app.services.user_service import UserNotFoundError, UserService, UsernameExistsError

router = APIRouter(prefix="/users", tags=["کاربران"], dependencies=[Depends(require_admin)])
DbSession = Annotated[Session, Depends(get_db)]
service = UserService()


def user_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کاربر یافت نشد.")


def username_exists() -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail="نام کاربری قبلاً ثبت شده است.")


@router.get("", response_model=UserListResponse)
def list_users(db: DbSession, page: int = Query(default=1, ge=1), page_size: int = Query(default=20, ge=1, le=100)) -> UserListResponse:
    return service.list_users(db, page=page, page_size=page_size)


@router.get("/{user_id}", response_model=UserRead)
def get_user(user_id: int, db: DbSession) -> UserRead:
    try:
        return service.get_user(db, user_id)
    except UserNotFoundError as error:
        raise user_not_found() from error


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, db: DbSession) -> UserRead:
    try:
        return service.create_user(db, data)
    except UsernameExistsError as error:
        raise username_exists() from error


@router.put("/{user_id}", response_model=UserRead)
def update_user(user_id: int, data: UserUpdate, db: DbSession) -> UserRead:
    try:
        return service.update_user(db, user_id, data)
    except UserNotFoundError as error:
        raise user_not_found() from error
    except UsernameExistsError as error:
        raise username_exists() from error


@router.put("/{user_id}/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(user_id: int, data: UserPasswordUpdate, db: DbSession) -> Response:
    try:
        service.change_password(db, user_id, data.new_password.get_secret_value())
    except UserNotFoundError as error:
        raise user_not_found() from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: DbSession) -> Response:
    try:
        service.delete_user(db, user_id)
    except UserNotFoundError as error:
        raise user_not_found() from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)
