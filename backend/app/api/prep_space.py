"""Private, per-user interview preparation notes and checklist."""
from fastapi import APIRouter, Depends

from app.api.deps import current_user
from app.core.utils import utcnow
from app.db.mongo import get_db
from app.models.schemas import PrepSpaceUpdateIn

router = APIRouter(prefix="/api/prep-space", tags=["prep space"])


@router.get("")
def get_prep_space(user: dict = Depends(current_user)):
    doc = get_db().prep_spaces.find_one({"user_id": str(user["_id"])})
    if not doc:
        return {"checklist": [], "notes": [], "updated_at": None}
    return {"checklist": doc.get("checklist", []), "notes": doc.get("notes", []), "updated_at": doc.get("updated_at")}


@router.put("")
def save_prep_space(body: PrepSpaceUpdateIn, user: dict = Depends(current_user)):
    now = utcnow()
    doc = {
        "user_id": str(user["_id"]),
        "checklist": [item.model_dump() for item in body.checklist],
        "notes": [note.model_dump() for note in body.notes],
        "updated_at": now,
    }
    get_db().prep_spaces.update_one({"user_id": doc["user_id"]}, {"$set": doc}, upsert=True)
    return {"checklist": doc["checklist"], "notes": doc["notes"], "updated_at": now}
