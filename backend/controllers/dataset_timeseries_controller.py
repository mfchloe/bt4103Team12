import logging
from datetime import date, datetime

from fastapi import APIRouter, HTTPException, Query, status

from models.stock_model import (
    DatasetHistoricalSeriesRequest,
    DatasetHistoricalSeriesResponse,
    HistoricalSeriesItem,
    HistoricalSeriesPoint,
    StockSearchResponse,
    StockSearchResult,
)
from services.dataset_time_series_service import DatasetTimeSeriesService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dataset/timeseries", tags=["dataset time series"])

dataset_service = DatasetTimeSeriesService()

LATEST_AVAILABLE_DATE: date = date(2022, 11, 29)


@router.get(
    "/search",
    response_model=StockSearchResponse,
    summary="Search dataset-backed assets",
    description="Search the local asset catalog by ISIN, asset name, or short name.",
)
async def search_assets(q: str = Query(..., min_length=1), limit: int = Query(10, ge=1, le=50)):
    try:
        results = dataset_service.search_assets(q.strip(), limit)
        return StockSearchResponse(
            results=[
                StockSearchResult(symbol=item["symbol"], name=item["name"], isin=item.get("isin"))
                for item in results
            ]
        )
    except Exception as error:  # pragma: no cover - defensive logging
        logger.error("Dataset asset search failed for query %s: %s", q, error)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search dataset assets: {error}",
        )


@router.post(
    "/historical-series",
    response_model=DatasetHistoricalSeriesResponse,
    summary="Get dataset-backed historical series",
    description="Fetch historical close prices for a list of ISINs using the local datasets.",
)
async def get_historical_series(request: DatasetHistoricalSeriesRequest):
    try:
        try:
            start_date = datetime.strptime(request.startDate, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid startDate format. Use YYYY-MM-DD.",
            )

        if start_date > LATEST_AVAILABLE_DATE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"startDate cannot be after {LATEST_AVAILABLE_DATE.isoformat()}.",
            )

        if request.endDate:
            try:
                end_date = datetime.strptime(request.endDate, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid endDate format. Use YYYY-MM-DD.",
                )
            if end_date > LATEST_AVAILABLE_DATE:
                end_date = LATEST_AVAILABLE_DATE
        else:
            end_date = LATEST_AVAILABLE_DATE

        if start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="startDate cannot be after endDate.",
            )

        series_payload = dataset_service.get_historical_series(
            request.isins,
            start_date=start_date,
            end_date=end_date,
        )

        series_items = [
            HistoricalSeriesItem(
                symbol=item["symbol"],
                prices=[
                    HistoricalSeriesPoint(date=point["date"], price=point["price"])
                    for point in item.get("prices", [])
                ],
                isin=item.get("isin"),
                name=item.get("name"),
            )
            for item in series_payload
        ]

        return DatasetHistoricalSeriesResponse(series=series_items)
    except HTTPException:
        raise
    except Exception as error:  # pragma: no cover - defensive logging
        logger.error(
            "Dataset historical series failed for %s: %s",
            ", ".join(request.isins),
            error,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dataset historical series: {error}",
        )
