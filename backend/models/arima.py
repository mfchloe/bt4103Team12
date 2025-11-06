import os
from typing import Optional, Sequence, Tuple

import numpy as np
import pandas as pd
from collections import defaultdict
from pmdarima import auto_arima
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
# import matplotlib.pyplot as plt


DEFAULT_CONFIDENCE = 0.95


def _smooth_series(values: np.ndarray) -> np.ndarray:
    """Apply double exponential smoothing to stabilise forecasts."""
    series = pd.Series(values)
    first_smooth = series.ewm(span=5, adjust=False).mean()
    second_smooth = first_smooth.ewm(span=5, adjust=False).mean()
    return second_smooth.to_numpy()


def _predict_returns_with_confidence(
    time_series: np.ndarray,
    forward_days: int,
    confidence: float = DEFAULT_CONFIDENCE,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Forecast returns together with lower/upper confidence bounds.
    """
    if forward_days <= 0:
        raise ValueError("forward_days must be a positive integer.")
    if not (0.0 < confidence < 1.0):
        raise ValueError("confidence must lie between 0 and 1.")

    series = pd.Series(np.asarray(time_series, dtype=float)).dropna()
    if series.empty:
        raise ValueError("time_series must contain at least one numeric value.")

    model = auto_arima(
        series,
        seasonal=False,
        stepwise=True,
        suppress_warnings=True,
        error_action="ignore",
        start_p=0,
        max_p=5,
        start_q=0,
        max_q=5,
        d=1,
        max_order=None,
    )

    forecast_horizon = max(forward_days, 5)
    alpha = 1.0 - float(confidence)
    mean_forecast, conf_int = model.predict(
        n_periods=forecast_horizon,
        return_conf_int=True,
        alpha=alpha,
    )

    mean_forecast = np.asarray(mean_forecast, dtype=float)
    conf_int = np.asarray(conf_int, dtype=float)
    if conf_int.shape != (forecast_horizon, 2):
        raise RuntimeError("Unexpected confidence interval shape from predictor.")

    smoothed_mean = _smooth_series(mean_forecast)[:forward_days]
    smoothed_lower = _smooth_series(conf_int[:, 0])[:forward_days]
    smoothed_upper = _smooth_series(conf_int[:, 1])[:forward_days]

    lower = np.minimum(smoothed_lower, smoothed_upper)
    upper = np.maximum(smoothed_lower, smoothed_upper)
    lower = np.minimum(lower, smoothed_mean)
    upper = np.maximum(upper, smoothed_mean)

    return smoothed_mean, lower, upper


def _predict_returns(time_series: np.ndarray, forward_days: int) -> np.ndarray:
    """
    Generate return forecasts using the ARIMA-based logic.
    """
    mean_returns, _, _ = _predict_returns_with_confidence(
        time_series,
        forward_days,
        confidence=DEFAULT_CONFIDENCE,
    )
    return mean_returns


def _accumulate_price_paths(
    last_price: float,
    mean_returns: Sequence[float],
    lower_returns: Sequence[float],
    upper_returns: Sequence[float],
) -> Tuple[Sequence[float], Sequence[float], Sequence[float]]:
    """
    Transform return forecasts into price paths for mean/lower/upper bounds.
    """
    running_mean = float(last_price)
    running_lower = float(last_price)
    running_upper = float(last_price)

    mean_prices = []
    lower_prices = []
    upper_prices = []

    for mean_ret, lower_ret, upper_ret in zip(mean_returns, lower_returns, upper_returns):
        step_mean = 1.0 + float(mean_ret)
        step_lower = 1.0 + float(lower_ret)
        step_upper = 1.0 + float(upper_ret)

        if step_lower <= 0:
            step_lower = 1e-6
        if step_upper <= 0:
            step_upper = 1e-6

        running_mean *= step_mean
        running_lower *= step_lower
        running_upper *= step_upper

        running_mean = float(np.clip(running_mean, a_min=0.0, a_max=None))
        running_lower = float(np.clip(running_lower, a_min=0.0, a_max=None))
        running_upper = float(np.clip(running_upper, a_min=0.0, a_max=None))

        lower_bound = min(running_mean, running_lower, running_upper)
        upper_bound = max(running_mean, running_lower, running_upper)

        mean_prices.append(running_mean)
        lower_prices.append(lower_bound)
        upper_prices.append(upper_bound)

    return mean_prices, lower_prices, upper_prices


def _forecast_sharpe_from_returns(time_series: np.ndarray, forward_days: int) -> float:
    """Compute a Sharpe ratio forecast directly from a return series."""
    if forward_days <= 0:
        raise ValueError("forward_days must be a positive integer.")

    try:
        forecast_returns = _predict_returns(time_series, forward_days)
    except Exception:
        return 0.0

    if forecast_returns.size == 0:
        return 0.0

    expected_return = float(np.mean(forecast_returns))
    risk = float(np.std(forecast_returns, ddof=0))

    if np.isclose(risk, 0.0):
        return 0.0

    return float(expected_return / risk)


def generate_price_predictions(
    time_series: pd.DataFrame,
    forward_days: int = 5,
    output_path: Optional[str] = None,
    confidence: float = DEFAULT_CONFIDENCE,
) -> pd.DataFrame:
    """
    Forecast future prices for every ISIN and store the results in ``predictions.csv``.

    The function applies the ARIMA forecasting logic to the return series of assets
    that trade up to the latest available global date. For assets that do not reach
    the global end date, the function falls back to a constant forecast equal to the
    final observed price so that all assets share the same forecast horizon. In
    addition to the mean price forecast, 95% confidence interval bounds are produced.

    Args:
        time_series: DataFrame containing columns ``ISIN``, ``timestamp`` and ``closePrice``.
        forward_days: Number of business days to forecast. Defaults to 5.
        output_path: Optional override for the output CSV path.
        confidence: Confidence level used for the prediction intervals.

    Returns:
        DataFrame of the generated forecasts, ordered by ISIN and timestamp.
    """
    if forward_days <= 0:
        raise ValueError("forward_days must be a positive integer.")
    if not (0.0 < confidence < 1.0):
        raise ValueError("confidence must lie between 0 and 1.")

    required_columns = {"ISIN", "timestamp", "closePrice"}
    if not required_columns.issubset(time_series.columns):
        missing = sorted(required_columns - set(time_series.columns))
        raise ValueError(f"time_series is missing required columns: {missing}")

    df = time_series.copy()
    df["ISIN"] = df["ISIN"].astype(str)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["closePrice"] = pd.to_numeric(df["closePrice"], errors="coerce")
    df = df.dropna(subset=["closePrice"])
    if df.empty:
        raise ValueError("time_series must contain at least one valid price observation.")

    current_dir = os.path.dirname(os.path.abspath(__file__))
    datasets_dir = os.path.join(current_dir, "..", "datasets")

    if output_path is None:
        output_path = os.path.join(datasets_dir, "predictions.csv")
    else:
        output_path = os.path.abspath(output_path)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    global_latest = df["timestamp"].max()
    if pd.isna(global_latest):
        raise ValueError("Unable to determine the latest timestamp from time_series.")

    business_day = pd.offsets.BDay()
    future_dates = list(pd.bdate_range(global_latest + business_day, periods=forward_days))
    records = []

    for isin, group in df.groupby("ISIN"):
        group = group.sort_values("timestamp")
        prices = pd.to_numeric(group["closePrice"], errors="coerce").dropna()
        if prices.empty:
            continue

        returns = prices.pct_change().dropna()
        last_price = float(prices.iloc[-1])
        last_timestamp = pd.Timestamp(group["timestamp"].iloc[-1])

        mean_prices = [last_price] * forward_days
        lower_prices = [last_price] * forward_days
        upper_prices = [last_price] * forward_days

        should_forecast = (
            last_timestamp.normalize() == pd.Timestamp(global_latest).normalize()
            and not returns.empty
        )

        if should_forecast:
            try:
                mean_returns, lower_returns, upper_returns = _predict_returns_with_confidence(
                    returns.to_numpy(),
                    forward_days,
                    confidence=confidence,
                )
                mean_prices, lower_prices, upper_prices = _accumulate_price_paths(
                    last_price,
                    mean_returns,
                    lower_returns,
                    upper_returns,
                )
            except Exception:
                mean_prices = [last_price] * forward_days
                lower_prices = [last_price] * forward_days
                upper_prices = [last_price] * forward_days

        for ts, mean_val, lower_val, upper_val in zip(
            future_dates, mean_prices, lower_prices, upper_prices
        ):
            records.append(
                {
                    "ISIN": isin,
                    "timestamp": pd.Timestamp(ts).date().isoformat(),
                    "closePrice": float(mean_val),
                    "lower_95": float(lower_val),
                    "upper_95": float(upper_val),
                }
            )

    predictions_df = pd.DataFrame(
        records,
        columns=["ISIN", "timestamp", "closePrice", "lower_95", "upper_95"],
    )
    predictions_df = predictions_df.sort_values(["ISIN", "timestamp"]).reset_index(drop=True)
    predictions_df.to_csv(output_path, index=False)
    return predictions_df


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

def main():

    np.random.seed(42)

    model_type = "daily"

    current_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(current_dir, "..", "datasets", "close_prices.csv")

    close_df = pd.read_csv(csv_path)
    close_df['timestamp'] = pd.to_datetime(close_df['timestamp'])
    close_df = close_df.sort_values(["ISIN","timestamp"])

    min_days = 1200
    fill_gap_max = 10
    forward_days = 5

    predictions_output = os.path.join(current_dir, "..", "datasets", "predictions.csv")
    generate_price_predictions(
        close_df,
        forward_days=forward_days,
        output_path=predictions_output,
    )
    print(f"Prediction dataset written to {predictions_output}")

    def is_holiday(date: pd.Timestamp) -> bool:
        return date.strftime("%m-%d") in {"01-01", "12-25"}

    def check_and_fill_series(s: pd.Series, fill_gap_max: int):
        s = s.copy()
        is_na = s.isna().astype(int)
        grp = (is_na.diff(1) != 0).cumsum()
        bad = False

        for g_id, idx in s.groupby(grp).groups.items():
            vals = s.loc[idx]
            if vals.isna().all():
                # exclude holidays from the run
                valid_idx = [d for d in idx if not is_holiday(d)]
                run_len = len(valid_idx)

                # If nothing left (all holiday gaps), skip
                if run_len == 0:
                    continue

                # Head gap → drop
                if valid_idx[0] == s.index[0]:
                    bad = True
                    break

                # Tail gap → drop
                if valid_idx[-1] == s.index[-1]:
                    bad = True
                    break

                # Internal gap → fill only if short enough
                if run_len <= fill_gap_max:
                    prev_val = s.loc[:valid_idx[0]].ffill().iloc[-1]
                    s.loc[valid_idx] = prev_val
                else:
                    bad = True
                    break

        if bad:
            return None
        return s.ffill()

    # Reindex each ISIN to business days, fill or drop
    filled = {}
    dropped = []
    gap_report = defaultdict(list)

    for isin, g in close_df.groupby("ISIN"):
        g = g.sort_values("timestamp")
        # Business-day index for that stock's span
        bidx = pd.bdate_range(g["timestamp"].min(), g["timestamp"].max())
        s = g.set_index("timestamp")["closePrice"].reindex(bidx)

        # Track gap lengths
        na_runs = s.isna().astype(int)
        gap_report[isin] = []
        if na_runs.sum() > 0:
            grp = (na_runs.diff(1) != 0).cumsum()
            for g_id, idx in s.groupby(grp).groups.items():
                vals = s.loc[idx]
                if vals.isna().all():
                    gap_report[isin].append(len(vals))

        # Fill or drop
        s_filled = check_and_fill_series(s, fill_gap_max)
        if s_filled is None:
            dropped.append(isin)
        else:
            filled[isin] = s_filled.rename(isin)

    print(f"Stocks dropped due to head/tail/long gaps: {len(dropped)}")
    if dropped:
        print(list(dropped)[:10], "...")

    # Build pivot (outer join across retained ISINs, aligned to union of their calendars)
    pivot_df = pd.concat(filled.values(), axis=1).sort_index()

    # Drop holidays (01-01 and 12-25)
    pivot_df = pivot_df[~pivot_df.index.strftime("%m-%d").isin(["01-01", "12-25"])]

    print("Pivot shape (days × ISINs):", pivot_df.shape)

    # Report only ISINs that had at least one INTERNAL gap (ignoring holidays)
    internal_gap_stocks = []
    for isin, g in close_df.groupby("ISIN"):
        g = g.sort_values("timestamp")
        bidx = pd.bdate_range(g["timestamp"].min(), g["timestamp"].max())
        s = g.set_index("timestamp")["closePrice"].reindex(bidx)

        is_na = s.isna().astype(int)
        grp = (is_na.diff(1) != 0).cumsum()
        for g_id, idx in s.groupby(grp).groups.items():
            vals = s.loc[idx]
            if vals.isna().all():
                # drop holidays from this missing run
                valid_idx = [d for d in idx if not is_holiday(d)]

                # If after excluding holidays, no true missing days → skip this run
                if not valid_idx:
                    continue

                # If there are still real missing days → check head/tail
                if valid_idx[0] != s.index[0] and valid_idx[-1] != s.index[-1]:
                    internal_gap_stocks.append(isin)
                    break  # only need to mark once per ISIN

    print(f"Stocks that had internal gaps (ignoring holidays): {len(internal_gap_stocks)}")
    print(internal_gap_stocks[:20])

    # Filter stocks with at least MIN_DAYS non-null values
    valid_counts = pivot_df.notna().sum()
    kept_isins = valid_counts[valid_counts >= min_days].index.tolist()
    pivot_df = pivot_df[kept_isins]
    pivot_df = pivot_df.ffill().bfill()
    print(f"Kept ISINs (≥{min_days} days): {len(kept_isins)}")

    lookback_window = 252  # approximately one trading year
    max_evaluations = 40   # cap to keep runtime manageable

    for target_isin in pivot_df.columns[:5]:
        series = pivot_df[target_isin].dropna()
        returns = series.pct_change().dropna()

        if len(returns) < lookback_window + forward_days:
            print(f"Skipping {target_isin}: insufficient return history for evaluation.")
            continue

        predicted_sharpes = []
        actual_sharpes = []
        evaluation_dates = []

        for eval_idx, end_idx in enumerate(range(lookback_window, len(returns) - forward_days, forward_days)):
            if eval_idx >= max_evaluations:
                break

            history = returns.iloc[end_idx - lookback_window:end_idx]
            future = returns.iloc[end_idx:end_idx + forward_days]

            predicted = _forecast_sharpe_from_returns(history.to_numpy(), forward_days)
            future_std = future.std(ddof=0)
            actual = float(future.mean() / future_std) if not np.isclose(future_std, 0.0) else 0.0

            predicted_sharpes.append(predicted)
            actual_sharpes.append(actual)
            evaluation_dates.append(future.index[-1])

        if not predicted_sharpes:
            print(f"Skipping {target_isin}: no evaluation windows generated.")
            continue

        mse = mean_squared_error(actual_sharpes, predicted_sharpes)
        mae = mean_absolute_error(actual_sharpes, predicted_sharpes)
        r2 = r2_score(actual_sharpes, predicted_sharpes)

        print(
            f"{target_isin}: windows={len(predicted_sharpes)} "
            f"MSE={mse:.6f} MAE={mae:.6f} R2={r2:.4f}"
        )

        # plt.figure(figsize=(12, 5))
        # plt.plot(evaluation_dates, actual_sharpes, label="Actual Sharpe", color="steelblue")
        # plt.plot(evaluation_dates, predicted_sharpes, label="Predicted Sharpe", color="darkorange")
        # plt.axhline(0, color="gray", linestyle="--", linewidth=0.8)
        # plt.title(f"Sharpe Forecast vs Actual ({target_isin})")
        # plt.xlabel("Date")
        # plt.ylabel("Sharpe Ratio")
        # plt.legend()
        # plt.tight_layout()

        output = os.path.join(current_dir, f"results/{model_type}/sharpe_forecast_{target_isin}.png")
        os.makedirs(os.path.dirname(output), exist_ok=True)
        # plt.savefig(output)
        # plt.close()

if __name__ == "__main__":
    main()
