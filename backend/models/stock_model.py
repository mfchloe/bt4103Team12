from pydantic import BaseModel, Field
from typing import List, Optional

# stock pirce
class StockPriceResponse(BaseModel):
    symbol: str
    name: str
    currentPrice: float
    success: bool = True

class StockSearchResult(BaseModel):
    symbol: str
    name: str

class StockSearchResponse(BaseModel):
    results: List[StockSearchResult]
    success: bool = True

class BatchStockPriceRequest(BaseModel):
    symbols: List[str] = Field(..., min_items=1)

class BatchStockPriceResponse(BaseModel):
    prices: dict[str, Optional[float]]
    success: bool = True

class ErrorResponse(BaseModel):
    error: str
    success: bool = False