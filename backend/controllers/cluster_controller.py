from fastapi import APIRouter, Depends, HTTPException
from models.cluster_models import ClusterRequest, ClusterResponse
from services.cluster_service import ClusterService

router = APIRouter(prefix="/cluster", tags=["cluster"])

# will be set in main.py
_service: ClusterService | None = None

def get_service() -> ClusterService:
    if _service is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return _service

@router.post("/predict", response_model=ClusterResponse)
def predict(req: ClusterRequest, svc: ClusterService = Depends(get_service)):
    cluster = svc.predict(
        investor_type=req.investor_type,
        customer_type=req.customer_type,
        risk_level=req.risk_level,
        capacity=req.capacity,
        diversification=req.diversification,
    )
    return ClusterResponse(cluster=cluster)
