from pydantic import BaseModel, Field
from typing import Literal

class ClusterRequest(BaseModel):
    investor_type: Literal["active_trader","moderate_trader","buy_and_hold"]
    customer_type: Literal["mass","premium"]
    risk_level: Literal["income","conservative","balanced","aggressive"]
    capacity: Literal["CAP_LT30K","CAP_30K_80K","CAP_80K_300K","CAP_GT300K"]
    diversification: float = Field(..., ge=0.0, le=1.0)

class ClusterResponse(BaseModel):
    cluster: int
