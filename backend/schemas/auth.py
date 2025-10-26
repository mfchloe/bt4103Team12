from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class RegisterRequest(BaseModel):
  email: EmailStr
  password: str = Field(min_length=8)
  full_name: Optional[str] = None


class LoginRequest(BaseModel):
  email: EmailStr
  password: str


class SocialLoginRequest(BaseModel):
  id_token: str = Field(..., alias="credential")


class FarCustomerLoginRequest(BaseModel):
  customer_id: str = Field(..., description="Customer ID from FAR-TRANS dataset")


class UserOut(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  id: int
  email: EmailStr
  full_name: Optional[str]
  provider: str
  picture_url: Optional[str]
  created_at: datetime
  updated_at: datetime


class TokenPair(BaseModel):
  access_token: str
  refresh_token: str
  token_type: str = "bearer"


class TokenResponse(TokenPair):
  user: UserOut


class FarTokenResponse(BaseModel):
  access_token: str
  token_type: str = "bearer"
  mode: str = "far_customer"
  customer_id: str


class RefreshRequest(BaseModel):
  refresh_token: str
