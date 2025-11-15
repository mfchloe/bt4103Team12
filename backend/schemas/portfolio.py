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

  shares: float = Field(..., ge=0)
  id: str
  created_at: datetime
  updated_at: datetime
  total_buy_value: Optional[float] = None
  total_sell_value: Optional[float] = None
  realized_pl: Optional[float] = None
  remaining_cost: Optional[float] = None
  synthetic: Optional[bool] = None
  last_seen_price: Optional[float] = None
  last_seen_date: Optional[str] = None
  isin: Optional[str] = None
