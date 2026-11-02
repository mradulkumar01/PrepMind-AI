"""Privacy-conscious user administration for allowlisted PrepMind administrators."""
import re

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import require_admin
from app.core.utils import to_oid, utcnow
from app.db.mongo import get_db
from app.models.schemas import AdminUserUpdateIn

router = APIRouter(prefix="/api/admin", tags=["administration"])


@router.get("/users")
def list_users(
    search: str = Query(default="", max_length=120),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    _: dict = Depends(require_admin),
):
    db = get_db()
    query = {}
    if search.strip():
        literal = re.escape(search.strip())
        query["$or"] = [{"name": {"$regex": literal, "$options": "i"}}, {"email": {"$regex": literal, "$options": "i"}}]
    total = db.users.count_documents(query)
    users = list(db.users.find(query, {"name": 1, "email": 1, "created_at": 1, "last_login_at": 1, "is_active": 1})
                 .sort("created_at", -1).skip((page - 1) * limit).limit(limit))
    ids = [str(item["_id"]) for item in users]

    def counts(collection, match_extra=None):
        match = {"user_id": {"$in": ids}} | (match_extra or {})
        return {row["_id"]: row["count"] for row in collection.aggregate([
            {"$match": match}, {"$group": {"_id": "$user_id", "count": {"$sum": 1}}},
        ])}

    resume_counts = counts(db.resumes)
    interview_counts = counts(db.interviews)
    completed_counts = counts(db.interviews, {"status": "completed"})
    return {
        "items": [{
            "id": str(user["_id"]), "name": user.get("name", ""), "email": user.get("email", ""),
            "created_at": user.get("created_at"), "last_login_at": user.get("last_login_at"),
            "is_active": user.get("is_active", True), "resume_count": resume_counts.get(str(user["_id"]), 0),
            "interview_count": interview_counts.get(str(user["_id"]), 0),
            "completed_interview_count": completed_counts.get(str(user["_id"]), 0),
        } for user in users],
        "page": page, "limit": limit, "total": total,
    }


@router.get("/logins")
def list_recent_logins(limit: int = Query(default=100, ge=1, le=250), _: dict = Depends(require_admin)):
    """Return successful sign-in timestamps only; never collect IPs or device fingerprints."""
    db = get_db()
    events = list(db.login_events.find({}, {"user_id": 1, "created_at": 1}).sort("created_at", -1).limit(limit))
    user_ids = list({event["user_id"] for event in events})
    users = {str(user["_id"]): user for user in db.users.find(
        {"_id": {"$in": [to_oid(uid) for uid in user_ids]}}, {"name": 1, "email": 1},
    )}
    return [{"user_id": event["user_id"], "name": users.get(event["user_id"], {}).get("name", "Unknown account"),
             "email": users.get(event["user_id"], {}).get("email", ""), "created_at": event["created_at"]} for event in events]


@router.patch("/users/{user_id}")
def update_user(user_id: str, body: AdminUserUpdateIn, admin: dict = Depends(require_admin)):
    if body.name is None and body.is_active is None:
        raise HTTPException(status_code=422, detail="Provide a display name or account status to update")
    target_id = to_oid(user_id)
    db = get_db()
    target = db.users.find_one({"_id": target_id}, {"name": 1, "email": 1, "is_active": 1})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if str(admin["_id"]) == str(target_id) and body.is_active is False:
        raise HTTPException(status_code=409, detail="You cannot disable your own administrator account")

    changes = {}
    if body.name is not None:
        changes["name"] = body.name
    if body.is_active is not None:
        changes["is_active"] = body.is_active
    db.users.update_one({"_id": target_id}, {"$set": changes})
    db.admin_audit_log.insert_one({
        "admin_user_id": str(admin["_id"]), "target_user_id": str(target_id),
        "action": "user_updated", "changes": changes, "created_at": utcnow(),
    })
    return {"id": str(target_id), "name": changes.get("name", target.get("name", "")),
            "email": target.get("email", ""), "is_active": changes.get("is_active", target.get("is_active", True))}
