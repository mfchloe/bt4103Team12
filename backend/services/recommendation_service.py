from typing import List, Optional
from models_integration import recommend
from services.cluster_popularity_service import get_top_assets_for_cluster
import pandas as pd
import os

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
CUSTOMER_INFO_PATH = os.path.join(
    BASE_DIR,
    "datasets",
    "customer_information_engineered_kMeans.csv",
)

# Optional: map FAR customers->cluster for safety
_customer_cluster_df = None
def _load_customer_clusters():
    global _customer_cluster_df
    if _customer_cluster_df is None:
        _customer_cluster_df = pd.read_csv(
            CUSTOMER_INFO_PATH,
            usecols=["customerID", "cluster"],
            dtype={"customerID": str},
        )
    return _customer_cluster_df


def _infer_cluster_from_dataset(customer_id: str) -> Optional[int]:
    df = _load_customer_clusters()
    row = df.loc[df["customerID"] == str(customer_id)]
    if row.empty:
        return None
    return int(row["cluster"].iloc[0])


def get_recommendations(
    customer_id: str,
    existing_portfolio: List[str],
    cluster_id: Optional[int] = None,
):
    """
    1) Try model-based recommendation via models_integration.recommend.
    2) If customer not found / error / empty, fallback:
        - If cluster_id given: top popular assets in that cluster.
        - Else if customer in FAR dataset: use their dataset cluster.
        - Else: use cluster 1 (largest / neutral) as final fallback.
    """
    # Normalize portfolio symbols
    existing_portfolio = [s for s in (existing_portfolio or []) if s]

    # --- Primary: model-based recommendations ---
    try:
        recs = recommend(customer_id, existing_portfolio)
        if recs and len(recs) > 0:
            return recs
    except Exception:
        # swallow here; we'll construct a cleaner message below if fallback fails
        pass

    # --- Fallback: cluster-based popularity ---

    # 1) use cluster passed from frontend (for synthetic/Firebase users)
    if cluster_id is not None:
        fallback = get_top_assets_for_cluster(cluster_id, existing_portfolio)
        if fallback:
            return fallback

    # 2) Try infer from engineered dataset (for true FAR customers)
    inferred_cluster = _infer_cluster_from_dataset(customer_id)
    if inferred_cluster is not None:
        fallback = get_top_assets_for_cluster(inferred_cluster, existing_portfolio)
        if fallback:
            return fallback

    # 3) Last-resort: use cluster 1 (you can pick any default)
    fallback = get_top_assets_for_cluster(1, existing_portfolio)
    if fallback:
        return fallback

    # If we reach here, nothing worked
    raise ValueError(
        f"No recommendations available for customer '{customer_id}'."
    )
