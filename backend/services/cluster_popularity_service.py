# backend/services/cluster_popularity_service.py

import math
import os
from functools import lru_cache
from typing import Optional

import pandas as pd

from models.forecast_sharpe_ratio import forecast_sharpe_ratio
from services.dataset_time_series_service import DatasetTimeSeriesService

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATASETS_DIR = os.path.join(BASE_DIR, "datasets")
PROCESSED_DATA_DIR = os.path.join(DATASETS_DIR, "processed_data")
SHARPE_PREDICTIONS_PATH = os.path.join(PROCESSED_DATA_DIR, "predictions.csv")
SHARPE_COVARIANCE_PATH = os.path.join(PROCESSED_DATA_DIR, "covariance.csv")
SHARPE_CLOSE_PRICES_PATH = os.path.join(DATASETS_DIR, "close_prices.csv")

CUSTOMER_INFO_PATH = os.path.join(
    DATASETS_DIR,
    "customer_information_engineered_kMeans.csv",
)

TX_PATH = os.path.join(
    DATASETS_DIR,
    "customer_transactions.csv",
)

_dataset_service = DatasetTimeSeriesService()


@lru_cache(maxsize=4096)
def _get_asset_display_info(isin: str) -> dict:
    """
    Returns cached metadata so we can show human-readable names in fallbacks.
    """
    normalized = (isin or "").strip()
    if not normalized:
        return {}

    try:
        info = _dataset_service.get_asset_info_by_isin(normalized)
    except Exception:
        return {}

    return info or {}


@lru_cache(maxsize=4096)
def _get_predicted_sharpe(isin: str) -> Optional[float]:
    normalized = (isin or "").strip()
    if not normalized:
        return None

    try:
        value = forecast_sharpe_ratio(
            normalized,
            predictions_path=SHARPE_PREDICTIONS_PATH,
            covariance_path=SHARPE_COVARIANCE_PATH,
            close_prices_path=SHARPE_CLOSE_PRICES_PATH,
        )
    except Exception:
        return None

    try:
        value = float(value)
    except (TypeError, ValueError):
        return None

    return value if math.isfinite(value) else None


@lru_cache(maxsize=1)
def load_top_assets_by_cluster():
    """
    Returns:
        dict[int, list[dict]]:
        {
          0: [{ "symbol": "XYZ", "score": 123 }, ...],
          1: [...],
          2: [...]
        }
    """
    # customerID -> cluster
    info = pd.read_csv(CUSTOMER_INFO_PATH, usecols=["customerID", "cluster"])

    # Only keep buys for popularity
    tx = pd.read_csv(
        TX_PATH,
        usecols=["customerID", "ISIN", "transactionType", "totalValue"],
    )
    tx["transactionType"] = tx["transactionType"].str.upper()
    tx = tx[tx["transactionType"] == "BUY"].copy()

    # Merge to attach cluster
    merged = tx.merge(info, on="customerID", how="inner")

    if merged.empty:
        return {}

    # Popularity signals: unique customers, trades, total value
    grouped = (
        merged.groupby(["cluster", "ISIN"])
        .agg(
            unique_customers=("customerID", "nunique"),
            trade_count=("ISIN", "size"),
            total_value=("totalValue", "sum"),
        )
        .reset_index()
    )

    # Define a composite popularity score
    # You can tune weights; this is readable and monotonic.
    grouped["popularity_score"] = (
        grouped["unique_customers"] * 3
        + grouped["trade_count"] * 1
        + (grouped["total_value"] / (10_000))  # scale down
    )

    # Sort within each cluster
    grouped = grouped.sort_values(
        ["cluster", "popularity_score"],
        ascending=[True, False],
    )

    top_assets_by_cluster = {}
    for cluster_id, sub in grouped.groupby("cluster"):
        assets = []
        for _, row in sub.iterrows():
            isin = str(row["ISIN"]).strip()
            if not isin:
                continue
            assets.append(
                {
                    "symbol": isin,      # using ISIN as symbol for now
                    "score": float(row["popularity_score"]),
                }
            )
        # Keep more than 10 so we can filter out overlaps with portfolio later
        top_assets_by_cluster[int(cluster_id)] = assets[:100]

    return top_assets_by_cluster


def get_top_assets_for_cluster(cluster_id: int, existing_portfolio, top_k: int = 10):
    """
    Returns a list shaped like your existing model output:
      [ [symbol, name, similarityScore, sharpeRatio], ... ]
    For fallback we don't have model scores, so we fill reasonable placeholders.
    """
    existing_set = {s.strip().upper() for s in (existing_portfolio or []) if isinstance(s, str)}

    all_by_cluster = load_top_assets_by_cluster()
    candidates = all_by_cluster.get(int(cluster_id), [])

    score_values = [asset["score"] for asset in candidates]
    score_max = max(score_values) if score_values else 0.0

    recs = []
    for asset in candidates:
        symbol = asset["symbol"]
        if symbol.upper() in existing_set:
            continue

        asset_info = _get_asset_display_info(symbol)
        display_name = (
            (asset_info.get("name") or asset_info.get("symbol"))
            if asset_info
            else None
        )

        similarity_raw = asset["score"] / score_max if score_max > 0 else 0.0
        similarity_score = max(0.0, min(1.0, similarity_raw))

        sharpe_value = _get_predicted_sharpe(symbol)

        recs.append([
            symbol,                 # keep ISIN as the identifier/symbol
            display_name or symbol, # show company/asset name when possible
            round(similarity_score, 4),
            round(sharpe_value, 3) if sharpe_value is not None else 0.0,
        ])

        if len(recs) >= top_k:
            break

    if not recs:
        return recs

    # Sort by Sharpe (desc), fallback to similarity if Sharpe ties or missing
    recs.sort(
        key=lambda entry: (
            entry[3]
            if isinstance(entry[3], (int, float)) and math.isfinite(entry[3])
            else float("-inf"),
            entry[2],
        ),
        reverse=True,
    )

    return recs[:top_k]
