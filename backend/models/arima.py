import os
import pandas as pd
import numpy as np
from collections import defaultdict
from pmdarima import auto_arima
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import matplotlib.pyplot as plt

def main():

    np.random.seed(42)

    model_type = "daily"

    if model_type == "daily":
        d1 = 5
        d2 = 1
    elif model_type == "weekly":
        d1 = 25
        d2 = 5
    elif model_type == "monthly":
        d1 = 100
        d2 = 20

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

    for st_isin_idx in range(10):
        target_isin = pivot_df.columns[st_isin_idx]
        series = pivot_df[target_isin].dropna()

        # --- Train / Validation / Test split (70/10/20) ---
        n = len(series)
        train_end = int(n * 0.7)
        valid_end = int(n * 0.8)

        train = series.iloc[:train_end]
        valid = series.iloc[train_end:valid_end]
        test  = series.iloc[valid_end:]

        print(f"Data split: train={len(train)}, valid={len(valid)}, test={len(test)}")

        # --- Fit Auto-ARIMA on training data ---
        auto_model = auto_arima(
            train,
            seasonal=False,
            stepwise=True,
            trace=True,              # show tested models
            suppress_warnings=True,
            max_p=5, max_q=5,
            d=1,                     # differencing fixed to 1
            max_order=None,
            error_action="ignore"
        )

        print("\nBest ARIMA order found:", auto_model.order)

        # --- In-sample fit (train RMSE) ---
        train_pred = auto_model.predict_in_sample()
        train = train[1:]  # align (first diff dropped)
        train_pred = train_pred[1:]
        aligned_train = pd.concat([train, pd.Series(train_pred, index=train.index)], axis=1).dropna()
        aligned_train.columns = ["actual", "predicted"]
        train_rmse = np.sqrt(mean_squared_error(aligned_train["actual"], aligned_train["predicted"]))
        print(f"Train RMSE: {train_rmse:.4f}")

        # --- Rolling d2-day forecast on validation set ---
        val_predictions = []
        i = 0
        while i < len(valid):
            steps = min(d2, len(valid) - i)
            forecast = auto_model.predict(n_periods=steps)
            val_predictions.extend(forecast)

            auto_model.update(valid.iloc[i:i+steps])
            i += steps

        val_pred_series = pd.Series(val_predictions, index=valid.index)
        val_rmse = np.sqrt(mean_squared_error(valid, val_pred_series))
        print(f"Validation RMSE: {val_rmse:.4f}")

        # --- Rolling 5-day forecast on test set ---
        predictions = []
        i = 0
        while i < len(test):
            steps = min(d2, len(test) - i)
            forecast = auto_model.predict(n_periods=steps)
            predictions.extend(forecast)

            auto_model.update(test.iloc[i:i+steps])
            i += steps

        pred_series = pd.Series(predictions, index=test.index)
        test_rmse = np.sqrt(mean_squared_error(test, pred_series))
        std = np.std(series)
        std_test_rmse = test_rmse / std
        print(f"Test RMSE: {test_rmse:.4f}")
        print(f"Standardized Test RMSE: {std_test_rmse:.4f}")

        # --- Plot ---
        plt.figure(figsize=(12,5))
        plt.plot(train.index, train, label="Train", color="blue")
        plt.plot(valid.index, valid, label="Validation", color="green")
        plt.plot(test.index, test, label="Test", color="red")

        plt.plot(train.index, aligned_train["predicted"], "--", label="Train Forecast", color="blueviolet")
        plt.plot(valid.index, val_pred_series, "--", label=f"Validation Forecast ({d2}-day cycle)", color="teal")
        plt.plot(test.index, pred_series, "--", label=f"Test Forecast ({d2}-day cycle)", color="coral")

        plt.legend()
        plt.title(
            f"ARIMA {auto_model.order} on {target_isin} std.rmse={std_test_rmse:.4f}"
        )
        plt.tight_layout()
        output = os.path.join(current_dir, f'results/{model_type}/arima_{target_isin}.png')
        os.makedirs(os.path.dirname(output), exist_ok=True)
        plt.savefig(output)
        plt.close()

if __name__ == "__main__":
    main()
