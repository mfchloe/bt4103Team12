from pydantic import BaseModel
from typing import List, Optional

class RecommendationRequest(BaseModel):
    customer_id: str
    existing_portfolio: List[str] = []
    cluster_id: Optional[int] = None

class RecommendationResponse(BaseModel):
    recommendations: list  # list of [stock, score, sharpe]


class PortfolioAllocationRequest(BaseModel):
    isins: List[str]
    investment_amount: float
    target_return: Optional[float] = None
    max_risk: Optional[float] = None


class PortfolioAllocationItem(BaseModel):
    isin: str
    symbol: str
    name: str
    weight: float
    price: Optional[float]
    shares: int
    allocated_value: float
    target_value: float


class PortfolioAllocationResponse(BaseModel):
    allocations: List[PortfolioAllocationItem]
