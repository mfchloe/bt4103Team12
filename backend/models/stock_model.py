from typing import List, Optional

from pydantic import BaseModel, Field


class StockPriceResponse(BaseModel):
    symbol: str
    name: str
    currentPrice: float
    success: bool = True


class StockSearchResult(BaseModel):
    symbol: str
    name: str
    isin: Optional[str] = None


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
    isin: Optional[str] = None
    name: Optional[str] = None
    predictedSharpe: Optional[float] = None


class HistoricalSeriesRequest(BaseModel):
    symbols: List[str] = Field(..., min_items=1)
    startDate: str
    endDate: Optional[str] = None


class DatasetHistoricalSeriesRequest(BaseModel):
    isins: List[str] = Field(..., min_items=1)
    startDate: str
    endDate: Optional[str] = None


class HistoricalSeriesResponse(BaseModel):
    series: List[HistoricalSeriesItem]
    success: bool = True


class DatasetHistoricalSeriesResponse(BaseModel):
    series: List[HistoricalSeriesItem]
    success: bool = True


class ErrorResponse(BaseModel):
    error: str
    success: bool = False
