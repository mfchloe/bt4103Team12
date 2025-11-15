import logging
from datetime import date, datetime
from typing import List

import pandas as pd
from fastapi import APIRouter, HTTPException, Query, status

from models.stock_model import (
    BatchStockPriceRequest,
    BatchStockPriceResponse,
    DatasetHistoricalSeriesRequest,
    DatasetHistoricalSeriesResponse,
    HistoricalSeriesItem,
    HistoricalSeriesPoint,
    HistoricalPriceResponse,
    StockSearchResponse,
    StockSearchResult,
    StockPriceResponse,
    LatestSnapshotResponse,
)
from services.dataset_time_series_service import DatasetTimeSeriesService
from services import far_service
from schemas import DatasetRecommendationsResponse, DatasetRecommendationItem

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


@router.get(
    "/{symbol}",
    response_model=StockPriceResponse,
    summary="Get dataset-backed latest price for a symbol",
)
async def get_latest_price(symbol: str):
    info = dataset_service.get_symbol_info(symbol)
    if not info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Symbol {symbol} not found in dataset.",
        )

    latest_price = dataset_service.get_latest_price_for_symbol(symbol)
    if latest_price is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Latest price unavailable for {symbol}.",
        )

    return StockPriceResponse(
        symbol=info.get("symbol") or symbol.upper(),
        name=info.get("name") or info.get("symbol") or symbol.upper(),
        currentPrice=latest_price,
    )


@router.get(
    "/{symbol}/latest-snapshot",
    response_model=LatestSnapshotResponse,
    summary="Get dataset-backed latest price metadata for a symbol",
)
async def get_latest_snapshot(symbol: str):
    snapshot = dataset_service.get_latest_snapshot_for_symbol(symbol)
    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Latest snapshot unavailable for {symbol}.",
        )
    return LatestSnapshotResponse(**snapshot)


@router.get(
    "/{symbol}/historical-price",
    response_model=HistoricalPriceResponse,
    summary="Get dataset-backed historical close price for a symbol",
)
async def get_historical_price(symbol: str, date: str = Query(..., description="YYYY-MM-DD date")):
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD.",
        )

    if target_date > LATEST_AVAILABLE_DATE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Date cannot be after {LATEST_AVAILABLE_DATE.isoformat()}.",
        )

    price_info = dataset_service.get_price_for_symbol_on_date(symbol, target_date)
    if not price_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No price found for {symbol} on or before {date}.",
        )

    return HistoricalPriceResponse(
        symbol=price_info["symbol"],
        requestedDate=target_date.isoformat(),
        priceDate=price_info["price_date"].isoformat(),
        price=price_info["price"],
    )


@router.post(
    "/batch",
    response_model=BatchStockPriceResponse,
    summary="Get latest dataset-backed prices for multiple symbols",
)
async def get_batch_latest_prices(request: BatchStockPriceRequest):
    if not request.symbols:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No symbols provided.",
        )

    normalized_symbols = [symbol.strip().upper() for symbol in request.symbols if symbol]
    prices = dataset_service.get_latest_prices_for_symbols(normalized_symbols)
    return BatchStockPriceResponse(prices=prices)


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
                predictedSharpe=item.get("predictedSharpe"),
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


@router.get(
    "/recommendations",
    response_model=DatasetRecommendationsResponse,
    summary="Get dataset-backed portfolio recommendations",
)
def get_dataset_recommendations(
    limit: int = Query(4, ge=1, le=20),
):
    try:
        dfs = far_service.load_dataframes()
        tx_df = dfs.get("transactions")
        if tx_df is None or tx_df.empty:
            return DatasetRecommendationsResponse(items=[])
        if "ISIN" not in tx_df.columns:
            return DatasetRecommendationsResponse(items=[])

        working = tx_df.copy()
        working = working[working["ISIN"].notna()]
        if working.empty:
            return DatasetRecommendationsResponse(items=[])

        if "totalValue" in working.columns:
            working["totalValue"] = pd.to_numeric(working["totalValue"], errors="coerce")
        else:
            working["totalValue"] = pd.to_numeric(working.get("value"), errors="coerce")
        if "units" in working.columns:
            working["units"] = pd.to_numeric(working["units"], errors="coerce")
        else:
            working["units"] = pd.to_numeric(working.get("quantity"), errors="coerce")

        aggregates = (
            working.groupby("ISIN")
            .agg(total_value=("totalValue", "sum"), total_units=("units", "sum"))
            .reset_index()
            .sort_values("total_value", ascending=False)
        )

        items: List[DatasetRecommendationItem] = []
        seen_symbols = set()

        for _, row in aggregates.iterrows():
            isin = row["ISIN"]
            asset = dataset_service.get_asset_info_by_isin(isin)
            if not asset:
                continue
            symbol = (asset.get("symbol") or "").upper()
            if not symbol or symbol in seen_symbols:
                continue

            latest_price = dataset_service.get_latest_price_for_symbol(symbol)
            items.append(
                DatasetRecommendationItem(
                    symbol=symbol,
                    name=asset.get("name") or symbol,
                    isin=asset.get("isin") or isin,
                    latestPrice=latest_price,
                    totalValue=float(row.total_value or 0),
                    totalUnits=float(row.total_units or 0),
                )
            )
            seen_symbols.add(symbol)
            if len(items) >= limit:
                break

        return DatasetRecommendationsResponse(items=items)
    except HTTPException:
        raise
    except Exception as error:
        logger.error("Failed to build dataset recommendations: %s", error)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get recommendations: {error}",
        )
