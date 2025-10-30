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
        or _detect_file("customer_information_engineered_kMeans")
    )

    # Transactions
    transactions = (
        _detect_file("transactions_df")
        or _detect_file("transactions")
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

def get_filtered_transactions(filters: dict) -> pd.DataFrame:
    """
    Returns transactions filtered by customer filters,
    with optional customer metadata merged if needed.
    """
    dfs = load_dataframes()
    cust = dfs.get("customers")
    tx = dfs.get("transactions")

    if cust is None or cust.empty or tx is None or tx.empty:
        return pd.DataFrame()  # nothing to return

    # 1. Filter customers first
    cust_f = _apply_filters(cust, filters)
    if cust_f.empty:
        return pd.DataFrame()  # no matching customers

    cust_ids = set(cust_f["customerID"])

    # 2. Filter transactions by customer IDs
    tx_f = tx[tx["customerID"].isin(cust_ids)].copy()
    if tx_f.empty:
        return pd.DataFrame()  # no transactions for filtered customers

    # 3. Merge customer metadata only if needed (e.g., cluster)
    metadata_cols = [col for col in ["cluster", "customerType"] if col in cust_f.columns]
    if metadata_cols:
        tx_f = tx_f.merge(
            cust_f[["customerID"] + metadata_cols],
            on="customerID",
            how="left"
        )

    return tx_f


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


# Helper: Derive name of stock
def _pick_stock(row):
    short_name = row.get("assetShortName")
    if isinstance(short_name, str) and short_name.strip():
        return short_name.strip()
    
    long_name = row.get("assetName")
    if isinstance(long_name, str) and long_name.strip():
        return long_name.strip()
    
    isin = row.fer("ISIN")
    if isinstance(isin, str):
        return isin
    
    return ""


# Helper: Compute category label of stock
def _pick_category(row):
    category = (row.get("assetCategory")).strip() if isinstance(row.get("assetCategory"), str) else ""
    sub_category = (row.get("assetSubCategory") or "").strip() if isinstance(row.get("assetSubCategory"), str) else ""

    if category and sub_category:
        return f"{category} - {sub_category}"
    if category:
        return category
    if sub_category:
        return sub_category
    return ""


def get_customer_transactions(customer_id: str):
    dfs = load_dataframes()
    transactions_df = dfs.get("transactions")
    assets_df = dfs.get("assets")

    if transactions_df is None or transactions_df.empty:
        return []

    if assets_df is None:
        assets_df = pd.DataFrame()

    # Filter for this customer's transactions
    if "customerID" not in transactions_df.columns:
        return []
    
    tx_f = transactions_df[transactions_df["customerID"] == customer_id].copy()
    if tx_f.empty:
        return []
    
    # Merge asset metadata
    asset_columns = [col for col in ["ISIN", "assetShortName", "assetName", "assetCategory", "assetSubCategory"] if col in assets_df.columns]
    if "ISIN" not in asset_columns:
        asset_metadata = pd.DataFrame(columns=["ISIN"])
    else:
        asset_metadata = assets_df[asset_columns].copy()

    merged = tx_f.merge(
        asset_metadata,
        on="ISIN",
        how="left",
    )
    
    cutoff = pd.Timestamp("2022-10-29", tz=None)

    rows = []
    for _, r in merged.iterrows():
        # ID
        id = r.get("transactionID")

        # Date (Normalised timestamp)
        raw_timestamp = r.get("timestamp")
        date = None
        timestamp = None
        if pd.notnull(raw_timestamp):
            timestamp = pd.to_datetime(raw_timestamp, errors="coerce")
            if pd.notnull(timestamp):
                date = timestamp.strftime("%Y-%m-%d")

        if timestamp is not None and pd.notnull(timestamp) and timestamp > cutoff:
            continue

        # Stock
        stock = _pick_stock(r)

        # Category
        category = _pick_category(r)

        # Buy/Sell
        buy_or_sell = r.get("transactionType")

        # Shares
        try:
            shares = float(r.get("units"))
        except (TypeError, ValueError):
            shares = None

        # Total ($)
        try:
            total_dollars = float(r.get("totalValue"))
        except (TypeError, ValueError):
            total_dollars = None

        # Price per unit ($)
        if shares and shares != 0 and total_dollars is not None:
            price_per_unit = total_dollars / shares
        else:
            price_per_unit = None

        rows.append(
            {
                "id": id,
                "date": date,
                "stock": stock,
                "category": category,
                "buy_sell": buy_or_sell,
                "shares": shares,
                "price": round(price_per_unit, 2) if price_per_unit is not None else None,
                "total": round(total_dollars, 2) if total_dollars is not None else None,
            }
        )

    # Sort by date (newest first)
    rows.sort(key=lambda x: (x["date"] or ""), reverse=True)

    return rows

# def _parse_capacity_to_value(capacity_str: Optional[str]) -> Optional[float]:
#     if not isinstance(capacity_str, str):
#         return None
#     import re
#     s = capacity_str.replace("\u20ac", "").replace(",", "").replace("_", " ").strip().lower()
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
    s = capacity_str.replace("\u20ac", "").replace(",", "").replace("_", " ").strip().lower()
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


def _apply_filters(df: pd.DataFrame, filters: dict, dataset_type: str = "customer", exclude_cols: list = None) -> pd.DataFrame:
    """
    Apply filters to dataframe.
    
    Args:
        df: DataFrame to filter
        filters: Dictionary of filter values
        dataset_type: Type of dataset ("customer" or "asset")
        exclude_cols: List of column filter keys to exclude from filtering
    """
    if df is None or df.empty:
        return df.copy()
    
    out = df.copy()
    exclude_cols = exclude_cols or []
       
    # Map incoming filter keys to dataset columns
    mapping = {}
    if dataset_type == "customer":
        mapping = {
            "customer_type": ["customerType"],
            "investor_type": ["investor_type"],
            "risk_level": ["riskLevel"],
            "cluster": ["cluster"],
        }
        sector_col = "preferred_sector"
    elif dataset_type == "asset":
        mapping = {
            "investor_type": ["investor_type"],
        }
        sector_col = "sector"
    else:
        sector_col = None
    
    # Categorical filters (skip excluded columns)
    for key, candidates in mapping.items():
        if key in exclude_cols:
            continue
            
        values = (filters or {}).get(key)
        if values:
            present_col = next((c for c in candidates if c in out.columns), None)
            if present_col:
                # Special handling for cluster - it's int64 in dataset
                if key == "cluster":
                    # Convert filter values to integers
                    values_int = []
                    for v in values:
                        try:
                            values_int.append(int(float(v)))  # handle both "1" and 1
                        except (ValueError, TypeError):
                            print(f"Warning: Could not convert cluster value {v} to int")
                    
                    if values_int:
                        # Direct integer comparison with int64 column
                        out = out[out[present_col].isin(values_int)]
                        print(f"_apply_filters - Applied {key} filter with values {values_int}, remaining rows: {len(out)}")
                else:
                    # Regular string comparison for other categorical filters
                    values_l = set(str(v).lower() for v in values)
                    col_l = out[present_col].astype(str).str.lower()
                    out = out[col_l.isin(values_l)]
                    print(f"_apply_filters - Applied {key} filter, remaining rows: {len(out)}")
   
    # Sector filter
    if "sectors" not in exclude_cols:
        sectors = (filters or {}).get("sectors")
        if sectors and sector_col and sector_col in out.columns:
            sectors_l = set(str(v).lower() for v in sectors)
            out = out[out[sector_col].astype(str).str.lower().isin(sectors_l)]
            print(f"_apply_filters - Applied sectors filter, remaining rows: {len(out)}")
    
    # Investment Capacity filter (categorical)
    if "investment_capacity" not in exclude_cols:
        capacity_filters = (filters or {}).get("investment_capacity")
        if capacity_filters and "investmentCapacity" in out.columns:
            mask = out["investmentCapacity"].apply(
                lambda x: _capacity_matches_filter(x, capacity_filters)
            )
            out = out[mask]
            print(f"_apply_filters - Applied investment_capacity filter, remaining rows: {len(out)}")
    
    # Date filter
    if "date_range" not in exclude_cols:
        date_range = (filters or {}).get("date_range")
        date_col = next((c for c in ["date", "txn_date", "transaction_date", "timestamp", "lastQuestionnaireDate"] if c in out.columns), None)
        if date_range and date_col:
            start = date_range.get("start")
            end = date_range.get("end")
            if start:
                out = out[pd.to_datetime(out[date_col], errors="coerce") >= pd.to_datetime(start)]
            if end:
                out = out[pd.to_datetime(out[date_col], errors="coerce") <= pd.to_datetime(end)]
            print(f"_apply_filters - Applied date_range filter, remaining rows: {len(out)}")
    
    print(f"_apply_filters - Final rows: {len(out)}")
    return out


def get_category_breakdown(filters: dict, column: str, top_n: int = 20, include_clusters: bool = False) -> dict:
    """
    Get category breakdown with optional cluster info.

    Args:
        filters: Filter dict to apply (includes cluster filter if any)
        column: The categorical column to count
        top_n: Top N categories
        include_cluster: If True, returns breakdown per cluster

    Returns:
        Dict with rows: [{"label": ..., "value": ..., "cluster": ...}, ...]
    """
    dfs = load_dataframes()
    cust = dfs.get("customers")
    if cust is None or cust.empty or column not in cust.columns:
        return {"rows": []}

    # Exclude filters for the column itself to avoid circular filtering
    exclude_cols = []
    if column in ["customerType", "riskLevel"]:
        exclude_cols = ["customer_type", "risk_level", "sectors", "investment_capacity", "date_range"]

    cust_f = _apply_filters(cust, filters, exclude_cols=exclude_cols)

    if cust_f.empty:
        return {"rows": []}

    if include_clusters and "cluster" in cust_f.columns:
        # Step 1: total per column value
        total_counts = cust_f.groupby(column).size().reset_index(name="total_count")
        top_labels = total_counts.sort_values("total_count", ascending=False).head(top_n)[column].tolist()

        # Step 2: filter only top labels
        filtered = cust_f[cust_f[column].isin(top_labels)]

        # Step 3: group by column + cluster
        grouped = filtered.groupby([column, "cluster"]).size().reset_index(name="count")

        rows = [
            {"label": row[column], "value": int(row["count"]), "cluster": int(row["cluster"])}
            for _, row in grouped.iterrows()
        ]
    else:
        # Normal breakdown without cluster
        counts = cust_f[column].dropna().astype(str).value_counts().head(top_n)
        rows = [{"label": k, "value": int(v)} for k, v in counts.items()]

    return {"rows": rows}


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
    assets = dfs.get("assets")
    if assets is None or assets.empty:
        return {"rows": []}

    # Get filtered transactions with customer metadata
    tx_f = get_filtered_transactions(filters)
    if tx_f.empty:
        return {"rows": []}

    # Merge with assets
    if "ISIN" in tx_f.columns and "ISIN" in assets.columns:
        tx_f = tx_f.merge(
            assets[["ISIN", "assetName", "assetShortName", "assetCategory"]],
            on="ISIN",
            how="left"
        )
        tx_f["asset"] = tx_f["assetName"].fillna(tx_f["ISIN"])

    # Compute adoption/lift as before...
    cohort_size = tx_f["customerID"].nunique()
    pop_asset_adopters = tx_f.groupby("asset")["customerID"].nunique()
    df = pop_asset_adopters.rename("cohort_buyers").reset_index()
    rows = []
    for _, r in df.sort_values("cohort_buyers", ascending=False).head(top_n).iterrows():
        adoption_rate = r["cohort_buyers"] / cohort_size if cohort_size else 0.0
        rows.append({
            "asset": r["asset"],
            "adoption_rate": adoption_rate,
            "lift": None  # can calculate lift using full population if needed
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
        tx_f = get_filtered_transactions(filters)
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

def get_scatter_sample(filters: dict, limit: int = 5000, x_column: str = None, y_column: str = None) -> dict:
    dfs = load_dataframes()
    cust = dfs.get("customers")
    if cust is None or cust.empty:
        return {"rows": []}

    cust_f = _apply_filters(cust, filters)
    if cust_f.empty:
        return {"rows": []}

    # Use requested x and y columns if present
    cols = [col for col in [x_column, y_column, "investor_type"] if col in cust_f.columns]
    sample = cust_f[cols].dropna()

    rows = []
    for _, r in sample.iterrows():
        row = {
            "investor_type": r.get("investor_type"),
        }
        if x_column in r:
            row[x_column] = r.get(x_column)
        if y_column in r:
            row[y_column] = r.get(y_column)
        rows.append(row)

    return {"rows": rows[:limit]}


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
    tx_f = get_filtered_transactions(filters)
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


# def get_category_breakdown(filters: dict, column: str, top_n: int = 20) -> dict:
#     dfs = load_dataframes()
#     cust = dfs.get("customers")
#     if cust is None or cust.empty or column not in cust.columns:
#         return {"rows": []}

#     # apply filters first
#     cust_f = _apply_filters(cust, filters)

#     # fallback: if sectors filter exists but we dropped everything, include all rows for category breakdown
#     if cust_f.empty and 'sectors' in (filters or {}):
#         cust_f = cust.copy()

#     counts = (
#         cust_f[column].dropna().astype(str).value_counts().head(top_n)
#     )
#     rows = [{"label": k, "value": int(v)} for k, v in counts.items()]
#     return {"rows": rows}




def get_efficient_frontier(filters: dict) -> dict:
    dfs = load_dataframes()
    price_df = dfs.get("close_prices")
    assets_df = dfs.get("assets")

    if price_df is None or price_df.empty:
        return {"points": []}

    tx_filtered = get_filtered_transactions(filters)
    if tx_filtered.empty or "ISIN" not in tx_filtered.columns:
        return {"points": []}

    isins = (
        tx_filtered["ISIN"].dropna().astype(str).str.strip()
    )
    isins = isins[isins != ""].unique()
    if len(isins) == 0:
        return {"points": []}

    price_subset = price_df[price_df["ISIN"].isin(isins)].copy()
    if price_subset.empty:
        return {"points": []}

    price_subset["timestamp"] = pd.to_datetime(price_subset["timestamp"], errors="coerce")
    price_subset["closePrice"] = pd.to_numeric(price_subset["closePrice"], errors="coerce")
    price_subset = price_subset.dropna(subset=["timestamp", "closePrice"])
    if price_subset.empty:
        return {"points": []}

    pivot = (
        price_subset.pivot_table(index="timestamp", columns="ISIN", values="closePrice")
        .sort_index()
    # Build ISIN -> name and symbol mappings
    name_map: Dict[str, str] = {}
    symbol_map: Dict[str, str] = {}
    if assets_df is not None and not assets_df.empty and "ISIN" in assets_df.columns:
        subset = assets_df[assets_df["ISIN"].isin(isins)]
        for _, row in subset.iterrows():
            isin_key = str(row.get("ISIN") or "").strip()
            nm = row.get("assetName")
            if isinstance(nm, str):
                nm = nm.strip()
            name_map[isin_key] = nm if nm else None
            short = row.get("assetShortName")
            if isinstance(short, str):
                short = short.strip()
            symbol_map[isin_key] = short if short else None

    points = []
    for isin, series in pivot.items():
        series = series.dropna()
        if len(series) < 2:
            continue

        first_price = series.iloc[0]
        last_price = series.iloc[-1]
        if not pd.notna(first_price) or not pd.notna(last_price) or first_price <= 0:
            continue

        num_days = len(series)
        if num_days <= 1:
            continue

        avg_daily_return = (last_price - first_price) / (first_price * num_days)
        daily_returns = series.pct_change(fill_method=None).dropna()
        volatility = float(daily_returns.std(skipna=True) or 0.0)
        sharpe = float(avg_daily_return / volatility) if volatility > 0 else 0.0

        points.append(
            {
                "isin": isin,
                "name": name_map.get(isin),
                "symbol": symbol_map.get(isin),
                "return_daily": float(avg_daily_return),
                "volatility": float(volatility),
                "sharpe": float(sharpe),
            }
        )

    points.sort(key=lambda item: item["volatility"])  # left-to-right
    return {"points": points}
