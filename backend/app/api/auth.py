from fastapi import APIRouter, Depends, HTTPException
from pymongo.errors import DuplicateKeyError

from app.api.deps import current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.core.utils import utcnow
from app.db.mongo import get_db
from app.models.schemas import LoginIn, RegisterIn, TokenOut, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_out(u: dict) -> UserOut:
    return UserOut(id=str(u["_id"]), name=u["name"], email=u["email"])


@router.post("/register", response_model=TokenOut, status_code=201)
def register(body: RegisterIn):
    doc = {
        "name": body.name.strip(),
        "email": body.email.lower(),
        "password_hash": hash_password(body.password),
        "created_at": utcnow(),
    }
    try:
        res = get_db().users.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="Email already registered")
    doc["_id"] = res.inserted_id
    return TokenOut(access_token=create_access_token(str(res.inserted_id)), user=_user_out(doc))


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn):
    user = get_db().users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")  # same message for both cases
    return TokenOut(access_token=create_access_token(str(user["_id"])), user=_user_out(user))


@router.get("/me", response_model=UserOut)
def me(user: dict = Depends(current_user)):
    return _user_out(user)
