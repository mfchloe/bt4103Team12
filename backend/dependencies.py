from typing import Generator

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.security import decode_token, oauth2_scheme
from database import SessionLocal
from models import User
from models.far_customers import FarCustomer as FarCustomerModel

class AppUserActor:
  def __init__(self, user: User):
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


def get_db() -> Generator[Session, None, None]:
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()


def get_current_actor(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
  payload = decode_token(token, expected_type="access")
  mode = payload.get("mode")
  subject = payload.get("sub")
  if subject is None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token (no subject)")
  
  # Far trans customer path
  if mode in {"far_customer", "dataset"}:
    far_customer = db.get(FarCustomerModel, subject)
    if far_customer is None:
      raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Far Trans customer not found")
    return FarCustomerActor(customer_id=subject)

  # Firebase user path
  try:
    user_id = int(subject)
  except (TypeError, ValueError):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token (bad subject)")

  user = db.get(User, user_id)
  if not user:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists")
  
  return AppUserActor(user)
