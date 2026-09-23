from fastapi import APIRouter


router = APIRouter(tags=["وضعیت سیستم"])


@router.get("/health")
def health_check() -> dict[str, str]:
    """Return a dependency-free application liveness response."""

    return {"status": "ok"}
