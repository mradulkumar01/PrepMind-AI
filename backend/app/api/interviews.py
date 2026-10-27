from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import current_user
from app.core.utils import ser, to_oid, utcnow
from app.db.mongo import get_db
from app.db.rag_store import rag_store
from app.models.schemas import AnswerIn, FinishInterviewIn, StartInterviewIn
from app.services.adaptive import next_difficulty
from app.services.analytics import summarize
from app.services.evaluator import evaluate_answer
from app.services.llm import get_llm
from app.services.planner import plan_topic
from app.services.question_generator import generate_followup, generate_question
from app.services.scoring import overall_score

router = APIRouter(prefix="/api/interviews", tags=["interviews"])
FOLLOWUP_BELOW = 55  # technical score under this triggers one follow-up


def _owned_interview(interview_id: str, user: dict) -> dict:
    doc = get_db().interviews.find_one({"_id": to_oid(interview_id), "user_id": str(user["_id"])})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return doc


def _public_question(q: dict, reveal: bool) -> dict:
    # expected_points are hidden until the question is answered
    return ser(q, drop=() if reveal else ("expected_points",))


def _new_question(interview: dict, resume: dict, difficulty: str) -> dict:
    db, llm = get_db(), get_llm()
    iid = str(interview["_id"])
    prior = list(db.questions.find({"interview_id": iid}).sort("index", 1))
    main_count = sum(1 for q in prior if not q["is_followup"])
    kind, topic = plan_topic(interview["interview_type"], main_count, resume["skills"])
    if interview.get("topics"):
        topic = interview["topics"][main_count % len(interview["topics"])]
    uid = interview["user_id"]
    rid = interview["resume_id"]
    retrieval_query = f"{interview.get('target_role', '')} {topic}".strip()
    excerpts = rag_store.query(user_id=uid, resume_id=rid, query=retrieval_query, k=4, kind="resume")
    jd_excerpts = rag_store.query(user_id=uid, resume_id=rid, query=retrieval_query, k=2, kind="jd") if resume["has_jd"] else []
    gen = generate_question(
        llm, kind=kind, topic=topic, target_role=interview.get("target_role", ""), difficulty=difficulty, excerpts=excerpts,
        jd_excerpts=jd_excerpts, previous_questions=[q["text"] for q in prior],
    )
    doc = {
        "interview_id": iid, "index": len(prior), "kind": kind, "difficulty": difficulty,
        "is_followup": False, "created_at": utcnow(), **gen,
    }
    doc["_id"] = db.questions.insert_one(doc).inserted_id
    return doc


@router.post("", status_code=201)
def start_interview(body: StartInterviewIn, user: dict = Depends(current_user)):
    db = get_db()
    resume = db.resumes.find_one({"_id": to_oid(body.resume_id), "user_id": str(user["_id"])})
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    interview = {
        "user_id": str(user["_id"]), "resume_id": body.resume_id, "interview_type": body.interview_type,
        "target_role": body.target_role, "topics": body.topics,
        "num_questions": body.num_questions, "status": "in_progress", "current_difficulty": body.difficulty,
        "summary": None, "created_at": utcnow(), "completed_at": None,
    }
    interview["_id"] = db.interviews.insert_one(interview).inserted_id
    try:
        q = _new_question(interview, resume, body.difficulty)
    except Exception:
        db.interviews.delete_one({"_id": interview["_id"]})  # don't leave an empty session behind
        raise
    return {"interview": ser(interview), "question": _public_question(q, reveal=False)}


@router.get("")
def list_interviews(user: dict = Depends(current_user)):
    docs = get_db().interviews.find({"user_id": str(user["_id"])}).sort("created_at", -1).limit(100)
    return [ser(d) for d in docs]


@router.delete("/{interview_id}")
def delete_interview(interview_id: str, user: dict = Depends(current_user)):
    """Delete one owned interview and its saved questions and answers."""
    db = get_db()
    interview = _owned_interview(interview_id, user)
    iid = str(interview["_id"])
    # Delete dependent records first so a retry can finish cleanup if MongoDB fails partway.
    db.answers.delete_many({"interview_id": iid})
    db.questions.delete_many({"interview_id": iid})
    db.interviews.delete_one({"_id": interview["_id"], "user_id": str(user["_id"])})
    return {"deleted": True, "interview_id": iid}


@router.get("/{interview_id}")
def get_interview(interview_id: str, user: dict = Depends(current_user)):
    interview = _owned_interview(interview_id, user)
    db = get_db()
    iid = str(interview["_id"])
    answers = {a["question_id"]: a for a in db.answers.find({"interview_id": iid})}
    questions = list(db.questions.find({"interview_id": iid}).sort("index", 1))

    # Recover if the answer was saved but provider/network failure interrupted
    # next-question generation or final summary persistence.
    if interview["status"] == "in_progress" and questions and all(str(q["_id"]) in answers for q in questions):
        if len(answers) >= interview["num_questions"]:
            by_id = {str(q["_id"]): q for q in questions}
            rows = [{"topic": by_id[a["question_id"]]["topic"], "scores": a["scores"], "overall": a["overall"]} for a in answers.values()]
            summary = summarize(rows)
            db.interviews.update_one(
                {"_id": interview["_id"], "user_id": str(user["_id"]), "status": "in_progress"},
                {"$set": {"status": "completed", "summary": summary, "completed_at": utcnow()}},
            )
            interview = _owned_interview(interview_id, user)
        else:
            last_question = questions[-1]
            last_answer = answers[str(last_question["_id"])]
            if last_answer["scores"].get("technical", 100) < FOLLOWUP_BELOW and not last_question["is_followup"]:
                gen = generate_followup(get_llm(), question=last_question, answer_text=last_answer["text"], topic=last_question["topic"])
                next_question = {
                    "interview_id": iid, "index": len(questions), "kind": last_question["kind"],
                    "difficulty": last_question["difficulty"], "is_followup": True, "created_at": utcnow(), **gen,
                }
                try:
                    next_question["_id"] = db.questions.insert_one(next_question).inserted_id
                except Exception:
                    # Another request may have recovered the same next question.
                    next_question = db.questions.find_one({"interview_id": iid, "index": len(questions)})
                    if not next_question:
                        raise
            else:
                resume = db.resumes.find_one({"_id": to_oid(interview["resume_id"]), "user_id": str(user["_id"])})
                if not resume:
                    raise HTTPException(status_code=404, detail="Resume not found")
                _new_question(interview, resume, interview["current_difficulty"])
            questions = list(db.questions.find({"interview_id": iid}).sort("index", 1))

    items = []
    for q in questions:
        a = answers.get(str(q["_id"]))
        items.append({**_public_question(q, reveal=a is not None), "answer": ser(a) if a else None})
    return {"interview": ser(interview), "questions": items}


@router.post("/{interview_id}/answer")
def submit_answer(interview_id: str, body: AnswerIn, user: dict = Depends(current_user)):
    db, llm = get_db(), get_llm()
    interview = _owned_interview(interview_id, user)
    if interview["status"] != "in_progress":
        raise HTTPException(status_code=409, detail="Interview already completed")
    iid = str(interview["_id"])
    q = db.questions.find_one({"_id": to_oid(body.question_id), "interview_id": iid})
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    if db.answers.find_one({"question_id": body.question_id}):
        raise HTTPException(status_code=409, detail="Question already answered")

    ev = evaluate_answer(llm, question_text=q["text"], expected_points=q["expected_points"], answer_text=body.answer_text)
    overall = overall_score(ev["scores"])
    ans = {
        "interview_id": iid, "question_id": body.question_id, "text": body.answer_text,
        "answer_mode": body.answer_mode,
        "scores": ev["scores"], "overall": overall, "feedback": ev["feedback"],
        "strengths": ev["strengths"], "improvements": ev["improvements"], "sample_answer": ev["sample_answer"],
        "evaluator": ev["evaluator"], "created_at": utcnow(),
    }
    db.answers.insert_one(ans)

    answers = list(db.answers.find({"interview_id": iid}).sort("created_at", 1))
    new_diff = next_difficulty(interview["current_difficulty"], [a["overall"] for a in answers])
    result = {
        "evaluation": {**{k: ans[k] for k in ("scores", "overall", "feedback", "strengths", "improvements", "sample_answer", "evaluator")},
                       "expected_points": q["expected_points"]},
        "difficulty_next": new_diff,
        "completed": False, "summary": None, "next_question": None,
    }

    if len(answers) >= interview["num_questions"]:
        questions = {str(x["_id"]): x for x in db.questions.find({"interview_id": iid})}
        rows = [{"topic": questions[a["question_id"]]["topic"], "scores": a["scores"], "overall": a["overall"]} for a in answers]
        summary = summarize(rows)
        db.interviews.update_one(
            {"_id": interview["_id"]},
            {"$set": {"status": "completed", "summary": summary, "completed_at": utcnow(), "current_difficulty": new_diff}},
        )
        result.update(completed=True, summary=summary)
        return result

    db.interviews.update_one({"_id": interview["_id"]}, {"$set": {"current_difficulty": new_diff}})
    if ev["scores"]["technical"] < FOLLOWUP_BELOW and not q["is_followup"]:
        gen = generate_followup(llm, question=q, answer_text=body.answer_text, topic=q["topic"])
        nq = {"interview_id": iid, "index": q["index"] + 1, "kind": q["kind"], "difficulty": q["difficulty"],
              "is_followup": True, "created_at": utcnow(), **gen}
        nq["_id"] = db.questions.insert_one(nq).inserted_id
    else:
        resume = db.resumes.find_one({"_id": to_oid(interview["resume_id"])})
        nq = _new_question(interview, resume, new_diff)
    result["next_question"] = _public_question(nq, reveal=False)
    return result


@router.post("/{interview_id}/finish")
def finish_interview(interview_id: str, body: FinishInterviewIn | None = None, user: dict = Depends(current_user)):
    """Finish early and score the current unsent draft, if one was provided."""
    db, llm = get_db(), get_llm()
    interview = _owned_interview(interview_id, user)
    if interview["status"] != "in_progress":
        raise HTTPException(status_code=409, detail="Interview is no longer in progress")

    iid = str(interview["_id"])
    if body and body.answer:
        draft = body.answer
        question = db.questions.find_one({"_id": to_oid(draft.question_id), "interview_id": iid})
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        if not db.answers.find_one({"question_id": draft.question_id}):
            ev = evaluate_answer(llm, question_text=question["text"], expected_points=question["expected_points"], answer_text=draft.answer_text)
            ans = {
                "interview_id": iid, "question_id": draft.question_id, "text": draft.answer_text,
                "answer_mode": draft.answer_mode, "scores": ev["scores"], "overall": overall_score(ev["scores"]),
                "feedback": ev["feedback"], "strengths": ev["strengths"], "improvements": ev["improvements"],
                "sample_answer": ev["sample_answer"], "evaluator": ev["evaluator"], "created_at": utcnow(),
            }
            db.answers.insert_one(ans)

    questions = {str(q["_id"]): q for q in db.questions.find({"interview_id": iid})}
    answers = list(db.answers.find({"interview_id": iid}).sort("created_at", 1))
    rows = [
        {"topic": questions[a["question_id"]]["topic"], "scores": a["scores"], "overall": a["overall"]}
        for a in answers if a["question_id"] in questions
    ]
    summary = summarize(rows)
    update = db.interviews.update_one(
        {"_id": interview["_id"], "user_id": str(user["_id"]), "status": "in_progress"},
        {"$set": {
            "status": "completed", "summary": summary, "completed_at": utcnow(),
            "completed_early": len(rows) < interview["num_questions"],
        }},
    )
    if not update.modified_count:
        raise HTTPException(status_code=409, detail="Interview is no longer in progress")
    return {"interview": ser(_owned_interview(interview_id, user)), "summary": summary}


@router.post("/{interview_id}/cancel")
def cancel_interview(interview_id: str, user: dict = Depends(current_user)):
    """Abandon an in-progress interview while preserving its history."""
    db = get_db()
    interview = _owned_interview(interview_id, user)
    if interview["status"] != "in_progress":
        raise HTTPException(status_code=409, detail="Interview is no longer in progress")
    update = db.interviews.update_one(
        {"_id": interview["_id"], "user_id": str(user["_id"]), "status": "in_progress"},
        {"$set": {"status": "cancelled", "cancelled_at": utcnow(), "completed_at": utcnow()}},
    )
    if not update.modified_count:
        raise HTTPException(status_code=409, detail="Interview is no longer in progress")
    return {"interview": ser(_owned_interview(interview_id, user)), "cancelled": True}
