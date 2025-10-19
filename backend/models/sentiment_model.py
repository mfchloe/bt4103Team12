from __future__ import annotations
from typing import List, Optional, Dict
from pydantic import BaseModel, Field, NonNegativeInt
from datetime import datetime

# Request to analyze one or more symbols
class NewsSentimentRequest(BaseModel):
    symbols: List[str] = Field(min_length=1, description="Stock symbols to analyze")
    max_headlines_per_symbol: NonNegativeInt = Field(default=5, le=20)

# A single headline we scored
class HeadlineSentiment(BaseModel):
    title: str
    score: float  # raw VADER compound (-1..1)
    score100: int  # scaled to -100..100
    label: str  # Positive/Neutral/Negative
    url: Optional[str] = None
    source: Optional[str] = None
    published_at: Optional[datetime] = None

# Summary per symbol (top pick + supporting data)
class SymbolSentiment(BaseModel):
    symbol: str
    summary_label: str  # Positive/Neutral/Negative
    summary_score100: int  # -100..100
    direction: str  # 'up' | 'down' | 'flat' for icon mapping
    picked_headline: Optional[HeadlineSentiment] = None
    headlines: List[HeadlineSentiment] = []

class NewsSentimentResponse(BaseModel):
    sentiments: Dict[str, SymbolSentiment]