from __future__ import annotations

import argparse
import os
from typing import Optional, Sequence

import numpy as np
import pandas as pd


def forecast_sharpe_ratio(
    isin: str,
    predictions_path: Optional[str] = None,
    covariance_path: Optional[str] = None,
    close_prices_path: Optional[str] = None,
) -> float:
    """
    Compute the Sharpe ratio for a given ISIN using stored price forecasts and the covariance matrix.

    Args:
        isin: Asset identifier to evaluate.
        predictions_path: Optional path override for ``predictions.csv``.
        covariance_path: Optional path override for ``covariance.csv``.
        close_prices_path: Optional path override for ``close_prices.csv``.

    Returns:
        The Sharpe ratio derived from the mean of predicted returns and the asset's standard deviation.
    """
    if not isin:
        raise ValueError("isin must be provided.")

    current_dir = os.path.dirname(os.path.abspath(__file__))
    datasets_dir = os.path.join(current_dir, "..", "datasets")
    processed_dir = os.path.join(datasets_dir, "processed_data")

    def _default_path(filename: str, override: Optional[str]) -> str:
        """
        Resolve dataset files with backward-compatible fallbacks.
        Prefer ``datasets/processed_data`` when the file exists there so the
        service keeps working after data reshuffles.
        """
        if override:
            return override

        processed_candidate = os.path.join(processed_dir, filename)
        if os.path.exists(processed_candidate):
            return processed_candidate
        return os.path.join(datasets_dir, filename)

    predictions_path = _default_path("predictions.csv", predictions_path)
    covariance_path = _default_path("covariance.csv", covariance_path)
    close_prices_path = _default_path("close_prices.csv", close_prices_path)

    if not os.path.exists(predictions_path):
        raise FileNotFoundError(f"Predictions file not found at {predictions_path}.")

    predictions_df = pd.read_csv(predictions_path)
    predictions_df["ISIN"] = predictions_df["ISIN"].astype(str)

    isin_str = str(isin)
    asset_predictions = predictions_df[predictions_df["ISIN"] == isin_str].copy()
    if asset_predictions.empty:
        raise ValueError(f"No predictions available for ISIN {isin_str}.")

    asset_predictions["timestamp"] = pd.to_datetime(asset_predictions["timestamp"])
    asset_predictions = asset_predictions.sort_values("timestamp")
    predicted_prices = pd.to_numeric(asset_predictions["closePrice"], errors="coerce").dropna()
    if predicted_prices.empty:
        raise ValueError(f"Predictions for ISIN {isin_str} contain no valid price values.")

    if not os.path.exists(close_prices_path):
        raise FileNotFoundError(f"Close price dataset not found at {close_prices_path}.")

    close_prices_df = pd.read_csv(close_prices_path)
    close_prices_df["ISIN"] = close_prices_df["ISIN"].astype(str)
    asset_history = close_prices_df.loc[close_prices_df["ISIN"] == isin_str, ["timestamp", "closePrice"]]
    if asset_history.empty:
        raise ValueError(f"No historical prices found for ISIN {isin_str}.")

    asset_history["timestamp"] = pd.to_datetime(asset_history["timestamp"])
    asset_history = asset_history.sort_values("timestamp")
    historical_prices = pd.to_numeric(asset_history["closePrice"], errors="coerce").dropna()
    if historical_prices.empty:
        raise ValueError(f"No numeric historical prices found for ISIN {isin_str}.")

    base_price = float(historical_prices.iloc[-1])
    augmented_prices = pd.concat(
        [pd.Series([base_price], dtype=float), predicted_prices.reset_index(drop=True)],
        ignore_index=True,
    )
    predicted_returns = augmented_prices.pct_change().dropna()
    mean_return = float(predicted_returns.mean()) if not predicted_returns.empty else 0.0

    covariance_df = pd.read_csv(covariance_path, index_col=0)
    if isin_str not in covariance_df.index or isin_str not in covariance_df.columns:
        raise ValueError(f"ISIN {isin_str} not found in covariance matrix.")

    variance = float(covariance_df.loc[isin_str, isin_str])
    variance = max(variance, 0.0)
    std_dev = float(np.sqrt(variance))

    if np.isclose(std_dev, 0.0):
        if mean_return > 0:
            return 1.0
        if mean_return < 0:
            return -1.0
        return 0.0

    return float(mean_return / std_dev)


__all__ = ["forecast_sharpe_ratio"]


def _parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Inspect the Sharpe ratio forecast for a single ISIN.",
    )
    parser.add_argument("isin", help="Target ISIN (e.g. US5949181045).")
    parser.add_argument(
        "--predictions",
        help="Optional override for predictions.csv (defaults to backend/datasets[/processed_data]).",
    )
    parser.add_argument(
        "--covariance",
        help="Optional override for covariance.csv (defaults to backend/datasets[/processed_data]).",
    )
    parser.add_argument(
        "--close-prices",
        dest="close_prices",
        help="Optional override for close_prices.csv.",
    )
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> None:
    args = _parse_args(argv)
    try:
        sharpe = forecast_sharpe_ratio(
            args.isin,
            predictions_path=args.predictions,
            covariance_path=args.covariance,
            close_prices_path=args.close_prices,
        )
    except Exception as exc:
        raise SystemExit(f"Sharpe forecast failed: {exc}") from exc

    print(f"{args.isin}: {sharpe:.6f}")


if __name__ == "__main__":  # pragma: no cover
    main()
