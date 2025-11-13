from fastapi import APIRouter, HTTPException
from models.recommendation_model import (
    PortfolioAllocationRequest,
    PortfolioAllocationResponse,
    RecommendationRequest,
    RecommendationResponse,
)
from services.recommendation_service import get_recommendations
from services.markowitz_service import allocate_recommendation_shares

router = APIRouter(prefix="/api/recommendation", tags=["recommendation"])



@router.post("/recommend", response_model=RecommendationResponse)
def recommend_assets(req: RecommendationRequest):
    try:
        recs = get_recommendations(req.customer_id, req.existing_portfolio, cluster_id=req.cluster_id)
        return {"recommendations": recs}
    except ValueError as e:
        # Then raise the HTTP 404 for FastAPI
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/allocate", response_model=PortfolioAllocationResponse)
def allocate_portfolio(req: PortfolioAllocationRequest):
    try:
        allocations = allocate_recommendation_shares(
            req.isins,
            req.investment_amount,
            target_return=req.target_return,
            max_risk=req.max_risk,
        )
        return {"allocations": allocations}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

