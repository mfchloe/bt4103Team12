from __future__ import annotations

from fastapi import APIRouter
from fastapi.encoders import jsonable_encoder

import math
import numbers

from models.far_model import (
    ActivitySeriesRequest,
    ExplainRequest,
    HistogramRequest,
    CategoryBreakdownRequest,
    MetricsRequest,
    ScatterSampleRequest,
    SectorPrefsRequest,
    TopAssetsRequest,
    EfficientFrontierRequest,
)
from services import far_service

router = APIRouter(prefix="/api/far", tags=["far"])


def _clean(obj):
    if obj is None:
        return None
    if isinstance(obj, dict):
        return {k: _clean(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_clean(v) for v in obj]
    # Handle numpy/pandas scalars by unboxing
    if hasattr(obj, "item"):
        try:
            return _clean(obj.item())
        except Exception:
            return None
    # Numbers: replace NaN/Inf with None
    if isinstance(obj, numbers.Number):
        try:
            f = float(obj)
            return None if not math.isfinite(f) else f
        except Exception:
            return None
    return obj

@router.get("/datasets")
def list_datasets():
    paths = far_service.detect_datasets()
    return _clean({
        "customers": bool(paths.customers),
        "transactions": bool(paths.transactions),
    })


@router.get("/transactions/{customer_id}")
def get_transactions(customer_id: str):
    rows = far_service.get_customer_transactions(customer_id)
    return _clean({"items": rows})


@router.post("/metrics")
def metrics(req: MetricsRequest):
    return _clean(far_service.get_metrics(req.filters.model_dump(exclude_none=True)))


@router.post("/top-assets")
def top_assets(req: TopAssetsRequest):
    return _clean(far_service.get_top_assets(req.filters.model_dump(exclude_none=True), req.top_n))


@router.post("/sector-prefs")
def sector_prefs(req: SectorPrefsRequest):
    return _clean(far_service.get_sector_prefs(req.filters.model_dump(exclude_none=True)))


@router.post("/activity-series")
def activity_series(req: ActivitySeriesRequest):
    return _clean(far_service.get_activity_series(req.filters.model_dump(exclude_none=True), req.interval))


@router.post("/scatter-sample")
def scatter_sample(req: ScatterSampleRequest):
    return _clean(far_service.get_scatter_sample(req.filters.model_dump(exclude_none=True), req.limit, req.x_column, req.y_column))


@router.post("/explain")
def explain(req: ExplainRequest):
    return _clean(far_service.explain_asset(req.filters.model_dump(exclude_none=True), req.asset))


@router.post("/investor-type-breakdown")
def investor_type_breakdown(req: MetricsRequest):
    # Simple breakdown from customers if available
    dfs = far_service.load_dataframes()
    cust = dfs.get("customers")
    if cust is None or cust.empty or "investor_type" not in cust.columns:
        return {"rows": []}
    cust_f = far_service._apply_filters(cust, req.filters.model_dump(exclude_none=True))  # type: ignore
    counts = cust_f["investor_type"].value_counts()
    rows = [{"label": k, "value": int(v)} for k, v in counts.items()]
    
    return _clean({"rows": rows})


@router.post("/cluster-breakdown")
def cluster_breakdown(req: MetricsRequest):
    dfs = far_service.load_dataframes()
    cust_df = dfs.get("customers")
    if cust_df is None or cust_df.empty:
        return {"rows": []}
    
    cust_f = far_service._apply_filters(cust_df, req.filters.model_dump(exclude_none=True))
    
    cluster_counts = cust_f['cluster'].value_counts().to_dict()  # Convert Series → dict
    return _clean(cluster_counts)


@router.post("/histogram")
def histogram(req: HistogramRequest):
    return _clean(far_service.get_histogram(req.filters.model_dump(exclude_none=True), req.column, req.bins))


@router.post("/category-breakdown")
def category_breakdown(req: CategoryBreakdownRequest):
    return _clean(
        far_service.get_category_breakdown(
            req.filters.model_dump(exclude_none=True), req.column, req.top_n, req.include_clusters
        )
    )


@router.post("/efficient-frontier")
def efficient_frontier(req: EfficientFrontierRequest):
    return _clean(
        far_service.get_efficient_frontier(
            req.filters.model_dump(exclude_none=True)
        )
    )
