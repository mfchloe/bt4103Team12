import logging
from typing import List, Dict, Optional
from datetime import datetime
from nltk.sentiment import SentimentIntensityAnalyzer

logger = logging.getLogger(__name__)

class SentimentService:
    _vader = SentimentIntensityAnalyzer()

    @staticmethod
    def score_headline(title: str) -> float:
        """Return VADER compound score (-1..1)."""
        if not title:
            return 0.0
        return SentimentService._vader.polarity_scores(title).get("compound", 0.0)

    @staticmethod
    def to_label(compound: float) -> str:
        # classic VADER banding: >0.05 positive, < -0.05 negative, else neutral
        if compound > 0.05:
            return "Positive"
        if compound < -0.05:
            return "Negative"
        return "Neutral"

    @staticmethod
    def to_score100(compound: float) -> int:
        # scale -1..1 to -100..100
        return round(compound * 100)

    @staticmethod
    def direction_from_score(score100: int) -> str:
        if score100 > 30:
            return "up"
        if score100 < -30:
            return "down"
        return "flat"
