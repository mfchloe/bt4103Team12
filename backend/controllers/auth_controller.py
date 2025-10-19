from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.security import decode_token
from dependencies import get_current_user, get_db
from models import User
from schemas import (
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
  SocialLoginRequest,
  TokenResponse,
  UserOut,
)
from services.auth_service import (
  authenticate_user,
  issue_token_pair,
  register_user,
  social_login_apple,
  social_login_google,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
  user = register_user(db, payload)
  access_token, refresh_token = issue_token_pair(user)
  return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
  user = authenticate_user(db, payload)
  access_token, refresh_token = issue_token_pair(user)
  return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=user)


@router.post("/google", response_model=TokenResponse)
def login_google(payload: SocialLoginRequest, db: Session = Depends(get_db)):
  user = social_login_google(db, payload.id_token)
  access_token, refresh_token = issue_token_pair(user)
  return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=user)


@router.post("/apple", response_model=TokenResponse)
def login_apple(payload: SocialLoginRequest, db: Session = Depends(get_db)):
  user = social_login_apple(db, payload.id_token)
  access_token, refresh_token = issue_token_pair(user)
  return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=user)


@router.post("/refresh", response_model=TokenResponse)
def refresh_tokens(payload: RefreshRequest, db: Session = Depends(get_db)):
  token_data = decode_token(payload.refresh_token, expected_type="refresh")
  subject = token_data.get("sub")
  user = db.get(User, int(subject)) if subject else None
  if user is None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
  access_token, refresh_token = issue_token_pair(user)
  return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=user)


@router.get("/me", response_model=UserOut)
def get_profile(user: User = Depends(get_current_user)):
  return user
