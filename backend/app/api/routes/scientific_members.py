from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.scientific_member_repository import ScientificMemberFilters
from app.schemas.scientific_member import (
    ScientificMemberCreate,
    ScientificMemberListResponse,
    ScientificMemberRead,
    ScientificMemberSortField,
    ScientificMemberUpdate,
    SortOrder,
)
from app.services.scientific_member_service import (
    InvalidScientificMemberDepartmentError,
    ScientificMemberNotFoundError,
    ScientificMemberService,
)


router = APIRouter(prefix="/scientific-members", tags=["اعضای علمی"])
DbSession = Annotated[Session, Depends(get_db)]
service = ScientificMemberService()


@router.get("", response_model=ScientificMemberListResponse)
def list_members(
    db: DbSession,
    search: str | None = None,
    name: str | None = None,
    surname: str | None = None,
    father_name: str | None = None,
    phone_number: str | None = None,
    academic_rank: str | None = None,
    department_id: int | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort_by: ScientificMemberSortField = "id",
    sort_order: SortOrder = "asc",
) -> ScientificMemberListResponse:
    filters = ScientificMemberFilters(
        search=search,
        name=name,
        surname=surname,
        father_name=father_name,
        phone_number=phone_number,
        academic_rank=academic_rank,
        department_id=department_id,
    )
    return service.list_members(
        db,
        filters=filters,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )


@router.get("/{member_id}", response_model=ScientificMemberRead)
def get_member(member_id: int, db: DbSession) -> ScientificMemberRead:
    try:
        return service.get_member(db, member_id)
    except ScientificMemberNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="عضو علمی یافت نشد.") from error


@router.post("", response_model=ScientificMemberRead, status_code=status.HTTP_201_CREATED)
def create_member(data: ScientificMemberCreate, db: DbSession) -> ScientificMemberRead:
    try:
        return service.create_member(db, data)
    except InvalidScientificMemberDepartmentError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="دیپارتمنت انتخاب‌شده معتبر یا فعال نیست.",
        ) from error


@router.put("/{member_id}", response_model=ScientificMemberRead)
def update_member(
    member_id: int,
    data: ScientificMemberUpdate,
    db: DbSession,
) -> ScientificMemberRead:
    try:
        return service.update_member(db, member_id, data)
    except ScientificMemberNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="عضو علمی یافت نشد.") from error
    except InvalidScientificMemberDepartmentError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="دیپارتمنت انتخاب‌شده معتبر یا فعال نیست.",
        ) from error


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(member_id: int, db: DbSession) -> Response:
    try:
        service.delete_member(db, member_id)
    except ScientificMemberNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="عضو علمی یافت نشد.") from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)
