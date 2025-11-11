from pydantic import BaseModel
from typing import List, Optional

class RecommendationRequest(BaseModel):
    customer_id: str
    existing_portfolio: List[str] = []
    cluster_id: Optional[int] = None

class RecommendationResponse(BaseModel):
    recommendations: list  # list of [stock, score, sharpe]