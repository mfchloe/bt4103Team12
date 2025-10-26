import enum
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from database import Base


class AuthProvider(str, enum.Enum):
  local = "local"
  google = "google"
  apple = "apple"


class User(Base):
  __tablename__ = "users"
  __table_args__ = (UniqueConstraint("email", name="uq_users_email"),)

  id = Column(Integer, primary_key=True, index=True)
  email = Column(String(255), nullable=False, unique=True, index=True)
  password_hash = Column(String(255), nullable=True)
  full_name = Column(String(255), nullable=True)
  provider = Column(Enum(AuthProvider), default=AuthProvider.local, nullable=False)
  provider_sub = Column(String(255), nullable=True, index=True)
  picture_url = Column(String(512), nullable=True)
  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
  updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

  #portfolio_items = relationship("PortfolioItem", back_populates="owner", cascade="all, delete-orphan")

  def __repr__(self) -> str:
    return f"User(id={self.id}, email={self.email}, provider={self.provider})"

