from __future__ import annotations

import os
import pandas as pd
import numpy as np


from typing import Optional



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
    predictions_path = predictions_path or os.path.join(datasets_dir, "predictions.csv")
    covariance_path = covariance_path or os.path.join(datasets_dir, "covariance.csv")
    close_prices_path = close_prices_path or os.path.join(datasets_dir, "close_prices.csv")

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
