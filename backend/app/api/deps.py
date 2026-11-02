from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings
from app.core.security import decode_token
from app.core.utils import to_oid
from app.db.mongo import get_db

_bearer = HTTPBearer(auto_error=False)


def current_user(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> dict:
    unauthorized = HTTPException(status_code=401, detail="Not authenticated", headers={"WWW-Authenticate": "Bearer"})
    if creds is None:
        raise unauthorized
    uid = decode_token(creds.credentials)
    if not uid:
        raise unauthorized
    user = get_db().users.find_one({"_id": to_oid(uid)})
    if not user:
        raise unauthorized
    if user.get("is_active", True) is False:
        raise HTTPException(status_code=403, detail="This account is disabled. Contact the PrepMind administrator.")
    return user


def is_admin_email(email: str) -> bool:
    allowed = {value.strip().lower() for value in get_settings().arena_admin_emails.split(",") if value.strip()}
    return email.strip().lower() in allowed


def require_admin(user: dict = Depends(current_user)) -> dict:
    if not is_admin_email(user.get("email", "")):
        raise HTTPException(status_code=403, detail="Admin access is not enabled for this account")
    return user
