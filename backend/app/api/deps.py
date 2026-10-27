from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

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
    return user
