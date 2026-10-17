import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app import models

JWT_SECRET = os.getenv("JWT_SECRET")
if JWT_SECRET is None or len(JWT_SECRET) < 32:
    raise RuntimeError("Set JWT_SECRET to a random secret with at least 32 characters")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_TTL = timedelta(minutes=30)
password_hasher = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)


def unauthorized_token() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired access token",
        headers={"WWW-Authenticate": "Bearer"},
    )


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_hasher.verify(password, password_hash)


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": str(user_id), "jti": secrets.token_urlsafe(32), "iat": now, "exp": now + ACCESS_TOKEN_TTL, "type": "access"},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def decode_access_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    if credentials is None:
        raise unauthorized_token()
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        int(payload["sub"])
        if payload.get("type") != "access" or not payload.get("jti"):
            raise InvalidTokenError("Invalid token claims")
    except (InvalidTokenError, KeyError, TypeError, ValueError):
        raise unauthorized_token() from None
    return payload


def get_current_user(
    payload: dict = Depends(decode_access_token),
    db: Session = Depends(get_db),
) -> models.User:
    user_id = int(payload["sub"])
    user = db.get(models.User, user_id)
    if user is None or not user.active or not user.email_verified:
        raise unauthorized_token()
    if db.get(models.TokenRevocation, payload["jti"]) is not None:
        raise unauthorized_token()
    return user


def get_business_membership(
    x_business_id: int | None,
    current_user: models.User,
    db: Session,
) -> models.BusinessMembership:
    if x_business_id is None:
        raise HTTPException(status_code=400, detail="X-Business-Id header is required")
    membership = db.scalar(
        select(models.BusinessMembership)
        .options(joinedload(models.BusinessMembership.business))
        .where(
            models.BusinessMembership.business_id == x_business_id,
            models.BusinessMembership.user_id == current_user.id,
        )
    )
    if membership is None:
        raise HTTPException(status_code=403, detail="You are not a member of this business")
    return membership

