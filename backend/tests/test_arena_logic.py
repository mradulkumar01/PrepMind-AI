from datetime import datetime, timedelta, timezone

import pytest
from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.api import arena
from app.models.schemas import ArenaProblemIn
from app.services.judge0 import normalize_verdict


class FakeScores:
    """Small atomic-update fake for the score document's idempotency contract."""

    def __init__(self):
        self.rows = {}

    def find_one_and_update(self, query, update, return_document=None):
        identity = (query["contest_id"], query["participant_id"])
        row = self.rows.get(identity)
        if row is None or query["solved_problems"]["$ne"] in row["solved_problems"]:
            return None
        for key, value in update["$inc"].items():
            row[key] = row.get(key, 0) + value
        row["solved_problems"].add(update["$addToSet"]["solved_problems"])
        row.update(update["$set"])
        return row

    def insert_one(self, row):
        identity = (row["contest_id"], row["participant_id"])
        if identity in self.rows:
            raise DuplicateKeyError("duplicate score row")
        row = dict(row)
        row["solved_problems"] = set(row["solved_problems"])
        self.rows[identity] = row


class FakeSolved:
    def __init__(self):
        self.rows = set()

    def insert_one(self, row):
        key = (row["contest_id"], row["participant_id"], row["problem_slug"])
        if key in self.rows:
            raise DuplicateKeyError("duplicate solved problem")
        self.rows.add(key)


class FakeDB:
    def __init__(self):
        self.contest_scores = FakeScores()
        self.contest_solved = FakeSolved()


def test_contest_state_uses_aware_server_time():
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    contest = {"start_at": start, "end_at": start + timedelta(hours=1)}
    assert arena._contest_state(contest, start - timedelta(seconds=1)) == "upcoming"
    assert arena._contest_state(contest, start) == "live"
    assert arena._contest_state(contest, start + timedelta(hours=1)) == "completed"


@pytest.mark.parametrize(
    ("status_id", "description", "expected"),
    [
        (3, "Accepted", "Accepted"),
        (4, "Wrong Answer", "Wrong Answer"),
        (5, "Time Limit Exceeded", "Time Limit Exceeded"),
        (6, "Compilation Error", "Compilation Error"),
        (7, "Runtime Error", "Runtime Error"),
        (7, "Memory Limit Exceeded", "Memory Limit Exceeded"),
        (13, "Internal Error", "Internal Error"),
    ],
)
def test_judge0_verdict_mapping(status_id, description, expected):
    assert normalize_verdict(status_id, description) == expected


def test_contest_scoring_is_atomic_and_idempotent_per_problem():
    db = FakeDB()
    contest = {"_id": ObjectId()}
    participant = "team-1"
    now = datetime.now(timezone.utc)

    assert arena._award_contest_points(db, contest, participant, "pair-sum", 100, ObjectId(), now)
    assert not arena._award_contest_points(db, contest, participant, "pair-sum", 100, ObjectId(), now)
    assert arena._award_contest_points(db, contest, participant, "binary-search", 200, ObjectId(), now)

    row = next(iter(db.contest_scores.rows.values()))
    assert row["score"] == 300
    assert row["solved_count"] == 2
    assert row["solved_problems"] == {"pair-sum", "binary-search"}


def test_arena_admin_requires_explicit_allowlist(monkeypatch):
    monkeypatch.setattr(arena, "get_settings", lambda: type("Settings", (), {"arena_admin_emails": "Admin@example.com"})())
    arena._require_admin({"email": "admin@example.com"})
    with pytest.raises(arena.HTTPException) as error:
        arena._require_admin({"email": "user@example.com"})
    assert error.value.status_code == 403


def test_problem_admin_request_caps_test_suite_size():
    base = {
        "slug": "too-many-cases", "title": "Problem with many cases", "difficulty": "Easy", "topics": ["Arrays"],
        "statement": "A sufficiently long statement for validation.", "examples": [{"input": "", "output": ""}],
        "constraints": ["n is bounded"], "test_cases": [{"input": "", "output": ""}] * 21,
    }
    with pytest.raises(ValueError):
        ArenaProblemIn(**base)
