from fastapi import APIRouter, Depends, HTTPException
from models.cluster_models import ClusterRequest, ClusterResponse
from services.cluster_service import ClusterService

router = APIRouter(prefix="/cluster", tags=["cluster"])

_service: ClusterService | None = None

def get_service() -> ClusterService:
    if _service is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return _service

@router.post("/predict", response_model=ClusterResponse)
def predict(req: ClusterRequest, svc: ClusterService = Depends(get_service)):
    # convert Pydantic model to dict
    customer_dict = req.dict()
    cluster = svc.predict(customer_dict)
    return ClusterResponse(cluster=cluster)
