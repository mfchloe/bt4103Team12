import logging
from datetime import date
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List, Optional

import pandas as pd

logger = logging.getLogger(__name__)


class DatasetTimeSeriesService:
    """Service layer to serve asset search and historical prices from local CSV datasets."""

    def __init__(self, dataset_dir: Optional[Path] = None) -> None:
        base_dir = Path(__file__).resolve().parents[1]
        self._dataset_dir = Path(dataset_dir or base_dir / "datasets")

        self._asset_df: Optional[pd.DataFrame] = None
        self._asset_lookup: Dict[str, Dict[str, str]] = {}
        self._symbol_lookup: Dict[str, Dict[str, str]] = {}
        self._close_prices_df: Optional[pd.DataFrame] = None
        self._isin_last_date: Dict[str, date] = {}

        # Dataset stops on 29 Nov 2022; treat that as the "current" market date.
        self._latest_available_date: date = date(2022, 11, 29)

        self._asset_lock = Lock()
        self._close_price_lock = Lock()

    # ---------- loaders ----------
    def _ensure_asset_catalog(self) -> None:
        if self._asset_df is not None:
            return

        with self._asset_lock:
            if self._asset_df is not None:
                return

            asset_path = self._dataset_dir / "asset_information.csv"
            if not asset_path.exists():
                logger.error("Asset information dataset not found at %s", asset_path)
                raise FileNotFoundError(f"asset_information.csv not found at {asset_path}")

            df = pd.read_csv(asset_path, dtype=str).fillna("")
            df["assetShortName"] = df["assetShortName"].str.strip()
            df["assetName"] = df["assetName"].str.strip()
            df["ISIN"] = df["ISIN"].astype(str).str.strip()

            self._asset_df = df
            self._asset_lookup = {
                row["ISIN"]: {
                    "assetShortName": row.get("assetShortName", ""),
                    "assetName": row.get("assetName", ""),
                    "marketID": row.get("marketID", ""),
                    "assetCategory": row.get("assetCategory", ""),
                    "assetSubCategory": row.get("assetSubCategory", ""),
                }
                for _, row in df.iterrows()
            }

    def _ensure_symbol_lookup(self) -> None:
        if self._asset_df is None or self._symbol_lookup:
            return

        self._ensure_close_prices()
        if self._close_prices_df is None:
            return

        df = self._asset_df
        for _, row in df.iterrows():
            isin = (row.get("ISIN") or "").strip()
            if not isin or not self._has_full_coverage(isin):
                continue

            symbol_raw = (row.get("assetShortName") or "").strip()
            if not symbol_raw:
                continue

            symbol_upper = symbol_raw.upper()
            if symbol_upper in self._symbol_lookup:
                continue

            name = (row.get("assetName") or "").strip()
            self._symbol_lookup[symbol_upper] = {
                "symbol": symbol_upper,
                "name": name if name else symbol_upper,
                "isin": isin,
                "marketId": row.get("marketID", ""),
                "assetCategory": row.get("assetCategory", ""),
                "assetSubCategory": row.get("assetSubCategory", ""),
            }

    def _ensure_close_prices(self) -> None:
        if self._close_prices_df is not None:
            return

        with self._close_price_lock:
            if self._close_prices_df is not None:
                return

            price_path = self._dataset_dir / "close_prices.csv"
            if not price_path.exists():
                logger.error("Close prices dataset not found at %s", price_path)
                raise FileNotFoundError(f"close_prices.csv not found at {price_path}")

            df = pd.read_csv(price_path, dtype={"ISIN": str}).fillna("")
            df["ISIN"] = df["ISIN"].astype(str).str.strip()
            df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
            df["closePrice"] = pd.to_numeric(df["closePrice"], errors="coerce")

            df = df.dropna(subset=["timestamp", "closePrice"])
            df.sort_values(["ISIN", "timestamp"], inplace=True)

            max_dates = df.groupby("ISIN")["timestamp"].max().dropna()
            self._isin_last_date = {
                isin: ts.normalize().date()
                for isin, ts in max_dates.items()
            }

            self._close_prices_df = df

    # ---------- helpers ----------
    def _get_asset_info(self, isin: str) -> Dict[str, str]:
        self._ensure_asset_catalog()
        return self._asset_lookup.get(isin, {})

    def _has_full_coverage(self, isin: str) -> bool:
        """Return True when an ISIN has data through the dataset's latest date."""
        if not isin:
            return False
        self._ensure_close_prices()
        last_date = self._isin_last_date.get(isin.strip())
        return bool(last_date and last_date >= self._latest_available_date)

    # ---------- public API ----------
    def search_assets(self, query: str, limit: int = 10) -> List[Dict[str, str]]:
        """Search assets by ISIN, asset name, or short name."""
        if not query:
            return []

        self._ensure_asset_catalog()
        self._ensure_close_prices()
        self._ensure_symbol_lookup()
        if self._asset_df is None or self._close_prices_df is None:
            return []

        normalized_query = query.strip()
        if not normalized_query:
            return []

        df = self._asset_df
        mask = (
            df["ISIN"].str.contains(normalized_query, case=False, na=False)
            | df["assetShortName"].str.contains(normalized_query, case=False, na=False)
            | df["assetName"].str.contains(normalized_query, case=False, na=False)
        )

        filtered = df.loc[mask].drop_duplicates(subset=["ISIN"])

        results: List[Dict[str, str]] = []
        seen_isins = set()
        query_lower = normalized_query.lower()

        for symbol, item in self._symbol_lookup.items():
            if (
                query_lower in symbol.lower()
                or query_lower in (item.get("name") or "").lower()
            ):
                if item["isin"] in seen_isins:
                    continue
                results.append(item)
                seen_isins.add(item["isin"])
                if len(results) >= limit:
                    return results

        for _, row in filtered.iterrows():
            isin = (row.get("ISIN") or "").strip()
            if not self._has_full_coverage(isin):
                continue

            symbol = row.get("assetShortName") or row.get("assetName") or isin
            name = row.get("assetName") or row.get("assetShortName") or isin
            if isin in seen_isins:
                continue
            results.append(
                {
                    "symbol": symbol,
                    "name": name,
                    "isin": isin,
                    "marketId": row.get("marketID", ""),
                    "assetCategory": row.get("assetCategory", ""),
                    "assetSubCategory": row.get("assetSubCategory", ""),
                }
            )
            seen_isins.add(isin)
            if len(results) >= limit:
                break

        return results

    def get_historical_series(
        self,
        isins: List[str],
        start_date,
        end_date=None,
    ) -> List[Dict[str, Any]]:
        """Fetch historical close prices for the provided ISINs."""
        if not isins:
            return []

        self._ensure_close_prices()
        self._ensure_asset_catalog()

        if self._close_prices_df is None:
            return []

        normalized_isins: List[str] = []
        seen = set()
        for raw in isins:
            if not raw:
                continue
            isin = raw.strip()
            if not isin or isin in seen:
                continue
            if not self._has_full_coverage(isin):
                continue
            normalized_isins.append(isin)
            seen.add(isin)

        if not normalized_isins:
            return []

        dataset_end_ts = pd.Timestamp(self._latest_available_date)
        start_ts = pd.Timestamp(start_date)
        if start_ts > dataset_end_ts:
            return []

        if end_date:
            end_ts = pd.Timestamp(end_date)
        else:
            end_ts = dataset_end_ts

        if end_ts > dataset_end_ts:
            end_ts = dataset_end_ts

        if start_ts > end_ts:
            return []

        df = self._close_prices_df

        mask = (
            df["ISIN"].isin(normalized_isins)
            & (df["timestamp"] >= start_ts)
            & (df["timestamp"] <= end_ts)
        )

        filtered = df.loc[mask]
        if filtered.empty:
            return []

        series: List[Dict[str, Any]] = []
        for isin in normalized_isins:
            asset_rows = filtered.loc[filtered["ISIN"] == isin]
            if asset_rows.empty:
                continue

            prices = [
                {
                    "date": ts.date().isoformat(),
                    "price": float(price),
                }
                for ts, price in zip(asset_rows["timestamp"], asset_rows["closePrice"])
                if pd.notna(price)
            ]

            if not prices:
                continue

            asset_info = self._get_asset_info(isin)
            symbol = asset_info.get("assetShortName") or asset_info.get("assetName") or isin
            name = asset_info.get("assetName") or asset_info.get("assetShortName") or isin

            series.append(
                {
                    "isin": isin,
                    "symbol": symbol,
                    "name": name,
                    "prices": prices,
                }
            )

        return series
