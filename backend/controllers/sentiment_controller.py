import logging
from fastapi import APIRouter, HTTPException, status
from typing import Dict, List
import logging
from datetime import datetime

from models.sentiment_model import (
    NewsSentimentRequest, NewsSentimentResponse,
    SymbolSentiment, HeadlineSentiment
)
from services.news_service import NewsService
from services.sentiment_service import SentimentService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/sentiment", tags=["news & sentiment"])

@router.post(
    "/news-sentiment",
    response_model=NewsSentimentResponse,
    summary="Get news-driven sentiment per symbol",
    description="Fetch latest headlines per symbol and score them with NLTK VADER."
)
async def news_sentiment(request: NewsSentimentRequest):
    if not request.symbols:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No symbols provided")

    sentiments: Dict[str, SymbolSentiment] = {}

    for raw_symbol in request.symbols:
        symbol = raw_symbol.upper()
        try:
            headlines_raw = NewsService.get_news(symbol, limit=request.max_headlines_per_symbol)
        except Exception as e:
            logger.error("Failed to get news for %s: %s", symbol, e)
            headlines_raw = []

        scored: List[HeadlineSentiment] = []
        for item in headlines_raw:
            comp = SentimentService.score_headline(item.get("title") or "")
            scored.append(HeadlineSentiment(
                title=item.get("title") or "",
                score=comp,
                score100=SentimentService.to_score100(comp),
                label=SentimentService.to_label(comp),
                url=item.get("link"),
                source=item.get("publisher"),
                published_at=item.get("published_at"),
            ))

        # Choose a representative "picked" headline:
        # priority: newest; tie-breaker: highest absolute sentiment
        picked = None
        if scored:
            scored_sorted = sorted(
                scored,
                key=lambda h: (
                    h.published_at or datetime.min,  # newest first
                    abs(h.score),                    # stronger sentiment
                ),
                reverse=True
            )
            picked = scored_sorted[0]
            # summary could be mean of most recent 3 or picked only; keep simple:
            summary_score100 = picked.score100
            summary_label = picked.label
        else:
            summary_score100 = 0
            summary_label = "Neutral"

        sentiments[symbol] = SymbolSentiment(
            symbol=symbol,
            summary_label=summary_label,
            summary_score100=summary_score100,
            direction=SentimentService.direction_from_score(summary_score100),
            picked_headline=picked,
            headlines=scored
        )

    return NewsSentimentResponse(sentiments=sentiments)
