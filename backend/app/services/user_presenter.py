from app.models.user import User
from app.schemas.user import CurrentUserRead, UserRead
from app.services.profile_image_storage import profile_image_url


def to_current_user_read(user: User) -> CurrentUserRead:
    return CurrentUserRead.model_validate(user).model_copy(
        update={"profile_image_url": profile_image_url(user.profile_image_key)}
    )


def to_user_read(user: User) -> UserRead:
    return UserRead.model_validate(user).model_copy(
        update={"profile_image_url": profile_image_url(user.profile_image_key)}
    )
