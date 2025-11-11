# backend/services/cluster_popularity_service.py

import os
from functools import lru_cache
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

CUSTOMER_INFO_PATH = os.path.join(
    BASE_DIR,
    "datasets",
    "customer_information_engineered_kMeans.csv",
)

TX_PATH = os.path.join(
    BASE_DIR,
    "datasets",
    "customer_transactions.csv",
)


@lru_cache(maxsize=1)
def load_top_assets_by_cluster():
    """
    Returns:
        dict[int, list[dict]]:
        {
          0: [{ "symbol": "XYZ", "score": 123 }, ...],
          1: [...],
          2: [...]
        }
    """
    # customerID -> cluster
    info = pd.read_csv(CUSTOMER_INFO_PATH, usecols=["customerID", "cluster"])

    # Only keep buys for popularity
    tx = pd.read_csv(
        TX_PATH,
        usecols=["customerID", "ISIN", "transactionType", "totalValue"],
    )
    tx["transactionType"] = tx["transactionType"].str.upper()
    tx = tx[tx["transactionType"] == "BUY"].copy()

    # Merge to attach cluster
    merged = tx.merge(info, on="customerID", how="inner")

    if merged.empty:
        return {}

    # Popularity signals: unique customers, trades, total value
    grouped = (
        merged.groupby(["cluster", "ISIN"])
        .agg(
            unique_customers=("customerID", "nunique"),
            trade_count=("ISIN", "size"),
            total_value=("totalValue", "sum"),
        )
        .reset_index()
    )

    # Define a composite popularity score
    # You can tune weights; this is readable and monotonic.
    grouped["popularity_score"] = (
        grouped["unique_customers"] * 3
        + grouped["trade_count"] * 1
        + (grouped["total_value"] / (10_000))  # scale down
    )

    # Sort within each cluster
    grouped = grouped.sort_values(
        ["cluster", "popularity_score"],
        ascending=[True, False],
    )

    top_assets_by_cluster = {}
    for cluster_id, sub in grouped.groupby("cluster"):
        assets = []
        for _, row in sub.iterrows():
          isin = str(row["ISIN"]).strip()
          if not isin:
              continue
          assets.append(
              {
                  "symbol": isin,      # using ISIN as symbol for now
                  "score": float(row["popularity_score"]),
              }
          )
        # Keep more than 10 so we can filter out overlaps with portfolio later
        top_assets_by_cluster[int(cluster_id)] = assets[:100]

    return top_assets_by_cluster


def get_top_assets_for_cluster(cluster_id: int, existing_portfolio, top_k: int = 10):
    """
    Returns a list shaped like your existing model output:
      [ [symbol, name, similarityScore, sharpeRatio], ... ]
    For fallback we don't have model scores, so we fill reasonable placeholders.
    """
    existing_set = {s.strip().upper() for s in (existing_portfolio or []) if isinstance(s, str)}

    all_by_cluster = load_top_assets_by_cluster()
    candidates = all_by_cluster.get(int(cluster_id), [])

    recs = []
    rank = 0
    for asset in candidates:
        symbol = asset["symbol"]
        if symbol.upper() in existing_set:
            continue
        rank += 1
        if rank > top_k:
            break

        # You can enhance this later (lookup name, compute Sharpe, etc.)
        recs.append([
            symbol,         # symbol
            symbol,         # name fallback
            0.0,            # similarityScore (no model, so neutral)
            0.0,            # sharpeRatio (or plug in precomputed if you have)
        ])

    return recs
