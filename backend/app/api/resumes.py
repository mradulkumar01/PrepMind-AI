import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.api.deps import current_user
from app.core.config import get_settings
from app.core.utils import ser, to_oid, utcnow
from app.db.mongo import get_db
from app.db.rag_store import rag_store
from app.services.chunker import chunk_text
from app.services.resume_parser import ResumeParseError, extract_text
from app.services.skills import extract_skills

router = APIRouter(prefix="/api/resumes", tags=["resumes"])
MAX_JD_CHARS = 8000


@router.post("", status_code=201)
def upload_resume(
    file: UploadFile = File(...),
    job_description: str = Form(default=""),
    user: dict = Depends(current_user),
):
    s = get_settings()
    max_bytes = s.max_upload_mb * 1024 * 1024
    data = file.file.read(max_bytes + 1)  # never read more than the limit + 1 byte
    filename = os.path.basename(file.filename or "resume")[:120]
    try:
        text = extract_text(filename, data, max_bytes)
    except ResumeParseError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    jd = job_description.strip()[:MAX_JD_CHARS]
    res_skills = extract_skills(text)
    jd_skills = extract_skills(jd)["skills"] if jd else []
    chunks = chunk_text(text)
    jd_chunks = chunk_text(jd) if jd else []

    uid = str(user["_id"])
    doc = {
        "user_id": uid,
        "filename": filename,
        "skills": res_skills["skills"],
        "skills_by_category": res_skills["by_category"],
        "jd_skills": jd_skills,
        "skill_gap": sorted(set(jd_skills) - set(res_skills["skills"])),
        "has_jd": bool(jd),
        "chunk_count": len(chunks),
        "created_at": utcnow(),
    }  # raw resume text is NOT stored in MongoDB; only chunks live in the vector store
    rid = str(get_db().resumes.insert_one(doc).inserted_id)
    try:
        rag_store.add_chunks(user_id=uid, resume_id=rid, kind="resume", chunks=chunks)
        rag_store.add_chunks(user_id=uid, resume_id=rid, kind="jd", chunks=jd_chunks)
    except Exception:
        get_db().resumes.delete_one({"_id": to_oid(rid)})  # keep both stores consistent
        try:
            rag_store.delete_resume(user_id=uid, resume_id=rid)
        except Exception:
            pass
        raise
    doc["_id"] = to_oid(rid)
    return ser(doc)


@router.get("")
def list_resumes(user: dict = Depends(current_user)):
    docs = get_db().resumes.find({"user_id": str(user["_id"])}).sort("created_at", -1)
    return [ser(d) for d in docs]


@router.delete("/{resume_id}", status_code=204)
def delete_resume(resume_id: str, user: dict = Depends(current_user)):
    uid = str(user["_id"])
    res = get_db().resumes.delete_one({"_id": to_oid(resume_id), "user_id": uid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    rag_store.delete_resume(user_id=uid, resume_id=resume_id)
