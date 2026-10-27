from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import current_user
from app.core.utils import to_oid, utcnow
from app.db.mongo import get_db
from app.models.schemas import TaskUpdateIn
from app.services.roadmap import build_tasks

router = APIRouter(prefix="/api/learning-plan", tags=["learning plan"])


@router.get("")
def get_learning_plan(user: dict = Depends(current_user)):
    db = get_db()
    uid = str(user["_id"])
    resumes = list(db.resumes.find({"user_id": uid}).sort("created_at", -1).limit(20))
    interviews = list(db.interviews.find({"user_id": uid}).sort("created_at", -1).limit(100))
    existing = db.learning_plans.find_one({"user_id": uid}) or {}
    prior = {task["id"]: task for task in existing.get("tasks", [])}
    tasks = build_tasks(resumes, interviews)
    for task in tasks:
        saved = prior.get(task["id"])
        if saved:
            task["completed"] = bool(saved.get("completed"))
            task["updated_at"] = saved.get("updated_at")
    plan = {"user_id": uid, "tasks": tasks, "updated_at": utcnow()}
    db.learning_plans.replace_one({"user_id": uid}, plan, upsert=True)
    plan.pop("_id", None)
    return plan


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
