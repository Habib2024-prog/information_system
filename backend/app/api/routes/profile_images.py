from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.auth_dependencies import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.schemas.user import CurrentUserRead, UserRead
from app.services.profile_image_storage import (
    ProfileImageStorageUnavailableError,
    ProfileImageValidationError,
    validate_profile_image,
)
from app.services.user_service import ProfileImagePermissionError, UserNotFoundError, UserService


router = APIRouter(prefix="/users", tags=["تصویر نمایه"])
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[CurrentUserRead, Depends(get_current_user)]
service = UserService()


def user_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="کاربر یافت نشد.")


def profile_permission_denied() -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="اجازهٔ تغییر تصویر این کاربر را ندارید.")


def profile_storage_unavailable() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=ProfileImageStorageUnavailableError.user_message,
    )


@router.put("/{user_id}/profile-image", response_model=UserRead)
async def upload_profile_image(
    user_id: int,
    image: Annotated[UploadFile, File(...)],
    db: DbSession,
    current_user: CurrentUser,
) -> UserRead:
    try:
        content = await image.read(settings.profile_image_max_bytes + 1)
        validated = validate_profile_image(
            content=content,
            content_type=image.content_type,
            filename=image.filename,
        )
        return service.replace_profile_image(db, user_id=user_id, actor=current_user, image=validated)
    except ProfileImageValidationError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    except ProfileImageStorageUnavailableError as error:
        raise profile_storage_unavailable() from error
    except UserNotFoundError as error:
        raise user_not_found() from error
    except ProfileImagePermissionError as error:
        raise profile_permission_denied() from error
    finally:
        await image.close()


@router.delete("/{user_id}/profile-image", response_model=UserRead)
def remove_profile_image(user_id: int, db: DbSession, current_user: CurrentUser) -> UserRead:
    try:
        return service.remove_profile_image(db, user_id=user_id, actor=current_user)
    except UserNotFoundError as error:
        raise user_not_found() from error
    except ProfileImagePermissionError as error:
        raise profile_permission_denied() from error
    except ProfileImageStorageUnavailableError as error:
        raise profile_storage_unavailable() from error
