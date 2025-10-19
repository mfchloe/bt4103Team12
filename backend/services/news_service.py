import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
import yfinance as yf

logger = logging.getLogger(__name__)

def _parse_pubdate_iso8601_z(s: Optional[str]) -> Optional[datetime]:
    """Parse strings like '2025-10-19T05:00:01Z' -> aware datetime UTC."""
    if not s:
        return None
    try:
        # Handle trailing 'Z' explicitly
        if s.endswith("Z"):
            return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        # Fallback: fromisoformat for offsets like +00:00
        return datetime.fromisoformat(s)
    except Exception:
        return None

class NewsService:
    _cache: Dict[str, Dict[str, Any]] = {}
    _ttl = timedelta(minutes=5)

    @classmethod
    def _from_yfinance(cls, symbol: str, limit: int) -> List[Dict[str, Any]]:
        try:
            raw = yf.Ticker(symbol).news or []
        except Exception as e:
            logger.warning("NewsService: yfinance error for %s: %s", symbol, e)
            raw = []

        cleaned: List[Dict[str, Any]] = []

        for item in raw[:limit]:
            content = item.get("content")
            if isinstance(content, dict):
                title = content.get("title") or ""
                # Prefer clickThroughUrl, then canonicalUrl
                link = (
                    (content.get("clickThroughUrl") or {}).get("url")
                    or (content.get("canonicalUrl") or {}).get("url")
                    or None
                )
                provider = (content.get("provider") or {}).get("displayName")
                published_at = _parse_pubdate_iso8601_z(content.get("pubDate"))

            else:
                # --- Legacy flat shape (older yfinance) ---
                title = item.get("title") or ""
                link = item.get("link") or None
                provider = item.get("publisher")
                ts = item.get("providerPublishTime")
                published_at = (
                    datetime.fromtimestamp(ts, tz=timezone.utc) if ts else None
                )

            # Skip empties defensively
            if not title:
                continue

            cleaned.append(
                {
                    "title": title,
                    "link": link,
                    "publisher": provider,
                    "published_at": published_at,
                }
            )

        return cleaned

    @classmethod
    def get_news(cls, symbol: str, limit: int = 5) -> List[Dict[str, Any]]:
        sym = symbol.upper()
        now = datetime.now(timezone.utc)

        cached = cls._cache.get(sym)
        if cached and (now - cached["time"] < cls._ttl):
            return cached["data"][:limit]

        items = cls._from_yfinance(sym, limit)

        cls._cache[sym] = {"data": items, "time": now}
        return items
