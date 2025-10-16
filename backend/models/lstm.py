import os
import pandas as pd
import numpy as np
from collections import defaultdict
import torch
from torch.utils.data import TensorDataset, DataLoader
import torch.nn as nn
import torch.optim as optim
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import matplotlib.pyplot as plt

def main():

    np.random.seed(42)
    torch.manual_seed(42)

    device = "cuda" if torch.cuda.is_available() else "cpu"

    model_type = "weekly"

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
    csv_path = os.path.join(current_dir, 'data/preprocessed_stock_data.csv')

    close_df = pd.read_csv(csv_path)
    close_df['timestamp'] = pd.to_datetime(close_df['timestamp'])
    close_df = close_df.sort_values(["ticker","timestamp"])

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

    for isin, g in close_df.groupby("ticker"):
        g = g.sort_values("timestamp")
        # Business-day index for that stock's span
        bidx = pd.bdate_range(g["timestamp"].min(), g["timestamp"].max())
        s = g.set_index("timestamp")["close"].reindex(bidx)

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

    print("Pivot shape (days × tickers):", pivot_df.shape)

    # Report only ISINs that had at least one INTERNAL gap (ignoring holidays)
    internal_gap_stocks = []
    for isin, g in close_df.groupby("ticker"):
        g = g.sort_values("timestamp")
        bidx = pd.bdate_range(g["timestamp"].min(), g["timestamp"].max())
        s = g.set_index("timestamp")["close"].reindex(bidx)

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
    print(f"Kept tickers (≥{min_days} days): {len(kept_isins)}")

    # Simple scaling
    stock_mean = pivot_df.mean(skipna=True)
    stock_std = pivot_df.std(skipna=True).replace(0, 1)
    scaled_close = (pivot_df - stock_mean) / stock_std

    # Returns for volatility (daily percent change); volatility = rolling std of returns
    returns = scaled_close.pct_change(fill_method=None)

    def rolling_features(df, windows=(5,10,20)):
        feats = {}
        for w in windows:
            feats[f"ma{w}"] = df.rolling(w, min_periods=w).mean()
        for w in windows:
            feats[f"vol{w}"] = returns.rolling(w, min_periods=w).std()
        return feats

    features = rolling_features(scaled_close)
    # Keep original scaled close as a feature
    features = {"close": scaled_close, **features}

    # Combine into 3D tensor: align on common dates where all features available
    feat_frames = list(features.values())
    aligned = pd.concat(feat_frames, axis=1, keys=list(features.keys()))

    # Drop rows only before the largest rolling window
    max_window = 20
    aligned = aligned.iloc[max_window:]   # ensures all ma/vol features are defined

    # Drop any rows where *all* ISINs are NaN (shouldn't usually happen after pivot)
    aligned = aligned.dropna(how="all")

    dates = aligned.index

    # Build tensor: (days, isins, features)
    isin_list = kept_isins
    feat_names = list(features.keys())
    num_days = len(dates)
    num_isins = len(isin_list)
    num_features = len(feat_names)

    tensor = np.empty((num_days, num_isins, num_features), dtype=np.float32)
    for f_idx, fname in enumerate(feat_names):
        df_f = aligned[fname][isin_list]
        tensor[:,:,f_idx] = df_f.to_numpy()

    print("Tensor shape (days, tickers, features):", tensor.shape)
    print("Features:", feat_names)

    n = tensor.shape[0]
    n_train = int(n * 0.70)
    n_valid = int(n * 0.10)
    n_test  = n - n_train - n_valid

    splits = {
        "train": (0, n_train),
        "valid": (n_train, n_train + n_valid),
        "test":  (n_train + n_valid, n)
    }
    print("Split indices:", splits)

    # === Single-Ticker Dataset from existing tensor ===

    # Extract this ticker's standardized features and target (close = feature 0)

    def st_make_sequences(series, target, d1, d2, start, end):
        Xs, Ys = [], []
        max_start = end - (d1 + d2)
        for t in range(start, max_start):
            Xs.append(series[t:t+d1, :])        # (d1, features)
            Ys.append(target[t+d1:t+d1+d2])     # (d2,)
        if not Xs:
            return None, None
        X = torch.tensor(np.stack(Xs), dtype=torch.float32)
        Y = torch.tensor(np.stack(Ys), dtype=torch.float32)
        return X, Y

    train_s, train_e = splits["train"]
    valid_s, valid_e = splits["valid"]
    test_s,  test_e  = splits["test"]

    for st_isin_idx in range(10):

        target_isin = isin_list[st_isin_idx]
        print(f"Sample data for ticker {isin_list[st_isin_idx]} (index {st_isin_idx}):")

        st_series = tensor[:, st_isin_idx, :]   # (days, features)
        st_target = tensor[:, st_isin_idx, 0]   # (days,) close only (scaled)

        Xtr_st, Ytr_st = st_make_sequences(st_series, st_target, d1, d2, train_s, train_e)
        Xva_st, Yva_st = st_make_sequences(st_series, st_target, d1, d2, valid_s, valid_e)
        Xte_st, Yte_st = st_make_sequences(st_series, st_target, d1, d2, test_s,  test_e)

        print("Single-ticker shapes:")
        print("  Train:", None if Xtr_st is None else tuple(Xtr_st.shape),
            None if Ytr_st is None else tuple(Ytr_st.shape))
        print("  Valid:", None if Xva_st is None else tuple(Xva_st.shape),
            None if Yva_st is None else tuple(Yva_st.shape))
        print("  Test :", None if Xte_st is None else tuple(Xte_st.shape),
            None if Yte_st is None else tuple(Yte_st.shape))

        # DataLoaders (don’t clash with your multi-ticker loaders)
        st_batch = 128
        st_train_loader = torch.utils.data.DataLoader(
            torch.utils.data.TensorDataset(Xtr_st, Ytr_st), batch_size=st_batch, shuffle=True,
            num_workers=2, pin_memory=(device=="cuda")
        )
        st_valid_loader = torch.utils.data.DataLoader(
            torch.utils.data.TensorDataset(Xva_st, Yva_st), batch_size=st_batch, shuffle=False,
            num_workers=2, pin_memory=(device=="cuda")
        )
        st_test_loader = torch.utils.data.DataLoader(
            torch.utils.data.TensorDataset(Xte_st, Yte_st), batch_size=st_batch, shuffle=False,
            num_workers=2, pin_memory=(device=="cuda")
        )

        class LSTMOneTicker(nn.Module):
            def __init__(self, input_dim, hidden_dim=64, output_dim=None, num_layers=2, dropout=0.1):
                super().__init__()
                if output_dim is None:
                    output_dim = d2
                self.lstm = nn.LSTM(
                    input_size=input_dim, hidden_size=hidden_dim,
                    num_layers=num_layers, batch_first=True, dropout=dropout
                )
                self.head = nn.Sequential(
                    nn.LayerNorm(hidden_dim),
                    nn.Dropout(dropout),
                    nn.Linear(hidden_dim, 64),
                    nn.ReLU(),
                    nn.Dropout(dropout),
                    nn.Linear(64, output_dim)
                )

            def forward(self, x):
                out, _ = self.lstm(x)   # (B, D1, H)
                out = out[:, -1, :]     # last step (works fine for single ticker)
                return self.head(out)

        st_model = LSTMOneTicker(input_dim=st_series.shape[-1], hidden_dim=64, output_dim=d2).to(device)
        st_criterion = nn.SmoothL1Loss(beta=1.0)
        st_optimizer = optim.Adam(st_model.parameters(), lr=1e-3, weight_decay=1e-3)
        st_scheduler = optim.lr_scheduler.ReduceLROnPlateau(st_optimizer, mode="min", factor=0.5, patience=5)
        st_scaler = torch.cuda.amp.GradScaler(enabled=(device=="cuda"))

        st_epochs = 50
        st_train_losses, st_valid_losses = [], []
        st_max_grad = 0.5

        def st_rolling_predict_with_context(series, target, d1, d2, start_idx, end_idx, use_context=True):
            """
            series: (days, feats), target: (days,)
            Returns Y_true, Y_pred shaped (T, d2) contiguous over [start_idx, end_idx)
            using teacher forcing (no predicted feedback).
            """
            preds, trues = [], []
            t = start_idx - d1 if use_context else start_idx
            t = max(0, t)
            while t + d1 + d2 <= end_idx:
                x_win = series[t:t+d1, :][None, ...]     # (1, d1, feats)
                x_win = torch.tensor(x_win, dtype=torch.float32, device=device)
                with torch.no_grad():
                    y_pred = st_model(x_win).cpu().numpy().reshape(d2)
                y_true = target[t+d1:t+d1+d2]
                preds.append(y_pred)
                trues.append(y_true)
                t += d2
            return np.vstack(trues), np.vstack(preds)
        for epoch in range(st_epochs):
            # Train
            st_model.train()
            run = 0.0
            for xb, yb in st_train_loader:
                xb, yb = xb.to(device), yb.to(device)
                st_optimizer.zero_grad()
                with torch.cuda.amp.autocast(enabled=(device=="cuda")):
                    pred = st_model(xb)
                    loss = st_criterion(pred, yb)
                st_scaler.scale(loss).backward()
                nn.utils.clip_grad_norm_(st_model.parameters(), st_max_grad)
                st_scaler.step(st_optimizer)
                st_scaler.update()
                run += loss.item() * xb.size(0)
            tr_loss = run / len(st_train_loader.dataset)

            # Valid
            st_model.eval()
            run = 0.0
            with torch.no_grad():
                for xb, yb in st_valid_loader:
                    xb, yb = xb.to(device), yb.to(device)
                    with torch.cuda.amp.autocast(enabled=(device=="cuda")):
                        pred = st_model(xb)
                        run += st_criterion(pred, yb).item() * xb.size(0)
            va_loss = run / len(st_valid_loader.dataset)

            st_scheduler.step(va_loss)
            st_train_losses.append(tr_loss); st_valid_losses.append(va_loss)
            print(f"[ST] Epoch {epoch+1:3d}/{st_epochs}: train {tr_loss:.6f}, valid {va_loss:.6f}, lr={st_optimizer.param_groups[0]['lr']:.2e}")
        

        # Train (no earlier context), Valid/Test (use context from previous split)
        Y_true_tr_st, Y_pred_tr_st = st_rolling_predict_with_context(st_series, st_target, d1, d2, train_s, train_e, use_context=False)
        Y_true_va_st, Y_pred_va_st = st_rolling_predict_with_context(st_series, st_target, d1, d2, valid_s, valid_e, use_context=True)
        Y_true_te_st, Y_pred_te_st = st_rolling_predict_with_context(st_series, st_target, d1, d2, test_s,  test_e,  use_context=True)

        print("Single-ticker pred/true shapes:")
        print("  Train:", Y_true_tr_st.shape, Y_pred_tr_st.shape)
        print("  Valid:", Y_true_va_st.shape, Y_pred_va_st.shape)
        print("  Test :", Y_true_te_st.shape, Y_pred_te_st.shape)

        # Unscale helper for this ticker (z-score -> price units)
        st_mu  = stock_mean[target_isin]
        st_std = stock_std[target_isin]

        def st_unscale_close(y_scaled):
            # y_scaled: (T, D2)
            return y_scaled * st_std + st_mu

        Yt_tr = st_unscale_close(Y_true_tr_st)
        Yp_tr = st_unscale_close(Y_pred_tr_st)
        Yt_va = st_unscale_close(Y_true_va_st)
        Yp_va = st_unscale_close(Y_pred_va_st)
        Yt_te = st_unscale_close(Y_true_te_st)
        Yp_te = st_unscale_close(Y_pred_te_st)

        mse = mean_squared_error(Y_true_te_st, Y_pred_te_st)
        rmse = np.sqrt(mse)

        plt.figure(figsize=(12,5))
        # Train
        plt.plot(Yt_tr.reshape(-1), label="Train Truth", color="blue")
        plt.plot(Yp_tr.reshape(-1), "--", label="Train Pred", color="blueviolet")

        # Valid
        off = len(Yt_tr.reshape(-1))
        plt.plot(range(off, off+len(Yt_va.reshape(-1))), Yt_va.reshape(-1), label="Valid Truth", color="green")
        plt.plot(range(off, off+len(Yp_va.reshape(-1))), Yp_va.reshape(-1), "--", label="Valid Pred", color="teal")

        # Test
        off2 = off + len(Yt_va.reshape(-1))
        plt.plot(range(off2, off2+len(Yt_te.reshape(-1))), Yt_te.reshape(-1), label="Test Truth", color="red")
        plt.plot(range(off2, off2+len(Yp_te.reshape(-1))), Yp_te.reshape(-1), "--", label="Test Pred", color="coral")

        plt.title(f"{target_isin} (D1={d1}, D2={d2}) std.rmse={rmse:.4f}")
        plt.xlabel("Forecast step (batched by D2)")
        plt.ylabel("Close (original scale)")
        plt.legend()
        plt.tight_layout()
        output = os.path.join(current_dir, f'./results/lstm_{target_isin}.png')
        os.makedirs(os.path.dirname(output), exist_ok=True)
        plt.savefig(output)
        plt.close()
        print(f"Saved prediction plot to {output}")

if __name__ == "__main__":
    main()