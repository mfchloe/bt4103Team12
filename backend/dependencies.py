from typing import Generator

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.security import decode_token, oauth2_scheme
from database import SessionLocal
from models import User


def get_db() -> Generator[Session, None, None]:
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
  payload = decode_token(token, expected_type="access")
  subject = payload.get("sub")
  if subject is None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")

  user = db.get(User, int(subject))
  if not user:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists")
  return user

