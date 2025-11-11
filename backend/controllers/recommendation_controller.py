from fastapi import APIRouter, HTTPException
from models.recommendation_model import RecommendationRequest, RecommendationResponse
from services.recommendation_service import get_recommendations

router = APIRouter(prefix="/api/recommendation", tags=["recommendation"])



@router.post("/recommend", response_model=RecommendationResponse)
def recommend_assets(req: RecommendationRequest):
    try:
        recs = get_recommendations(req.customer_id, req.existing_portfolio, cluster_id=req.cluster_id)
        return {"recommendations": recs}
    except ValueError as e:
        # Then raise the HTTP 404 for FastAPI
        raise HTTPException(status_code=404, detail=str(e))

