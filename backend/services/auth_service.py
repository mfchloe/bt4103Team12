import json
from datetime import datetime
from functools import lru_cache
from typing import Optional, Tuple

import httpx
import jwt
from fastapi import HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.orm import Session

from core.config import settings
from core.security import create_access_token, create_refresh_token, hash_password, verify_password
from models import AuthProvider, User
from schemas import LoginRequest, RegisterRequest

APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys"


def _get_user_by_email(db: Session, email: str) -> Optional[User]:
  return db.query(User).filter(User.email == email).first()


def _get_user_by_provider(db: Session, provider: AuthProvider, provider_sub: str) -> Optional[User]:
  return db.query(User).filter(User.provider == provider, User.provider_sub == provider_sub).first()


def register_user(db: Session, payload: RegisterRequest) -> User:
  existing_user = _get_user_by_email(db, payload.email)
  if existing_user:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

  user = User(
    email=payload.email,
    full_name=payload.full_name,
    password_hash=hash_password(payload.password),
    provider=AuthProvider.local,
  )
  db.add(user)
  db.commit()
  db.refresh(user)
  return user


def authenticate_user(db: Session, payload: LoginRequest) -> User:
  user = _get_user_by_email(db, payload.email)
  if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
  return user


def issue_token_pair(user: User) -> Tuple[str, str]:
  subject = str(user.id)
  claims = {"provider": user.provider.value}
  access = create_access_token(subject, additional_claims=claims)
  refresh = create_refresh_token(subject, additional_claims=claims)
  return access, refresh


def issue_far_customer_token(customer_id: str) -> str:
  claims = {
    "mode": "dataset",
    "customer_id": customer_id
  }
  access_token = create_access_token(
    subject = customer_id,
    additional_claims = claims
  )
  return access_token

def _verify_google_token(id_token: str) -> dict:
  if not settings.google_client_id:
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail="Google authentication not configured",
    )
  try:
    request = google_requests.Request()
    info = google_id_token.verify_oauth2_token(id_token, request, settings.google_client_id)
    if info.get("aud") != settings.google_client_id:
      raise ValueError("Token audience mismatch")
    return info
  except ValueError as exc:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token") from exc


@lru_cache(maxsize=1)
def _fetch_apple_keys() -> list:
  with httpx.Client(timeout=5.0) as client:
    response = client.get(APPLE_KEYS_URL)
    response.raise_for_status()
    payload = response.json()
    return payload["keys"]


def _get_apple_public_key(kid: str) -> dict:
  keys = _fetch_apple_keys()
  match = next((key for key in keys if key["kid"] == kid), None)
  if match:
    return match
  # If not found, refresh cache once
  _fetch_apple_keys.cache_clear()  # type: ignore[attr-defined]
  keys = _fetch_apple_keys()
  match = next((key for key in keys if key["kid"] == kid), None)
  if not match:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Apple public key not found")
  return match


def _verify_apple_token(id_token: str) -> dict:
  if not settings.apple_client_id:
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail="Apple authentication not configured",
    )
  try:
    header = jwt.get_unverified_header(id_token)
    key_dict = _get_apple_public_key(header["kid"])
    public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key_dict))
    claims = jwt.decode(
      id_token,
      public_key,
      algorithms=["RS256"],
      audience=settings.apple_client_id,
      issuer="https://appleid.apple.com",
    )
    return claims
  except (jwt.PyJWTError, KeyError) as exc:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Apple token") from exc


def social_login_google(db: Session, id_token: str) -> User:
  info = _verify_google_token(id_token)
  email = info.get("email")
  if not email:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google token missing email")

  user = _get_user_by_provider(db, AuthProvider.google, info["sub"])
  if user is None:
    user = _get_user_by_email(db, email)
    if user is None:
      user = User(
        email=email,
        full_name=info.get("name"),
        provider=AuthProvider.google,
        provider_sub=info.get("sub"),
        picture_url=info.get("picture"),
      )
      db.add(user)
    else:
      # Existing local account - link to Google
      user.provider = AuthProvider.google
      user.provider_sub = info.get("sub")
      user.picture_url = info.get("picture")

  user.updated_at = datetime.utcnow()
  db.commit()
  db.refresh(user)
  return user


def social_login_apple(db: Session, id_token: str) -> User:
  claims = _verify_apple_token(id_token)
  email = claims.get("email")
  subject = claims.get("sub")
  if not subject:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Apple token missing subject")

  user = _get_user_by_provider(db, AuthProvider.apple, subject)
  if user is None:
    if not email:
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Apple token missing email")
    user = _get_user_by_email(db, email)
    if user is None:
      user = User(
        email=email,
        full_name=claims.get("name"),
        provider=AuthProvider.apple,
        provider_sub=subject,
      )
      db.add(user)
    else:
      user.provider = AuthProvider.apple
      user.provider_sub = subject

  user.updated_at = datetime.utcnow()
  db.commit()
  db.refresh(user)
  return user


def update_user_password(db: Session, user: User, new_password: str) -> User:
  user.password_hash = hash_password(new_password)
  user.updated_at = datetime.utcnow()
  db.commit()
  db.refresh(user)
  return user

