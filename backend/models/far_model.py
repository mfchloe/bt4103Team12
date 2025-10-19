from __future__ import annotations

from datetime import date
from typing import List, Optional, Union

from pydantic import BaseModel, Field, NonNegativeInt


class NumericRange(BaseModel):
    minimum: Optional[float] = Field(default=None)
    maximum: Optional[float] = Field(default=None)


class DateRange(BaseModel):
    start: Optional[date] = Field(default=None)
    end: Optional[date] = Field(default=None)


class FARFilters(BaseModel):
    customer_type: Optional[List[str]] = Field(default=None, description="e.g., Mass, Premium")
    investor_type: Optional[List[str]] = Field(default=None, description="e.g., Buy-and-Hold, Moderate, Active")
    risk_level: Optional[List[str]] = Field(default=None)
    sectors: Optional[List[str]] = Field(default=None)
    investment_capacity: Optional[Union[List[str], NumericRange]] = Field(default=None)
    date_range: Optional[DateRange] = Field(default=None)
    search_query: Optional[str] = Field(default=None)


# requests
class MetricsRequest(BaseModel):
    filters: FARFilters


class TopAssetsRequest(BaseModel):
    filters: FARFilters
    top_n: NonNegativeInt = Field(default=20)


class SectorPrefsRequest(BaseModel):
    filters: FARFilters


class ActivitySeriesRequest(BaseModel):
    filters: FARFilters
    interval: str = Field(default="month", pattern=r"^(day|week|month|quarter|year)$")


class ScatterSampleRequest(BaseModel):
    filters: FARFilters
    limit: NonNegativeInt = Field(default=5000)


class ExplainRequest(BaseModel):
    filters: FARFilters
    asset: str


class HistogramRequest(BaseModel):
    filters: FARFilters
    column: str = Field(description="Numeric column name to histogram")
    bins: NonNegativeInt = Field(default=20)


class HistogramBin(BaseModel):
    bin_start: float
    bin_end: float
    count: int


class HistogramResponse(BaseModel):
    bins: List[HistogramBin]


class CategoryBreakdownRequest(BaseModel):
    filters: FARFilters
    column: str = Field(description="Categorical column name to count")
    top_n: NonNegativeInt = Field(default=20)


class CategoryRow(BaseModel):
    label: str
    value: int


class CategoryBreakdownResponse(BaseModel):
    rows: List[CategoryRow]


# responses
class MetricsResponse(BaseModel):
    customers: int = 0
    avg_portfolio_value: Optional[float] = None
    median_holding_days: Optional[float] = None
    avg_transactions_per_month: Optional[float] = None
    stock_pct: Optional[float] = None
    etf_pct: Optional[float] = None


class TopAssetRow(BaseModel):
    asset: str
    adoption_rate: float
    lift: Optional[float] = None
    momentum_slope: Optional[float] = None
    median_holding_days: Optional[float] = None
    avg_position_value: Optional[float] = None


class TopAssetsResponse(BaseModel):
    rows: List[TopAssetRow]


class SectorPrefRow(BaseModel):
    sector: str
    adoption_rate: float
    lift: Optional[float] = None


class ActivitySeriesRow(BaseModel):
    period: str
    buy_volume: int
    unique_buyers: int


class ScatterPoint(BaseModel):
    days_since_last_buy: Optional[float] = None
    avg_transactions_per_month: Optional[float] = None
    investor_type: Optional[str] = None
    portfolio_value: Optional[float] = None


class ExplainResponse(BaseModel):
    adoption_rate: Optional[float] = None
    lift: Optional[float] = None
    recent_momentum: Optional[float] = None
    similar_customer_count: int = 0
    median_holding_days: Optional[float] = None
    churn_pct_30d: Optional[float] = None
    notes: Optional[str] = None
