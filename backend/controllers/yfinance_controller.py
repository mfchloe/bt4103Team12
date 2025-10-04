from fastapi import APIRouter, HTTPException, status
from services.yfinance_service import YFinanceService
from models.stock_model import *
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/yfinance",
    tags=["real-time stock data"]
)

yfinance_service = YFinanceService()

# search service (search for stock!!)
@router.get(
    "/search",
    response_model=StockSearchResponse,
    summary="Search for stocks",
    description="Search for stocks by symbol or company name"
)
async def search_stocks(q: str, limit: int = 10):
    """
    Search for stocks by symbol or company name
    
    Args:
        q: Search query string
        limit: Maximum number of results (default: 10, max: 50)
        
    Returns:
        StockSearchResponse with matching stocks
    """
    try:
        if not q or len(q.strip()) < 1:
            return StockSearchResponse(results=[])
        
        # limit the maximum results
        limit = min(limit, 50)
        
        results = yfinance_service.search_stocks(q.strip(), limit)
        
        search_results = [
            StockSearchResult(symbol=r["symbol"], name=r["name"]) 
            for r in results
        ]
        
        return StockSearchResponse(results=search_results)
    
    except Exception as e:
        logger.error(f"Error in stock search: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search stocks: {str(e)}"
        )
    

# get stock price based on symbol
@router.get(
    "/{symbol}",
    response_model=StockPriceResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Stock not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    },
    summary="Get real-time stock price",
    description="Fetch current stock price and company information from Yahoo Finance"
)

async def get_realtime_stock_price(symbol: str):
    """
    Get real-time stock price and information for a given symbol
    """
    try:
        stock_data = yfinance_service.get_realtime_stock_data(symbol)
        return StockPriceResponse(**stock_data)

    except Exception as e:
        if "Too Many Requests" in str(e):
            logger.warning(f"Rate limit reached for symbol: {symbol}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limited. Try again later."
            )

        elif "No data found" in str(e) or isinstance(e, ValueError):
            logger.warning(f"Invalid symbol requested: {symbol}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )

        else:
            logger.error(f"Unexpected error for symbol {symbol}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch stock data: {str(e)}"
            )


# get prices for multiple stocks
@router.post(
    "/batch",
    response_model=BatchStockPriceResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Bad request"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    },
    summary="Get real-time prices for multiple stocks",
    description="Batch fetch current prices for multiple stocks from Yahoo Finance"
)
async def get_batch_realtime_prices(request: BatchStockPriceRequest):
    """
    Get real-time prices for multiple stocks in a single request
    
    Args:
        request: BatchStockRequest containing list of stock symbols
        
    Returns:
        BatchStockResponse with current prices for all requested symbols
    """
    try:
        if not request.symbols:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No symbols provided"
            )
        
        prices = yfinance_service.get_batch_realtime_prices(request.symbols)
        return BatchStockPriceResponse(prices=prices)
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Error in batch price fetch: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch batch prices: {str(e)}"
        )
