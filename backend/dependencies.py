from datetime import datetime

from fastapi import Depends, HTTPException, status

from core.firebase_app import get_firebase_user, verify_firebase_token
from core.security import decode_token, oauth2_scheme
from schemas import UserOut
from services import far_service


class AppUserActor:
  def __init__(self, user: UserOut):
    self.mode = "app"
    self.user = user
    self.id = user.id
    self.customer_id = None


class FarCustomerActor:
  def __init__(self, customer_id: str):
    self.mode = "far_customer"
    self.user = None
    self.id = None
    self.customer_id = customer_id


def _as_datetime(millis: int | None) -> datetime | None:
  if millis is None:
    return None
  return datetime.fromtimestamp(millis / 1000.0)


def _build_app_actor(uid: str) -> AppUserActor:
  record = get_firebase_user(uid)
  metadata = record.user_metadata
  user = UserOut(
    id=record.uid,
    email=record.email,
    full_name=record.display_name,
    provider=record.provider_id,
    picture_url=record.photo_url,
    created_at=_as_datetime(getattr(metadata, "creation_timestamp", None)),
    updated_at=_as_datetime(getattr(metadata, "last_sign_in_timestamp", None)),
  )
  return AppUserActor(user=user)


def _try_far_customer_actor(payload: dict) -> FarCustomerActor | None:
  mode = payload.get("mode")
  subject = payload.get("sub")
  if mode not in {"far_customer", "dataset"} or not subject:
    return None
  if not far_service.customer_exists(subject):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Far customer not found")
  return FarCustomerActor(customer_id=str(subject))


def _try_firebase_actor(token: str) -> AppUserActor | None:
  try:
    claims = verify_firebase_token(token)
  except Exception:
    return None
  uid = claims.get("uid")
  if not uid:
    return None
  try:
    return _build_app_actor(uid)
  except Exception:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Firebase user no longer exists")


def get_current_actor(token: str = Depends(oauth2_scheme)):
  # First try FAR dataset tokens issued by this backend.
  try:
    payload = decode_token(token, expected_type="access")
  except HTTPException:
    payload = None

  if payload:
    far_actor = _try_far_customer_actor(payload)
    if far_actor:
      return far_actor

  firebase_actor = _try_firebase_actor(token)
  if firebase_actor:
    return firebase_actor

  raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")
