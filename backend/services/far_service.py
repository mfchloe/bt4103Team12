from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from typing import Dict, Optional

import pandas as pd

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
    # Accept several likely filenames for customer engineered dataset
    customers = (
        _detect_file("customer_information_with_engineered_df")
        or _detect_file("customer_information_with_engineered")
        or _detect_file("customer_engineering_with_engineered")
    )
    # accommodate typo or correct spelling for assets/transactions
    assets_a = _detect_file("asset_infomration_with_engineered")
    assets_b = _detect_file("asset_information_with_engineered")
    transactions = assets_a or assets_b
    return DatasetPaths(customers=customers, transactions=transactions)


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
        # Normalize date-like columns
        for col in ["timestamp", "lastQuestionnaireDate"]:
            if col in cust_df.columns:
                cust_df[col] = pd.to_datetime(cust_df[col], errors="coerce")
        dfs["customers"] = cust_df
    if paths.transactions:
        df = _read_df(paths.transactions)
        # Ensure txn date column is datetime if present
        for col in ["date", "txn_date", "transaction_date"]:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors="coerce")
                break
        dfs["transactions"] = df
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


def _parse_capacity_to_value(capacity_str: Optional[str]) -> Optional[float]:
    if not isinstance(capacity_str, str):
        return None
    s = capacity_str.replace("€", "").replace(",", "").strip().lower()
    try:
        if "+" in s:
            num = s.replace("+", "")
            factor = 1000 if "k" in num else (1_000_000 if "m" in num else 1)
            num = num.replace("k", "").replace("m", "")
            return float(num) * factor
        if "-" in s:
            parts = s.split("-")
            hi = parts[1]
            factor = 1000 if "k" in hi else (1_000_000 if "m" in hi else 1)
            hi = hi.replace("k", "").replace("m", "")
            return float(hi) * factor
        factor = 1000 if "k" in s else (1_000_000 if "m" in s else 1)
        s = s.replace("k", "").replace("m", "")
        return float(s) * factor
    except Exception:
        return None


def _apply_filters(df: pd.DataFrame, filters: dict) -> pd.DataFrame:
    if df is None or df.empty:
        return df
    out = df
    # Map incoming filter keys to dataset columns
    mapping = {
        "customer_type": ["customer_type", "customerType"],
        "investor_type": ["investor_type"],
        "risk_level": ["risk_level", "riskLevel"],
    }
    for key, candidates in mapping.items():
        values = (filters or {}).get(key)
        if values:
            present_col = next((c for c in candidates if c in out.columns), None)
            if present_col:
                out = out[out[present_col].isin(values)]
    # sectors: works with transactions.sector OR customers.preferred_sector/current_dominant_sector
    sectors = (filters or {}).get("sectors")
    if sectors:
        if "sector" in out.columns:
            out = out[out["sector"].isin(sectors)]
        elif "preferred_sector" in out.columns:
            out = out[out["preferred_sector"].isin(sectors)]
        elif "current_dominant_sector" in out.columns:
            out = out[out["current_dominant_sector"].isin(sectors)]
    # numeric
    capacity = (filters or {}).get("investment_capacity")
    if capacity:
        minimum = capacity.get("minimum")
        maximum = capacity.get("maximum")
        if "capacity_value" in out.columns:
            if minimum is not None:
                out = out[out["capacity_value"] >= minimum]
            if maximum is not None:
                out = out[out["capacity_value"] <= maximum]
        elif "investmentCapacity" in out.columns and (minimum is not None or maximum is not None):
            parsed = out["investmentCapacity"].map(_parse_capacity_to_value)
            if minimum is not None:
                out = out[parsed >= minimum]
            if maximum is not None:
                out = out[parsed <= maximum]
    # date
    date_range = (filters or {}).get("date_range")
    date_col = None
    for c in ["date", "txn_date", "transaction_date", "timestamp", "lastQuestionnaireDate"]:
        if c in out.columns:
            date_col = c
            break
    if date_range and date_col:
        start = date_range.get("start")
        end = date_range.get("end")
        if start:
            out = out[out[date_col] >= pd.to_datetime(start)]
        if end:
            out = out[out[date_col] <= pd.to_datetime(end)]
    return out


def get_metrics(filters: dict) -> dict:
    dfs = load_dataframes()
    cust = dfs.get("customers")
    if cust is None or cust.empty:
        return {
            "customers": 0,
            "avg_portfolio_value": None,
            "median_holding_days": None,
            "avg_transactions_per_month": None,
            "stock_pct": None,
            "etf_pct": None,
        }
    cust_f = _apply_filters(cust, filters)
    customers = int(len(cust_f))
    avg_portfolio_value = float(cust_f["portfolio_value"].mean()) if "portfolio_value" in cust_f.columns and customers else None
    median_holding_days = float(cust_f["holding_days"].median()) if "holding_days" in cust_f.columns and customers else None
    avg_tx = float(cust_f["avg_transactions_per_month"].mean()) if "avg_transactions_per_month" in cust_f.columns and customers else None
    stock_pct = None
    etf_pct = None
    if "pct_equity" in cust_f.columns:
        stock_pct = float(cust_f["pct_equity"].mean() / 100.0)
    if "pct_etf" in cust_f.columns:
        etf_pct = float(cust_f["pct_etf"].mean() / 100.0)
    return {
        "customers": customers,
        "avg_portfolio_value": avg_portfolio_value,
        "median_holding_days": median_holding_days,
        "avg_transactions_per_month": avg_tx,
        "stock_pct": stock_pct,
        "etf_pct": etf_pct,
    }


def get_top_assets(filters: dict, top_n: int = 20) -> dict:
    dfs = load_dataframes()
    cust = dfs.get("customers")
    tx = dfs.get("transactions")
    if tx is None or tx.empty or cust is None or cust.empty:
        return {"rows": []}
    cust_f = _apply_filters(cust, filters)
    if cust_f.empty:
        return {"rows": []}

    # determine cohort customer ids
    cust_id_col = "customer_id" if "customer_id" in cust_f.columns else ("customerID" if "customerID" in cust_f.columns else None)
    cust_ids = set(cust_f[cust_id_col]) if cust_id_col else set()
    # compute adoption in cohort: % of cohort customers who have any txn/holding in asset
    tx_f = _apply_filters(tx, filters)
    if cust_id_col and cust_id_col in tx_f.columns:
        tx_f = tx_f[tx_f[cust_id_col].isin(cust_ids)] if cust_ids else tx_f

    # adoption per asset for cohort
    if "asset" not in tx_f.columns:
        return {"rows": []}
    cohort_asset_adopters = tx_f.groupby("asset")[cust_id_col].nunique().rename("cohort_buyers") if cust_id_col in tx_f.columns else tx_f.groupby("asset").size().rename("cohort_txns")

    cohort_size = len(cust_f)

    # population adoption baseline
    pop_tx = tx
    pop_asset_adopters = pop_tx.groupby("asset")[cust_id_col].nunique().rename("pop_buyers") if cust_id_col and cust_id_col in pop_tx.columns else pop_tx.groupby("asset").size().rename("pop_txns")
    pop_customers = len(cust) if (cust is not None and cust_id_col and cust_id_col in cust.columns) else None

    df = pd.concat([cohort_asset_adopters, pop_asset_adopters], axis=1).fillna(0)
    rows = []
    # compute momentum slope using last N months volume for simplicity if date present
    date_col = None
    for c in ["date", "txn_date", "transaction_date"]:
        if c in tx_f.columns:
            date_col = c
            break

    sort_col = df.columns[0]
    for asset, rec in df.sort_values(by=sort_col, ascending=False).head(top_n).iterrows():
        cohort_count = rec.get("cohort_buyers", rec.get("cohort_txns", 0))
        pop_count = rec.get("pop_buyers", rec.get("pop_txns", 1))
        adoption_rate = float(cohort_count) / float(cohort_size) if cohort_size else 0.0
        lift = (float(cohort_count) / float(cohort_size)) / (float(pop_count) / float(pop_customers)) if pop_customers and pop_customers > 0 and pop_count > 0 and cohort_size > 0 else None

        momentum_slope = None
        if date_col:
            tx_asset = tx_f[tx_f["asset"] == asset]
            if not tx_asset.empty:
                ts = tx_asset.set_index(date_col).resample("M").size()
                if len(ts) >= 2:
                    # simple slope: last value - median of previous
                    recent = ts.tail(3).mean()
                    prior = ts.iloc[:-3].median() if len(ts) > 3 else ts.iloc[0]
                    momentum_slope = float(recent - prior) / max(prior, 1.0)

        rows.append({
            "asset": asset,
            "adoption_rate": float(adoption_rate),
            "lift": float(lift) if lift is not None else None,
            "momentum_slope": momentum_slope,
            "median_holding_days": None,
            "avg_position_value": None,
        })

    return {"rows": rows}


def get_sector_prefs(filters: dict) -> dict:
    dfs = load_dataframes()
    cust = dfs.get("customers")
    tx = dfs.get("transactions")
    rows = []
    # If transactions exist, use them; otherwise, compute from customers' preferred sector
    if tx is not None and not tx.empty and "sector" in tx.columns:
        tx_f = _apply_filters(tx, filters)
        if "sector" not in tx_f.columns:
            return {"rows": []}
        cohort_size = None
        if cust is not None and not cust.empty:
            cust_f = _apply_filters(cust, filters)
            cohort_size = len(cust_f) if not cust_f.empty else None
        by_sector = (
            tx_f.groupby("sector")["customer_id"].nunique()
            if "customer_id" in tx_f.columns
            else tx_f.groupby("sector").size()
        )
        # baseline
        pop_by_sector = (
            tx.groupby("sector")["customer_id"].nunique()
            if "customer_id" in tx.columns
            else tx.groupby("sector").size()
        )
        pop_customers = len(cust) if cust is not None and "customer_id" in (cust.columns) else None
        for sector, count in by_sector.sort_values(ascending=False).items():
            adoption = float(count) / float(cohort_size) if cohort_size else None
            lift = None
            if pop_customers and pop_customers > 0:
                pop_adoption = float(pop_by_sector.get(sector, 0)) / float(pop_customers)
                if adoption is not None and pop_adoption > 0:
                    lift = adoption / pop_adoption
            rows.append({"sector": sector, "adoption_rate": adoption or 0.0, "lift": lift})
        return {"rows": rows}

    # Fallback: use customers' preferred sector
    if cust is None or cust.empty:
        return {"rows": []}
    cust_f = _apply_filters(cust, filters)
    if "preferred_sector" not in cust_f.columns:
        return {"rows": []}
    cohort_size = len(cust_f)
    by_sector = cust_f["preferred_sector"].dropna().value_counts()
    # baseline over whole population
    pop_by_sector = cust["preferred_sector"].dropna().value_counts()
    pop_customers = len(cust)
    for sector, count in by_sector.items():
        adoption = float(count) / float(cohort_size) if cohort_size else 0.0
        pop_adoption = float(pop_by_sector.get(sector, 0)) / float(pop_customers) if pop_customers else 0.0
        lift = (adoption / pop_adoption) if pop_adoption > 0 else None
        rows.append({"sector": sector, "adoption_rate": adoption, "lift": lift})
    rows.sort(key=lambda r: r["adoption_rate"], reverse=True)
    return {"rows": rows}


def get_activity_series(filters: dict, interval: str = "month") -> dict:
    dfs = load_dataframes()
    tx = dfs.get("transactions")
    # If no transactions, fall back to customer timestamps
    if tx is None or tx.empty:
        cust = dfs.get("customers")
        if cust is None or cust.empty:
            return {"rows": []}
        cust_f = _apply_filters(cust, filters)
        c_date_col = None
        for c in ["timestamp", "lastQuestionnaireDate"]:
            if c in cust_f.columns:
                c_date_col = c
                break
        if not c_date_col:
            return {"rows": []}
        rule = {"day": "D", "week": "W", "month": "MS", "quarter": "QS", "year": "YS"}.get(interval, "MS")
        series = cust_f.set_index(c_date_col).sort_index().groupby(pd.Grouper(freq=rule)).size()
        rows = [
            {"period": idx.strftime("%Y-%m"), "buy_volume": int(v), "unique_buyers": int(v)}
            for idx, v in series.items()
        ]
        return {"rows": rows}

    tx_f = _apply_filters(tx, filters)
    date_col = None
    for c in ["date", "txn_date", "transaction_date", "timestamp"]:
        if c in tx_f.columns:
            date_col = c
            break
    if date_col is None:
        return {"rows": []}

    # Ensure datetime index for resampling
    tx_f = tx_f.copy()
    tx_f[date_col] = pd.to_datetime(tx_f[date_col], errors="coerce")
    tx_f = tx_f.dropna(subset=[date_col])
    if tx_f.empty:
        return {"rows": []}

    rule = {"day": "D", "week": "W", "month": "MS", "quarter": "QS", "year": "YS"}.get(interval, "MS")
    grouped = tx_f.set_index(date_col).sort_index().groupby(pd.Grouper(freq=rule))
    # Count rows if 'asset' column missing
    size_series = grouped.size().rename("buy_volume")
    series = size_series.to_frame()
    if "customer_id" in tx_f.columns:
        series["unique_buyers"] = grouped["customer_id"].nunique()
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


def explain_asset(filters: dict, asset: str) -> dict:
    dfs = load_dataframes()
    cust = dfs.get("customers")
    tx = dfs.get("transactions")
    if tx is None or tx.empty:
        return {
            "adoption_rate": None,
            "lift": None,
            "recent_momentum": None,
            "similar_customer_count": 0,
            "median_holding_days": None,
            "churn_pct_30d": None,
            "notes": "No transactions data",
        }

    cust_f = _apply_filters(cust, filters) if cust is not None else None
    cohort_size = len(cust_f) if cust_f is not None else None

    tx_f = _apply_filters(tx, filters)
    tx_asset = tx_f[tx_f.get("asset") == asset] if "asset" in tx_f.columns else pd.DataFrame()

    adoption_rate = None
    if cohort_size and "customer_id" in tx_asset.columns:
        adoption_rate = float(tx_asset["customer_id"].nunique()) / float(cohort_size)

    lift = None
    if cust is not None and "customer_id" in cust.columns and "customer_id" in tx.columns:
        pop_adoption = float(tx[tx.get("asset") == asset]["customer_id"].nunique()) / float(len(cust))
        if adoption_rate is not None and pop_adoption > 0:
            lift = adoption_rate / pop_adoption

    date_col = None
    for c in ["date", "txn_date", "transaction_date"]:
        if c in tx_asset.columns:
            date_col = c
            break
    recent_momentum = None
    if date_col and not tx_asset.empty:
        ts = tx_asset.set_index(date_col).resample("M").size()
        if len(ts) >= 2:
            recent = ts.tail(3).mean()
            prior = ts.iloc[:-3].median() if len(ts) > 3 else ts.iloc[0]
            recent_momentum = float(recent - prior) / max(prior, 1.0)

    similar_customer_count = int(cohort_size or 0)

    result = {
        "adoption_rate": adoption_rate,
        "lift": lift,
        "recent_momentum": recent_momentum,
        "similar_customer_count": similar_customer_count,
        "median_holding_days": None,
        "churn_pct_30d": None,
        "notes": None,
    }
    return result
