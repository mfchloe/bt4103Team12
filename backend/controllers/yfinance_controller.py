import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, status

from models.stock_model import (
    BatchStockPriceRequest,
    BatchStockPriceResponse,
    ErrorResponse,
    HistoricalPriceResponse,
    HistoricalSeriesItem,
    HistoricalSeriesPoint,
    HistoricalSeriesRequest,
    HistoricalSeriesResponse,
    StockPriceResponse,
    StockSearchResponse,
    StockSearchResult,
)
from services.yfinance_service import YFinanceService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/yfinance", tags=["real-time stock data"])

yfinance_service = YFinanceService()


@router.get(
    "/search",
    response_model=StockSearchResponse,
    summary="Search for stocks",
    description="Search for stocks by symbol or company name",
)
async def search_stocks(q: str, limit: int = 10):
    """
    Search for stocks by symbol or company name.
    """
    try:
        if not q or len(q.strip()) < 1:
            return StockSearchResponse(results=[])

        limit = min(limit, 50)
        results = yfinance_service.search_stocks(q.strip(), limit)

        search_results = [
            StockSearchResult(symbol=result["symbol"], name=result["name"])
            for result in results
        ]

        return StockSearchResponse(results=search_results)
    except Exception as error:  # pragma: no cover - defensive logging
        logger.error("Error in stock search: %s", error)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search stocks: {error}",
        )


@router.get(
    "/{symbol}",
    response_model=StockPriceResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Stock not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    summary="Get real-time stock price",
    description="Fetch current stock price and company information from Yahoo Finance",
)
async def get_realtime_stock_price(symbol: str):
    """
    Get real-time stock price and information for a given symbol.
    """
    try:
        stock_data = yfinance_service.get_realtime_stock_data(symbol)
        return StockPriceResponse(**stock_data)
    except Exception as error:
        if "Too Many Requests" in str(error):
            logger.warning("Rate limit reached for symbol: %s", symbol)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limited. Try again later.",
            )

        if "No data found" in str(error) or isinstance(error, ValueError):
            logger.warning("Invalid symbol requested: %s", symbol)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(error),
            )

        logger.error("Unexpected error for symbol %s: %s", symbol, error)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch stock data: {error}",
        )


@router.post(
    "/batch",
    response_model=BatchStockPriceResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Bad request"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    summary="Get real-time prices for multiple stocks",
    description="Batch fetch current prices for multiple stocks from Yahoo Finance",
)
async def get_batch_realtime_prices(request: BatchStockPriceRequest):
    """
    Get real-time prices for multiple stocks in a single request.
    """
    try:
        if not request.symbols:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No symbols provided",
            )

        prices = yfinance_service.get_batch_realtime_prices(request.symbols)
        return BatchStockPriceResponse(prices=prices)
    except HTTPException:
        raise
    except Exception as error:  # pragma: no cover - defensive logging
        logger.error("Error in batch price fetch: %s", error)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch batch prices: {error}",
        )


@router.get(
    "/{symbol}/historical-price",
    response_model=HistoricalPriceResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        404: {"model": ErrorResponse, "description": "Price not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    summary="Get historical closing price",
    description=(
        "Fetch the closing price for a stock on a specific date "
        "(falls back to the most recent prior trading day if markets were closed)."
    ),
)
async def get_historical_price(
    symbol: str,
    date: str = Query(..., description="Purchase date in ISO format (YYYY-MM-DD)"),
):
    """
    Get the closing price for a symbol on (or the nearest previous trading day before) the provided date.
    """
    try:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD.",
            )

        today = datetime.utcnow().date()
        if target_date > today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Date cannot be in the future.",
            )

        historical_data = yfinance_service.get_historical_price(symbol, target_date)

        return HistoricalPriceResponse(
            symbol=symbol.upper(),
            requestedDate=target_date.isoformat(),
            priceDate=historical_data["price_date"].isoformat(),
            price=historical_data["price"],
        )
    except HTTPException:
        raise
    except ValueError as error:
        logger.warning(
            "Historical price not found for %s on %s: %s", symbol, date, error
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )
    except Exception as error:  # pragma: no cover - defensive logging
        logger.error(
            "Unexpected error fetching historical price for %s on %s: %s",
            symbol,
            date,
            error,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch historical price: {error}",
        )


@router.post(
    "/historical-series",
    response_model=HistoricalSeriesResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    summary="Get historical time series data",
    description=(
        "Fetch daily closing prices for multiple symbols within the provided date range."
    ),
)
async def get_historical_series(request: HistoricalSeriesRequest):
    """
    Get historical daily closing prices for one or more symbols over a date range.
    """
    try:
        try:
            start_date = datetime.strptime(request.startDate, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid startDate format. Use YYYY-MM-DD.",
            )

        if request.endDate:
            try:
                end_date = datetime.strptime(request.endDate, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid endDate format. Use YYYY-MM-DD.",
                )
        else:
            end_date = datetime.utcnow().date()

        today = datetime.utcnow().date()
        if start_date > today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="startDate cannot be in the future.",
            )

        if end_date > today:
            end_date = today

        if start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="startDate cannot be after endDate.",
            )

        series_data = yfinance_service.get_historical_series(
            request.symbols,
            start_date=start_date,
            end_date=end_date,
        )

        series_items = []
        for symbol, entries in series_data.items():
            points = [
                HistoricalSeriesPoint(
                    date=entry["date"].isoformat(),
                    price=entry["price"],
                )
                for entry in entries
            ]
            series_items.append(
                HistoricalSeriesItem(
                    symbol=symbol.upper(),
                    prices=points,
                )
            )

        return HistoricalSeriesResponse(series=series_items)
    except HTTPException:
        raise
    except Exception as error:  # pragma: no cover - defensive logging
        logger.error(
            "Error fetching historical series for %s: %s",
            ", ".join(request.symbols),
            error,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch historical series: {error}",
        )
