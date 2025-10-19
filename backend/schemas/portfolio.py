from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class PortfolioItemBase(BaseModel):
  symbol: str = Field(..., max_length=32)
  name: Optional[str] = None
  shares: float = Field(..., gt=0)
  buy_price: float = Field(..., ge=0)
  buy_date: Optional[date] = None
  current_price: Optional[float] = Field(default=None, ge=0)


class PortfolioItemCreate(PortfolioItemBase):
  pass


class PortfolioItemUpdate(BaseModel):
  shares: Optional[float] = Field(default=None, gt=0)
  buy_price: Optional[float] = Field(default=None, ge=0)
  buy_date: Optional[date] = None
  current_price: Optional[float] = Field(default=None, ge=0)


class PortfolioItemOut(PortfolioItemBase):
  model_config = ConfigDict(from_attributes=True)

  id: int
  created_at: datetime
  updated_at: datetime
