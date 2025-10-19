from datetime import datetime

from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database import Base


class PortfolioItem(Base):
  __tablename__ = "portfolio_items"

  id = Column(Integer, primary_key=True, index=True)
  user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
  symbol = Column(String(32), nullable=False, index=True)
  name = Column(String(255), nullable=True)
  shares = Column(Float, nullable=False)
  buy_price = Column(Float, nullable=False)
  buy_date = Column(Date, nullable=True)
  current_price = Column(Float, nullable=True)
  created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
  updated_at = Column(
    DateTime,
    default=datetime.utcnow,
    onupdate=datetime.utcnow,
    nullable=False,
  )

  owner = relationship("User", back_populates="portfolio_items")

  def __repr__(self) -> str:
    return f"PortfolioItem(id={self.id}, symbol={self.symbol}, user_id={self.user_id})"

