"""Password hashing (bcrypt) and JWT helpers."""
import datetime as dt

import bcrypt
import jwt

from app.core.config import get_settings


def hash_password(password: str) -> str:
    raw = password.encode("utf-8")
    if len(raw) > 72:  # bcrypt's hard limit
        raise ValueError("Password too long (max 72 bytes)")
    return bcrypt.hashpw(raw, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: str) -> str:
    s = get_settings()
    now = dt.datetime.now(dt.timezone.utc)
    payload = {"sub": user_id, "iat": now, "exp": now + dt.timedelta(minutes=s.jwt_expire_minutes)}
    return jwt.encode(payload, s.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> str | None:
    try:
        return jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"]).get("sub")
    except jwt.PyJWTError:
        return None
