import os
from functools import lru_cache
from typing import Any, Dict, Optional

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials, firestore

from core.config import settings


def _build_credentials() -> Optional[credentials.Base]:
  """Create Firebase credentials from configured sources."""
  cred_path = settings.firebase_credentials_file
  if cred_path:
    resolved_path = os.path.abspath(cred_path)
    if not os.path.exists(resolved_path):
      raise RuntimeError(f"Firebase credentials file not found: {resolved_path}")
    return credentials.Certificate(resolved_path)

  # Fallback to Application Default Credentials.
  try:
    return credentials.ApplicationDefault()
  except Exception:
    return None


@lru_cache(maxsize=1)
def get_firebase_app() -> firebase_admin.App:
  """Initialise (once) and return the Firebase Admin app."""
  if firebase_admin._apps:  # type: ignore[attr-defined]
    return firebase_admin.get_app()

  cred = _build_credentials()
  options: Dict[str, Any] = {}
  if settings.firebase_project_id:
    options["projectId"] = settings.firebase_project_id

  if cred is None and not options:
    raise RuntimeError("Firebase credentials are not configured.")

  return firebase_admin.initialize_app(cred, options or None)


@lru_cache(maxsize=1)
def get_firestore_client() -> firestore.Client:
  """Return the Firestore client bound to our Firebase app."""
  app = get_firebase_app()
  return firestore.client(app=app)


def verify_firebase_token(token: str) -> Dict[str, Any]:
  """Verify an incoming Firebase ID token and return its claims."""
  app = get_firebase_app()
  return firebase_auth.verify_id_token(token, app=app)


def get_firebase_user(uid: str):
  """Fetch Firebase auth user record."""
  app = get_firebase_app()
  return firebase_auth.get_user(uid, app=app)


def set_firebase_user_display_name(uid: str, display_name: str) -> None:
  """Update a Firebase user's display name."""
  app = get_firebase_app()
  firebase_auth.update_user(uid, display_name=display_name, app=app)
