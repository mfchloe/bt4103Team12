import os
import pandas as pd
import numpy as np
from collections import defaultdict
from pmdarima import auto_arima
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import matplotlib.pyplot as plt

def forecast_sharpe_ratio(time_series: np.ndarray, forward_days: int) -> float:
    """
    Forecast the Sharpe ratio for the next `forward_days` using an auto-ARIMA fit
    with exponential smoothing to mitigate flat multi-step forecasts.

    Args:
        time_series: 1-D array of historical returns (or return proxies).
        forward_days: Number of days to project forward.

    Returns:
        Predicted Sharpe ratio (mean return divided by return standard deviation).
    """
    if forward_days <= 0:
        raise ValueError("forward_days must be a positive integer.")

    series = pd.Series(np.asarray(time_series, dtype=float)).dropna()
    if series.empty:
        raise ValueError("time_series must contain at least one numeric value.")

    model = auto_arima(
        series,
        seasonal=False,
        stepwise=True,
        suppress_warnings=True,
        error_action="ignore",
        max_p=5,
        max_q=5,
        max_order=None,
    )

    forecast_horizon = max(forward_days, 5)
    raw_forecast = np.asarray(model.predict(n_periods=forecast_horizon), dtype=float)

    smoothed_forecast = (
        pd.Series(raw_forecast)
        .ewm(span=5, adjust=False)
        .mean()
        .to_numpy()
    )
    forecast_returns = smoothed_forecast[:forward_days]

    expected_return = forecast_returns.mean()
    risk = forecast_returns.std(ddof=0)

    if np.isclose(risk, 0.0):
        return 0.0

    return float(expected_return / risk)

def main():

    np.random.seed(42)

    model_type = "daily"

    current_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(current_dir, '../data/FAR-Trans/close_prices.csv')

    close_df = pd.read_csv(csv_path)
    close_df['timestamp'] = pd.to_datetime(close_df['timestamp'])
    close_df = close_df.sort_values(["ISIN","timestamp"])

    min_days = 1200
    fill_gap_max = 10

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

    forward_days = 5
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

            predicted = forecast_sharpe_ratio(history.to_numpy(), forward_days)
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

        plt.figure(figsize=(12, 5))
        plt.plot(evaluation_dates, actual_sharpes, label="Actual Sharpe", color="steelblue")
        plt.plot(evaluation_dates, predicted_sharpes, label="Predicted Sharpe", color="darkorange")
        plt.axhline(0, color="gray", linestyle="--", linewidth=0.8)
        plt.title(f"Sharpe Forecast vs Actual ({target_isin})")
        plt.xlabel("Date")
        plt.ylabel("Sharpe Ratio")
        plt.legend()
        plt.tight_layout()

        output = os.path.join(current_dir, f"results/{model_type}/sharpe_forecast_{target_isin}.png")
        os.makedirs(os.path.dirname(output), exist_ok=True)
        plt.savefig(output)
        plt.close()

if __name__ == "__main__":
    main()
