import datetime as dt

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException


def utcnow() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def to_oid(value: str) -> ObjectId:
    """Convert a path/body id to ObjectId; a malformed id is simply 'not found'."""
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=404, detail="Not found")


def ser(doc: dict, drop: tuple[str, ...] = ()) -> dict:
    out = {k: v for k, v in doc.items() if k != "_id" and k not in drop}
    out["id"] = str(doc["_id"])
    return out
