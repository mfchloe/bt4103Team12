from pydantic import BaseModel
from typing import List

class RecommendationRequest(BaseModel):
    customer_id: str
    existing_portfolio: List[str] = []

class RecommendationResponse(BaseModel):
    recommendations: list  # list of [stock, score, sharpe]