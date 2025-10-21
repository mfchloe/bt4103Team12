from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from core.config import settings

pwd_context = CryptContext(schemes=["bcrypt_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
  return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
  return pwd_context.verify(plain_password, password_hash)


def _create_token(subject: str, expires_delta: timedelta, token_type: str, additional_claims: Optional[Dict[str, Any]] = None) -> str:
  expire = datetime.utcnow() + expires_delta
  to_encode: Dict[str, Any] = {"sub": subject, "exp": expire, "type": token_type}
  if additional_claims:
    to_encode.update(additional_claims)
  encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)
  return encoded_jwt


def create_access_token(subject: str, additional_claims: Optional[Dict[str, Any]] = None) -> str:
  expires = timedelta(minutes=settings.access_token_expire_minutes)
  return _create_token(subject, expires, token_type="access", additional_claims=additional_claims)


def create_refresh_token(subject: str, additional_claims: Optional[Dict[str, Any]] = None) -> str:
  expires = timedelta(minutes=settings.refresh_token_expire_minutes)
  return _create_token(subject, expires, token_type="refresh", additional_claims=additional_claims)


def decode_token(token: str, expected_type: Optional[str] = None) -> Dict[str, Any]:
  credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
  )
  try:
    payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    token_type = payload.get("type")
    if expected_type and token_type != expected_type:
      raise credentials_exception
    return payload
  except JWTError as exc:
    raise credentials_exception from exc

