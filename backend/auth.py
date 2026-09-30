from __future__ import annotations

import hashlib
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from database import get_db
from models import User

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_SALT = "zoom_clone_secret_salt_2026"


def hash_password(password: str) -> str:
    """Hash a password securely using PBKDF2-HMAC-SHA256."""
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), SECRET_SALT.encode("utf-8"), 100000
    ).hex()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password


class SignUpRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6, max_length=100)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str
    email: str
    token: str


@router.post("/signup", response_model=UserResponse, status_code=201)
def signup(payload: SignUpRequest, db: Session = Depends(get_db)) -> UserResponse:
    normalized_email = payload.email.strip().lower()
    existing_user = db.scalar(
        select(User).where(func.lower(User.email) == normalized_email)
    )
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    user = User(
        display_name=payload.name.strip(),
        email=normalized_email,
        password_hash=hash_password(payload.password),
        created_at=datetime.now(UTC).replace(tzinfo=None),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = f"token_{user.id}_{user.email}"
    return UserResponse(
        id=user.id,
        display_name=user.display_name,
        email=user.email,
        token=token,
    )


@router.post("/login", response_model=UserResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> UserResponse:
    normalized_email = payload.email.strip().lower()
    user = db.scalar(
        select(User).where(func.lower(User.email) == normalized_email)
    )
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
        )

    token = f"token_{user.id}_{user.email}"
    return UserResponse(
        id=user.id,
        display_name=user.display_name,
        email=user.email,
        token=token,
    )


@router.get("/me", response_model=UserResponse)
def get_me(user_id: int = Query(...), db: Session = Depends(get_db)) -> UserResponse:
    user = db.scalar(select(User).where(User.id == user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
        )

    token = f"token_{user.id}_{user.email}"
    return UserResponse(
        id=user.id,
        display_name=user.display_name,
        email=user.email,
        token=token,
    )
