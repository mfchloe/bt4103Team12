from fastapi import APIRouter, Depends, HTTPException, status

from dependencies import get_current_actor
from schemas import (
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
  SocialLoginRequest,
  TokenResponse,
  UserOut,
  FarCustomerLoginRequest,
  FarTokenResponse
)
from services.auth_service import (
  authenticate_user,
  refresh_firebase_tokens,
  register_user,
  social_login_apple,
  social_login_google,
  issue_far_customer_token,
)
from services import far_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest):
  return register_user(payload)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
  return authenticate_user(payload)


@router.post("/far-customer-login", response_model=FarTokenResponse)
def far_customer_login(payload: FarCustomerLoginRequest):
  if not far_service.customer_exists(payload.customer_id):
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Invalid Customer ID",
    )
  
  access_token = issue_far_customer_token(payload.customer_id)
  
  return FarTokenResponse(
    access_token=access_token,
    customer_id=payload.customer_id,
  )


@router.post("/google", response_model=TokenResponse)
def login_google(payload: SocialLoginRequest):
  return social_login_google(payload)


@router.post("/apple", response_model=TokenResponse)
def login_apple(payload: SocialLoginRequest):
  return social_login_apple(payload)


@router.post("/refresh", response_model=TokenResponse)
def refresh_tokens(payload: RefreshRequest):
  return refresh_firebase_tokens(payload.refresh_token)


@router.get("/me", response_model=UserOut)
def get_profile(actor=Depends(get_current_actor)):
  if getattr(actor, "mode", None) != "app":
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Profile is available only for Firebase-authenticated users.",
    )
  return actor.user
