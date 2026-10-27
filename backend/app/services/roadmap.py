"""Build a small, explainable practice roadmap from persisted user data."""
import hashlib


def _task_id(kind: str, topic: str) -> str:
    return hashlib.sha256(f"{kind}:{topic.casefold()}".encode()).hexdigest()[:20]


def build_tasks(resumes: list[dict], interviews: list[dict]) -> list[dict]:
    candidates: dict[tuple[str, str], dict] = {}
    for resume in resumes:
        for skill in resume.get("skill_gap", []):
            key = ("skill_gap", skill)
            candidates.setdefault(key, {
                "id": _task_id(*key), "kind": key[0], "title": f"Build evidence for {skill}",
                "topic": skill, "priority": "high",
                "reason": "This skill appears in a job description but was not detected in the uploaded resume.",
                "actions": [f"Review core {skill} concepts", f"Build or document a small {skill} example", f"Practise explaining your example in an interview"],
                "source_resume_id": str(resume["_id"]), "completed": False,
            })

    recent = [item for item in interviews if item.get("status") == "completed" and item.get("summary")]
    recent.sort(key=lambda item: item.get("completed_at") or item.get("created_at"), reverse=True)
    for interview in recent[:5]:
        summary = interview["summary"]
        for topic in summary.get("weaknesses", []):
            key = ("topic", topic)
            candidates.setdefault(key, {
                "id": _task_id(*key), "kind": key[0], "title": f"Strengthen {topic}", "topic": topic,
                "priority": "high", "reason": "This topic was a lower-scoring area in a completed practice interview.",
                "actions": [f"Review the key ideas behind {topic}", "Write a concise explanation from memory", "Practise one example question and explain your reasoning"],
                "source_interview_id": str(interview["_id"]), "completed": False,
            })
        for criterion, score in summary.get("criteria_avg", {}).items():
            if score < 70:
                key = ("criterion", criterion)
                candidates.setdefault(key, {
                    "id": _task_id(*key), "kind": key[0], "title": f"Practise {criterion.replace('_', ' ')}",
                    "topic": criterion, "priority": "medium",
                    "reason": f"Your saved interview average for this criterion was {score:g}/100.",
                    "actions": [f"Review feedback about {criterion.replace('_', ' ')}", "Practise a timed answer", "Compare your next saved result with this one"],
                    "source_interview_id": str(interview["_id"]), "completed": False,
                })

    tasks = list(candidates.values())
    tasks.sort(key=lambda item: (item["priority"] != "high", item["title"].casefold()))
    return tasks[:12]
