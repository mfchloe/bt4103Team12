from typing import List, Optional

from pydantic import BaseModel


class DatasetRecommendationItem(BaseModel):
    symbol: str
    name: str
    isin: str
    latestPrice: Optional[float] = None
    totalValue: Optional[float] = None
    totalUnits: Optional[float] = None


class DatasetRecommendationsResponse(BaseModel):
    items: List[DatasetRecommendationItem]
    success: bool = True
