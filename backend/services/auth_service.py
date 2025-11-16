from datetime import datetime
from typing import Any, Dict

import httpx
from fastapi import HTTPException, status

from core.config import settings
from core.firebase_app import (
  get_firebase_user,
  set_firebase_user_display_name,
)
from core.security import create_access_token
from schemas import (
  LoginRequest,
  RegisterRequest,
  SocialLoginRequest,
  TokenResponse,
  UserOut,
)

IDENTITY_TOOLKIT_BASE = "https://identitytoolkit.googleapis.com/v1"
SECURE_TOKEN_BASE = "https://securetoken.googleapis.com/v1"


def _require_api_key() -> str:
  if not settings.firebase_api_key:
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail="Firebase API key is not configured.",
    )
  return settings.firebase_api_key


def _post_json(url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
  try:
    response = httpx.post(url, json=payload, timeout=10.0)
    response.raise_for_status()
    return response.json()
  except httpx.HTTPStatusError as exc:
    detail = exc.response.json().get("error", {}).get("message", "Firebase authentication failed")
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail) from exc
  except httpx.HTTPError as exc:
    raise HTTPException(
      status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
      detail="Unable to reach Firebase authentication service.",
    ) from exc


def _call_identity_toolkit(path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
  api_key = _require_api_key()
  url = f"{IDENTITY_TOOLKIT_BASE}/{path}?key={api_key}"
  return _post_json(url, payload)


def _call_secure_token(payload: Dict[str, Any]) -> Dict[str, Any]:
  api_key = _require_api_key()
  url = f"{SECURE_TOKEN_BASE}/token?key={api_key}"
  return _post_json(url, payload)


def _build_user_out(uid: str) -> UserOut:
  record = get_firebase_user(uid)
  metadata = record.user_metadata
  created_at = (
    datetime.fromtimestamp(metadata.creation_timestamp / 1000.0) if metadata.creation_timestamp else None
  )
  updated_at = (
    datetime.fromtimestamp(metadata.last_sign_in_timestamp / 1000.0) if metadata.last_sign_in_timestamp else None
  )
  return UserOut(
    id=record.uid,
    email=record.email or "",
    full_name=record.display_name,
    provider=record.provider_id,
    picture_url=record.photo_url,
    created_at=created_at,
    updated_at=updated_at,
  )


def _make_token_response(payload: Dict[str, Any]) -> TokenResponse:
  uid = payload.get("localId") or payload.get("user_id")
  if not uid:
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail="Firebase response missing user id.",
    )
  user = _build_user_out(uid)
  access = payload.get("idToken") or payload.get("id_token")
  refresh = payload.get("refreshToken") or payload.get("refresh_token")
  if not access or not refresh:
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail="Firebase response missing authentication tokens.",
    )
  return TokenResponse(access_token=access, refresh_token=refresh, user=user)


def register_user(payload: RegisterRequest) -> TokenResponse:
  response = _call_identity_toolkit(
    "accounts:signUp",
    {
      "email": payload.email,
      "password": payload.password,
      "returnSecureToken": True,
    },
  )

  full_name = payload.full_name
  if full_name:
    try:
      set_firebase_user_display_name(response["localId"], full_name)
    except Exception:
      # Fail open �?display name can be updated later.
      pass

  return _make_token_response(response)


def authenticate_user(payload: LoginRequest) -> TokenResponse:
  response = _call_identity_toolkit(
    "accounts:signInWithPassword",
    {
      "email": payload.email,
      "password": payload.password,
      "returnSecureToken": True,
    },
  )
  return _make_token_response(response)


def social_login_google(payload: SocialLoginRequest) -> TokenResponse:
  response = _call_identity_toolkit(
    "accounts:signInWithIdp",
    {
      "postBody": f"id_token={payload.id_token}&providerId=google.com",
      "requestUri": "https://localhost",
      "returnSecureToken": True,
      "returnIdpCredential": True,
    },
  )
  return _make_token_response(response)


def social_login_apple(payload: SocialLoginRequest) -> TokenResponse:
  response = _call_identity_toolkit(
    "accounts:signInWithIdp",
    {
      "postBody": f"id_token={payload.id_token}&providerId=apple.com",
      "requestUri": "https://localhost",
      "returnSecureToken": True,
      "returnIdpCredential": True,
    },
  )
  return _make_token_response(response)


def refresh_firebase_tokens(refresh_token: str) -> TokenResponse:
  response = _call_secure_token(
    {
      "grant_type": "refresh_token",
      "refresh_token": refresh_token,
    },
  )
  return _make_token_response(response)


def issue_far_customer_token(customer_id: str) -> str:
  claims = {
    "mode": "far_customer",
    "customer_id": customer_id,
  }
  return create_access_token(subject=customer_id, additional_claims=claims)
