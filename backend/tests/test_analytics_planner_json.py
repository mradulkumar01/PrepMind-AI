import pytest

from app.services.analytics import summarize
from app.services.json_utils import extract_json
from app.services.planner import plan_topic


def test_summary_strengths_and_weaknesses():
    rows = [
        {"topic": "Python", "scores": {"technical": 90}, "overall": 90},
        {"topic": "Python", "scores": {"technical": 70}, "overall": 70},
        {"topic": "Docker", "scores": {"technical": 30}, "overall": 30},
    ]
    s = summarize(rows)
    assert s["by_topic"] == {"Python": 80.0, "Docker": 30.0}
    assert s["strengths"] == ["Python"] and s["weaknesses"] == ["Docker"]
    assert s["overall"] == 63.3 and s["answered"] == 3


def test_summary_empty():
    assert summarize([])["answered"] == 0


def test_plan_technical_cycles_through_skills():
    skills = ["Python", "React"]
    assert [plan_topic("technical", i, skills)[1] for i in range(3)] == ["Python", "React", "Python"]


def test_plan_mixed_rotates_kinds():
    assert [plan_topic("mixed", i, ["Python"])[0] for i in range(4)] == ["technical", "project", "hr", "technical"]


def test_plan_without_skills_has_fallback():
    assert plan_topic("technical", 0, [])[1] == "general software engineering"


def test_extract_json_from_fenced_prose():
    assert extract_json('Sure!\n```json\n{"a": 1, "b": "x}y"}\n```\nDone') == {"a": 1, "b": "x}y"}


def test_extract_json_failures():
    with pytest.raises(ValueError):
        extract_json("no json here")
    with pytest.raises(ValueError):
        extract_json('{"a": 1')
