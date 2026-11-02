from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import current_user
from app.core.utils import utcnow
from app.db.mongo import get_db
from app.models.schemas import TaskUpdateIn
from app.services.roadmap import refresh_learning_plan

router = APIRouter(prefix="/api/learning-plan", tags=["learning plan"])


@router.get("")
def get_learning_plan(user: dict = Depends(current_user)):
    return refresh_learning_plan(get_db(), str(user["_id"]))


@router.patch("/tasks/{task_id}")
def update_task(task_id: str, body: TaskUpdateIn, user: dict = Depends(current_user)):
    uid = str(user["_id"])
    db = get_db()
    result = db.learning_plans.update_one(
        {"user_id": uid, "tasks.id": task_id},
        {"$set": {"tasks.$.completed": body.completed, "tasks.$.updated_at": utcnow(), "updated_at": utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Learning task not found")
    return {"id": task_id, "completed": body.completed}
