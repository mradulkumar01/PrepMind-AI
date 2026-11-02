from fastapi import APIRouter, Depends

from app.api.deps import current_user
from app.services.company_tracks import public_tracks

router = APIRouter(prefix="/api/company-tracks", tags=["company preparation"])


@router.get("")
def list_company_tracks(_: dict = Depends(current_user)):
    return public_tracks()
