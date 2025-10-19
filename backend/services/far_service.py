from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from typing import Dict, Optional

import pandas as pd
import numpy as np

# Resolve datasets directory robustly (supports both backend/datasets and repo_root/datasets)
BACKEND_ROOT = os.path.dirname(os.path.dirname(__file__))
DATASET_DIRS = [
    os.path.join(BACKEND_ROOT, "datasets"),
    os.path.join(os.getcwd(), "datasets"),
]



@dataclass
class DatasetPaths:
    customers: Optional[str]
    transactions: Optional[str]
    assets: Optional[str]
    markets: Optional[str]
    close_prices: Optional[str]



def _detect_file(prefix: str) -> Optional[str]:
    # prefers parquet over csv if both exist; search multiple candidate dirs
    for base in DATASET_DIRS:
        parquet_path = os.path.join(base, f"{prefix}.parquet")
        csv_path = os.path.join(base, f"{prefix}.csv")
        if os.path.exists(parquet_path):
            return parquet_path
        if os.path.exists(csv_path):
            return csv_path
    return None


@lru_cache(maxsize=1)
def detect_datasets() -> DatasetPaths:
    # Customers
    customers = (
        _detect_file("customer_information_with_engineered_df")
        or _detect_file("customer_information_with_engineered")
    )

    # Transactions
    transactions = (
        _detect_file("transactions_df")
        or _detect_file("transactions")
        or _detect_file("customer_transactions")
    )

    # Assets
    assets = (
        _detect_file("asset_information_with_engineered")
        or _detect_file("asset_infomration_with_engineered")  # typo
    )

    # Markets
    markets = _detect_file("markets") or _detect_file("market_info")

    # Close prices
    close_prices = _detect_file("close_prices") or _detect_file("asset_prices")

    return DatasetPaths(
        customers=customers,
        transactions=transactions,
        assets=assets,
        markets=markets,
        close_prices=close_prices,
    )

def _read_df(path: str) -> pd.DataFrame:
    if path.endswith(".parquet"):
        return pd.read_parquet(path)
    return pd.read_csv(path)


@lru_cache(maxsize=1)
@lru_cache(maxsize=1)
def load_dataframes() -> Dict[str, pd.DataFrame]:
    paths = detect_datasets()
    dfs: Dict[str, pd.DataFrame] = {}
    
    if paths.customers:
        cust_df = _read_df(paths.customers)
        for col in ["timestamp", "lastQuestionnaireDate"]:
            if col in cust_df.columns:
                cust_df[col] = pd.to_datetime(cust_df[col], errors="coerce")
        dfs["customers"] = cust_df
        
    if paths.transactions:
        tx_df = _read_df(paths.transactions)
        for col in ["date", "txn_date", "transaction_date"]:
            if col in tx_df.columns:
                tx_df[col] = pd.to_datetime(tx_df[col], errors="coerce")
                break
        dfs["transactions"] = tx_df
        
    if paths.assets:
        asset_df = _read_df(paths.assets)
        dfs["assets"] = asset_df
        
    if paths.markets:
        market_df = _read_df(paths.markets)
        dfs["markets"] = market_df
        
    if paths.close_prices:
        price_df = _read_df(paths.close_prices)
        price_df["timestamp"] = pd.to_datetime(price_df["timestamp"], errors="coerce")
        dfs["close_prices"] = price_df

    return dfs


def reset_cache() -> None:
    """Clear cached dataset detection and loaded dataframes."""
    try:
        detect_datasets.cache_clear()  # type: ignore[attr-defined]
    except Exception:
        pass
    try:
        load_dataframes.cache_clear()  # type: ignore[attr-defined]
    except Exception:
        pass


# def _parse_capacity_to_value(capacity_str: Optional[str]) -> Optional[float]:
#     if not isinstance(capacity_str, str):
#         return None
#     import re
#     s = capacity_str.replace("€", "").replace(",", "").replace("_", " ").strip().lower()
#     try:
#         # Extract numeric tokens with optional k/m suffix, e.g., 30k, 300k, 1m
#         tokens = re.findall(r"(\d+)\s*([km]?)", s)
#         nums = []
#         for num, suf in tokens:
#             val = float(num)
#             if suf == "k":
#                 val *= 1_000
#             elif suf == "m":
#                 val *= 1_000_000
#             nums.append(val)
#         if nums:
#             return max(nums)  # use upper bound for range bands
#         # Handle textual hints
#         if "lt" in s and tokens:
#             return float(nums[0])
#         if "+" in s and tokens:
#             return float(nums[0])
#         return None
#     except Exception:
#         return None


# def _apply_filters(df: pd.DataFrame, filters: dict, dataset_type: str = "customer") -> pd.DataFrame:
#     if df is None or df.empty:
#         return df.copy()

#     out = df.copy()

#     # Map incoming filter keys to dataset columns
#     mapping = {}
#     if dataset_type == "customer":
#         mapping = {
#             "customer_type": ["customerType"],
#             "investor_type": ["investor_type"],
#             "risk_level": ["riskLevel"],
#             # "investment_capacity": ['investmentCapacity']
#         }
#         sector_col = "preferred_sector"
#     elif dataset_type == "asset":
#         mapping = {
#             "investor_type": ["investor_type"],  # optional
#         }
#         sector_col = "sector"
#     else:
#         sector_col = None

#     # Categorical filters
#     for key, candidates in mapping.items():
#         values = (filters or {}).get(key)
#         if values:
#             present_col = next((c for c in candidates if c in out.columns), None)
#             if present_col:
#                 values_l = set(str(v).lower() for v in values)
#                 col_l = out[present_col].astype(str).str.lower()
#                 out = out[col_l.isin(values_l)]

#     # Sector filter
#     sectors = (filters or {}).get("sectors")
#     if sectors and sector_col and sector_col in out.columns:
#         sectors_l = set(str(v).lower() for v in sectors)
#         out = out[out[sector_col].astype(str).str.lower().isin(sectors_l)]

#     # Numeric filter: investmentCapacity
#     capacity = (filters or {}).get("investmentCapacity")
#     if capacity and "investmentCapacity" in out.columns:
#         minimum = capacity.get("minimum")
#         maximum = capacity.get("maximum")
#         parsed = out["investmentCapacity"].map(_parse_capacity_to_value)
#         mask = pd.Series(True, index=out.index)
#         if minimum is not None:
#             mask &= parsed >= minimum
#         if maximum is not None:
#             mask &= parsed <= maximum
#         mask = mask.fillna(False)
#         out = out[mask]

#     # Date filter
#     date_range = (filters or {}).get("date_range")
#     date_col = next((c for c in ["date", "txn_date", "transaction_date", "timestamp", "lastQuestionnaireDate"] if c in out.columns), None)
#     if date_range and date_col:
#         start = date_range.get("start")
#         end = date_range.get("end")
#         if start:
#             out = out[pd.to_datetime(out[date_col], errors="coerce") >= pd.to_datetime(start)]
#         if end:
#             out = out[pd.to_datetime(out[date_col], errors="coerce") <= pd.to_datetime(end)]

#     return out

# updated
def _parse_capacity_to_value(capacity_str: Optional[str]) -> Optional[float]:
    if not isinstance(capacity_str, str):
        return None
    import re
    s = capacity_str.replace("€", "").replace(",", "").replace("_", " ").strip().lower()
    try:
        # Extract numeric tokens with optional k/m suffix, e.g., 30k, 300k, 1m
        tokens = re.findall(r"(\d+)\s*([km]?)", s)
        nums = []
        for num, suf in tokens:
            val = float(num)
            if suf == "k":
                val *= 1_000
            elif suf == "m":
                val *= 1_000_000
            nums.append(val)
        if nums:
            return max(nums)  # use upper bound for range bands
        # Handle textual hints
        if "lt" in s and tokens:
            return float(nums[0])
        if "+" in s and tokens:
            return float(nums[0])
        return None
    except Exception:
        return None


def _capacity_matches_filter(capacity_str: str, filter_values: list) -> bool:
    """
    Check if a capacity string matches any of the filter values.
    Groups Predicted_ versions with actual versions.
    
    Examples:
        capacity_str: "CAP_LT30K" or "Predicted_CAP_LT30K"
        filter_values: ["CAP_LT30K"]
        Returns: True for both cases
    """
    if not isinstance(capacity_str, str):
        return False
    
    # Normalize: remove "Predicted_" prefix if present
    normalized = capacity_str.replace("Predicted_", "").upper()
    
    # Check if normalized version matches any filter value
    for filter_val in filter_values:
        if filter_val.upper() in normalized:
            return True
    
    return False


def _apply_filters(df: pd.DataFrame, filters: dict, dataset_type: str = "customer") -> pd.DataFrame:
    if df is None or df.empty:
        return df.copy()
    
    out = df.copy()
    
    # Map incoming filter keys to dataset columns
    mapping = {}
    if dataset_type == "customer":
        mapping = {
            "customer_type": ["customerType"],
            "investor_type": ["investor_type"],
            "risk_level": ["riskLevel"],
        }
        sector_col = "preferred_sector"
    elif dataset_type == "asset":
        mapping = {
            "investor_type": ["investor_type"],  # optional
        }
        sector_col = "sector"
    else:
        sector_col = None
    
    # Categorical filters
    for key, candidates in mapping.items():
        values = (filters or {}).get(key)
        if values:
            present_col = next((c for c in candidates if c in out.columns), None)
            if present_col:
                values_l = set(str(v).lower() for v in values)
                col_l = out[present_col].astype(str).str.lower()
                out = out[col_l.isin(values_l)]
    
    # Sector filter
    sectors = (filters or {}).get("sectors")
    if sectors and sector_col and sector_col in out.columns:
        sectors_l = set(str(v).lower() for v in sectors)
        out = out[out[sector_col].astype(str).str.lower().isin(sectors_l)]
    
    # Investment Capacity filter (categorical)
    capacity_filters = (filters or {}).get("investment_capacity")
    if capacity_filters and "investmentCapacity" in out.columns:
        # Use categorical matching that groups Predicted_ with actual
        mask = out["investmentCapacity"].apply(
            lambda x: _capacity_matches_filter(x, capacity_filters)
        )
        out = out[mask]
    
    # Date filter
    date_range = (filters or {}).get("date_range")
    date_col = next((c for c in ["date", "txn_date", "transaction_date", "timestamp", "lastQuestionnaireDate"] if c in out.columns), None)
    if date_range and date_col:
        start = date_range.get("start")
        end = date_range.get("end")
        if start:
            out = out[pd.to_datetime(out[date_col], errors="coerce") >= pd.to_datetime(start)]
        if end:
            out = out[pd.to_datetime(out[date_col], errors="coerce") <= pd.to_datetime(end)]
    
    return out

def get_metrics(filters: dict) -> dict:
    dfs = load_dataframes()
    cust = dfs.get("customers")
    if cust is None or cust.empty:
        return {
            "customers": 0,
            "avg_transactions_per_month": None,
            "avg_transactions_per_week": None,
            "median_days_since_last_buy": None,
            "avg_trading_activity_ratio": None,
            "total_net_cash_flow": None,
            "total_industries_bought": 0,
            "total_asset_categories_bought": 0,
        }

    # apply filters
    cust_f = _apply_filters(cust, filters)
    n_customers = len(cust_f)

    avg_tx_month = cust_f["avg_transactions_per_month"].mean() if "avg_transactions_per_month" in cust_f.columns else None
    avg_tx_week = cust_f["avg_transactions_per_week"].mean() if "avg_transactions_per_week" in cust_f.columns else None
    avg_trading_ratio = cust_f["trading_activity_ratio"].mean() if "trading_activity_ratio" in cust_f.columns else None

    # count unique industries and asset categories across all customers
    total_industries_bought = cust_f["preferred_industry"].nunique() if "preferred_industry" in cust_f.columns else 0

    return {
        "customers": int(n_customers),
        "avg_transactions_per_month": float(avg_tx_month) if avg_tx_month is not None else None,
        "avg_transactions_per_week": float(avg_tx_week) if avg_tx_week is not None else None,
        "avg_trading_activity_ratio": float(avg_trading_ratio) if avg_trading_ratio is not None else None,
        "total_industries_bought": int(total_industries_bought),
    }


def get_top_assets(filters: dict, top_n: int = 10) -> dict:
    dfs = load_dataframes()
    cust = dfs.get("customers")
    tx = dfs.get("transactions")
    assets = dfs.get("assets")
    if tx is None or tx.empty or cust is None or cust.empty or assets is None:
        return {"rows": []}
    
    cust_f = _apply_filters(cust, filters)
    if cust_f.empty:
        return {"rows": []}
    
    cust_id_col = "customerID" 
    cust_ids = set(cust_f[cust_id_col]) if cust_id_col else set()
    
    tx_f = _apply_filters(tx, filters)
    if cust_id_col and cust_id_col in tx_f.columns and cust_ids:
        tx_f = tx_f[tx_f[cust_id_col].isin(cust_ids)]
    
    # Join with assets to get asset name/category
    if "ISIN" in tx_f.columns and "ISIN" in assets.columns:
        tx_f = tx_f.merge(assets[["ISIN", "assetName", "assetShortName", "assetCategory"]], on="ISIN", how="left")
        tx_f["asset"] = tx_f["assetName"].fillna(tx_f["ISIN"])
    
    if "asset" not in tx_f.columns:
        return {"rows": []}
    
    # Compute adoption/lift as before
    cohort_asset_adopters = tx_f.groupby("asset")[cust_id_col].nunique() if cust_id_col in tx_f.columns else tx_f.groupby("asset").size()
    cohort_size = len(cust_f)
    
    pop_asset_adopters = tx.groupby("ISIN")[cust_id_col].nunique() if cust_id_col in tx.columns else tx.groupby("ISIN").size()
    pop_customers = len(cust) if cust is not None else None
    
    df = pd.concat([cohort_asset_adopters.rename("cohort_buyers"), pop_asset_adopters.rename("pop_buyers")], axis=1).fillna(0)
    
    rows = []
    for asset, rec in df.sort_values(by="cohort_buyers", ascending=False).head(top_n).iterrows():
        cohort_count = rec.get("cohort_buyers", 0)
        pop_count = rec.get("pop_buyers", 1)
        adoption_rate = float(cohort_count) / float(cohort_size) if cohort_size else 0.0
        lift = (float(cohort_count)/cohort_size)/(pop_count/pop_customers) if pop_customers and pop_count > 0 and cohort_size > 0 else None
        rows.append({
            "asset": asset,
            "adoption_rate": float(adoption_rate),
            "lift": float(lift) if lift is not None else None
        })
    return {"rows": rows}



def get_sector_prefs(filters: dict) -> dict:
    dfs = load_dataframes()
    cust = dfs.get("customers")
    tx = dfs.get("transactions")
    rows = []

    # Helper to compute adoption and lift
    def compute_rows(by_sector: pd.Series, pop_by_sector: pd.Series, cohort_size: int, pop_customers: int):
        result = []
        for sector, count in by_sector.sort_values(ascending=False).items():
            adoption = float(count) / cohort_size if cohort_size else 0.0
            pop_adoption = float(pop_by_sector.get(sector, 0)) / pop_customers if pop_customers else 0.0
            lift = (adoption / pop_adoption) if pop_adoption > 0 else None
            result.append({"sector": sector, "adoption_rate": adoption, "lift": lift})
        return result

    # Case 1: Use transactions if available
    if tx is not None and not tx.empty and "sector" in tx.columns:
        tx_f = _apply_filters(tx, filters)
        if tx_f.empty:
            return {"rows": []}

        # Compute counts
        cohort_size = len(cust) if cust is not None else 0
        by_sector = tx_f.groupby("sector")["customerID"].nunique() if "customerID" in tx_f.columns else tx_f.groupby("sector").size()
        pop_by_sector = tx.groupby("sector")["customerID"].nunique() if cust is not None and "customerID" in tx.columns else tx.groupby("sector").size()
        pop_customers = len(cust) if cust is not None else 0
        rows = compute_rows(by_sector, pop_by_sector, cohort_size, pop_customers)
        return {"rows": rows}

    # Case 2: fallback to customers' preferred sector
    if cust is None or cust.empty or "preferred_sector" not in cust.columns:
        return {"rows": []}

    cust_f = _apply_filters(cust, filters)
    if cust_f.empty:
        return {"rows": []}

    cohort_size = len(cust_f)
    by_sector = cust_f["preferred_sector"].dropna().value_counts()
    pop_by_sector = cust["preferred_sector"].dropna().value_counts()
    pop_customers = len(cust)
    rows = compute_rows(by_sector, pop_by_sector, cohort_size, pop_customers)

    return {"rows": rows}


def get_activity_series(filters: dict, interval: str = "month") -> dict:
    dfs = load_dataframes()
    tx = dfs.get("transactions")

    if tx is None or tx.empty:
        return {"rows": []}

    # Apply filters
    tx_f = _apply_filters(tx, filters)

    # Pick the date column
    date_col = next((c for c in ["date", "txn_date", "transaction_date", "timestamp"] if c in tx_f.columns), None)
    if not date_col:
        return {"rows": []}

    # Convert to datetime
    df = tx_f[[date_col, "customerID"]].copy()
    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    df = df.dropna(subset=[date_col])

    if df.empty:
        return {"rows": []}

    # determine min/max dates to bound the resampling
    start_date = df[date_col].min()
    end_date = df[date_col].max()

    # choose frequency
    rule = {"day": "D", "week": "W", "month": "MS", "quarter": "QS", "year": "YS"}.get(interval, "MS")

    # create a complete date range within the dataset's timeframe
    full_index = pd.date_range(start=start_date, end=end_date, freq=rule)

    # group by period
    grouped = df.set_index(date_col).sort_index().groupby(pd.Grouper(freq=rule))
    series = grouped.size().reindex(full_index, fill_value=0).rename("buy_volume").to_frame()

    if "customerID" in df.columns:
        unique_buyers = grouped["customerID"].nunique().reindex(full_index, fill_value=0)
        series["unique_buyers"] = unique_buyers
    else:
        series["unique_buyers"] = series["buy_volume"]

    rows = [
        {"period": idx.strftime("%Y-%m"), "buy_volume": int(r.buy_volume), "unique_buyers": int(r.unique_buyers)}
        for idx, r in series.iterrows()
    ]
    return {"rows": rows}


def get_scatter_sample(filters: dict, limit: int = 5000) -> dict:
    dfs = load_dataframes()
    cust = dfs.get("customers")
    if cust is None or cust.empty:
        return {"rows": []}
    cust_f = _apply_filters(cust, filters)
    if cust_f.empty:
        return {"rows": []}
    # choose columns if present
    cols = [c for c in ["days_since_last_buy", "avg_transactions_per_month", "investor_type", "portfolio_value"] if c in cust_f.columns]
    sample = cust_f[cols].dropna().sample(n=min(limit, len(cust_f)), random_state=42) if cols else pd.DataFrame()
    rows = []
    for _, r in sample.iterrows():
        rows.append({
            "days_since_last_buy": float(r.get("days_since_last_buy")) if "days_since_last_buy" in sample.columns else None,
            "avg_transactions_per_month": float(r.get("avg_transactions_per_month")) if "avg_transactions_per_month" in sample.columns else None,
            "investor_type": r.get("investor_type") if "investor_type" in sample.columns else None,
            "portfolio_value": float(r.get("portfolio_value")) if "portfolio_value" in sample.columns else None,
        })
    return {"rows": rows}


def explain_asset(filters: dict, isin: str) -> dict:
    dfs = load_dataframes()
    cust = dfs.get("customers")
    tx = dfs.get("transactions")
    assets = dfs.get("assets")

    if tx is None or tx.empty or assets is None or assets.empty:
        return {
            "adoption_rate": None,
            "lift": None,
            "recent_momentum": None,
            "similar_customer_count": 0,
            "median_holding_days": None,
            "churn_pct_30d": None,
            "asset_name": None,
            "asset_category": None,
            "notes": "No transactions or assets data",
        }

    # Filter customers
    cust_f = _apply_filters(cust, filters) if cust is not None else None
    cohort_size = len(cust_f) if cust_f is not None else 0

    # Filter transactions for this ISIN
    tx_f = _apply_filters(tx, filters)
    tx_isin = tx_f[tx_f.get("ISIN") == isin]

    # Join asset info
    asset_info = assets[assets["ISIN"] == isin]
    asset_name = asset_info["assetName"].iloc[0] if not asset_info.empty else None
    asset_category = asset_info["assetCategory"].iloc[0] if not asset_info.empty else None

    # Compute adoption/lift
    adoption_rate = float(tx_isin["customerID"].nunique()) / cohort_size if cohort_size and "customerID" in tx_isin.columns else None
    pop_adoption = float(tx[tx.get("ISIN") == isin]["customerID"].nunique()) / len(cust) if cust is not None else None
    lift = adoption_rate / pop_adoption if adoption_rate is not None and pop_adoption else None

    # Compute recent momentum
    date_col = next((c for c in ["date", "txn_date", "transaction_date"] if c in tx_isin.columns), None)
    recent_momentum = None
    if date_col and not tx_isin.empty:
        ts = tx_isin.set_index(date_col).resample("M").size()
        if len(ts) >= 2:
            recent = ts.tail(3).mean()
            prior = ts.iloc[:-3].median() if len(ts) > 3 else ts.iloc[0]
            recent_momentum = float(recent - prior) / max(prior, 1.0)

    return {
        "adoption_rate": adoption_rate,
        "lift": lift,
        "recent_momentum": recent_momentum,
        "similar_customer_count": cohort_size,
        "median_holding_days": None,
        "churn_pct_30d": None,
        "asset_name": asset_name,
        "asset_category": asset_category,
        "notes": None,
    }



def get_histogram(filters: dict, column: str, bins: int = 20) -> dict:
    dfs = load_dataframes()
    cust = dfs.get("customers")
    if cust is None or cust.empty or column not in cust.columns:
        return {"bins": []}
    cust_f = _apply_filters(cust, filters)
    series = pd.to_numeric(cust_f[column], errors="coerce").dropna()
    if series.empty:
        return {"bins": []}
    counts, edges = np.histogram(series.values, bins=bins)
    bins_out = []
    for i in range(len(counts)):
        bins_out.append({
            "bin_start": float(edges[i]),
            "bin_end": float(edges[i+1]),
            "count": int(counts[i]),
        })
    return {"bins": bins_out}


def get_category_breakdown(filters: dict, column: str, top_n: int = 20) -> dict:
    dfs = load_dataframes()
    cust = dfs.get("customers")
    if cust is None or cust.empty or column not in cust.columns:
        return {"rows": []}

    # apply filters first
    cust_f = _apply_filters(cust, filters)

    # fallback: if sectors filter exists but we dropped everything, include all rows for category breakdown
    if cust_f.empty and 'sectors' in (filters or {}):
        cust_f = cust.copy()

    counts = (
        cust_f[column].dropna().astype(str).value_counts().head(top_n)
    )
    rows = [{"label": k, "value": int(v)} for k, v in counts.items()]
    return {"rows": rows}



