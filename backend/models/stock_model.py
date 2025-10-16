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

class HistoricalPriceResponse(BaseModel):
    symbol: str
    requestedDate: str
    priceDate: str
    price: float
    success: bool = True

class HistoricalSeriesPoint(BaseModel):
    date: str
    price: float

class HistoricalSeriesItem(BaseModel):
    symbol: str
    prices: List[HistoricalSeriesPoint]

class HistoricalSeriesRequest(BaseModel):
    symbols: List[str] = Field(..., min_items=1)
    startDate: str
    endDate: Optional[str] = None

class HistoricalSeriesResponse(BaseModel):
    series: List[HistoricalSeriesItem]
    success: bool = True

class ErrorResponse(BaseModel):
    error: str
    success: bool = False

if __name__ == "__main__":
    # Example usage
    example_price_response = StockPriceResponse(
        symbol="AAPL",
        name="Apple Inc.",
        currentPrice=150.25
    )
    print(example_price_response)
