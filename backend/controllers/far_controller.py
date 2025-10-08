from __future__ import annotations

from fastapi import APIRouter

from models.far_model import (
    ActivitySeriesRequest,
    ExplainRequest,
    MetricsRequest,
    ScatterSampleRequest,
    SectorPrefsRequest,
    TopAssetsRequest,
)
from services import far_service

router = APIRouter(prefix="/api/far", tags=["far"])


@router.get("/datasets")
def list_datasets():
    paths = far_service.detect_datasets()
    return {
        "customers": bool(paths.customers),
        "transactions": bool(paths.transactions),
    }


@router.post("/metrics")
def metrics(req: MetricsRequest):
    return far_service.get_metrics(req.filters.model_dump(exclude_none=True))


@router.post("/top-assets")
def top_assets(req: TopAssetsRequest):
    return far_service.get_top_assets(req.filters.model_dump(exclude_none=True), req.top_n)


@router.post("/sector-prefs")
def sector_prefs(req: SectorPrefsRequest):
    return far_service.get_sector_prefs(req.filters.model_dump(exclude_none=True))


@router.post("/activity-series")
def activity_series(req: ActivitySeriesRequest):
    return far_service.get_activity_series(req.filters.model_dump(exclude_none=True), req.interval)


@router.post("/scatter-sample")
def scatter_sample(req: ScatterSampleRequest):
    return far_service.get_scatter_sample(req.filters.model_dump(exclude_none=True), req.limit)


@router.post("/explain")
def explain(req: ExplainRequest):
    return far_service.explain_asset(req.filters.model_dump(exclude_none=True), req.asset)
