from getpass import getpass

from pydantic import ValidationError

from app.common.role_codes import ADMIN_ROLE_CODE
from app.db.session import SessionLocal, get_engine
from app.schemas.user import UserCreate
from app.services.user_service import UserService, UsernameExistsError


def main() -> int:
    try:
        username = input("نام کاربری: ")
        full_name = input("نام کامل: ")
        password = getpass("رمز عبور: ")
        confirmation = getpass("تکرار رمز عبور: ")
        if password != confirmation:
            print("رمزهای عبور یکسان نیستند.")
            return 1
        data = UserCreate(username=username, full_name=full_name, password=password, role_code=ADMIN_ROLE_CODE)
        with SessionLocal(bind=get_engine()) as db:
            user = UserService().create_user(db, data)
        print(f"کاربر مدیر «{user.username}» ایجاد شد.")
        return 0
    except ValidationError:
        print("نام کاربری و نام کامل الزامی است؛ رمز عبور باید حداقل ۸ حرف داشته باشد.")
        return 1
    except UsernameExistsError:
        print("نام کاربری قبلاً ثبت شده است.")
        return 1
    except (EOFError, KeyboardInterrupt):
        print("\nعملیات لغو شد.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
