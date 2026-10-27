"""MongoDB connection (PyMongo) and indexes."""
import logging

from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.errors import PyMongoError

from app.core.config import get_settings

log = logging.getLogger("prepmind.db")
_client: MongoClient | None = None


def get_db():
    global _client
    s = get_settings()
    if _client is None:
        _client = MongoClient(s.mongo_uri, serverSelectionTimeoutMS=3000, tz_aware=True)
    return _client[s.mongo_db]


def ensure_indexes() -> None:
    db = get_db()
    try:
        db.users.create_index("email", unique=True)
        db.resumes.create_index("user_id")
        db.interviews.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
        db.questions.create_index("interview_id")
        db.questions.create_index([("interview_id", ASCENDING), ("index", ASCENDING)], unique=True)
        db.answers.create_index("interview_id")
        db.answers.create_index("question_id", unique=True)  # one answer per question
        db.problems.create_index("slug", unique=True)
        db.problems.create_index([("published", ASCENDING), ("difficulty", ASCENDING), ("title", ASCENDING)])
        db.submissions.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
        db.submissions.create_index([("problem_slug", ASCENDING), ("status", ASCENDING)])
        db.bookmarks.create_index([("user_id", ASCENDING), ("problem_slug", ASCENDING)], unique=True)
        db.contests.create_index("slug", unique=True)
        db.contest_registrations.create_index([("contest_id", ASCENDING), ("participant_id", ASCENDING)], unique=True)
        db.contest_registrations.create_index([("contest_id", ASCENDING), ("user_id", ASCENDING)])
        db.teams.create_index("invite_code", unique=True)
        db.teams.create_index([("contest_id", ASCENDING), ("member_ids", ASCENDING)])
        db.contest_solved.create_index([("contest_id", ASCENDING), ("participant_id", ASCENDING), ("problem_slug", ASCENDING)], unique=True)
        db.contest_scores.create_index([("contest_id", ASCENDING), ("participant_id", ASCENDING)], unique=True)
        db.contest_scores.create_index([("contest_id", ASCENDING), ("score", DESCENDING), ("last_accepted_at", ASCENDING)])
        db.arena_rate_events.create_index("created_at", expireAfterSeconds=300)
        db.prep_spaces.create_index("user_id", unique=True)
    except PyMongoError as exc:
        log.error("MongoDB not reachable: %s. Start it with `docker compose up -d`.", exc)
