from app.services.roadmap import build_tasks


def test_roadmap_uses_saved_skill_gaps_and_weak_topics():
    resumes = [{"_id": "resume-1", "skill_gap": ["Docker"]}]
    interviews = [{
        "_id": "interview-1", "status": "completed", "created_at": "2026-10-01",
        "summary": {"weaknesses": ["System design"], "criteria_avg": {"communication": 62}},
    }]

    tasks = build_tasks(resumes, interviews)

    assert {task["topic"] for task in tasks} == {"Docker", "System design", "communication"}
    assert all(task["actions"] and task["reason"] for task in tasks)
    assert len({task["id"] for task in tasks}) == len(tasks)


def test_roadmap_is_empty_without_evidence():
    assert build_tasks([], []) == []
