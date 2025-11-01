from pydantic import BaseModel, Field
from typing import Literal

class ClusterRequest(BaseModel):
    riskLevel: Literal[
        "Predicted_Conservative", "Income", "Balanced", "Conservative",
        "Predicted_Income", "Predicted_Balanced", "Aggressive", "Predicted_Aggressive"
    ]
    customerType: Literal["Mass", "Premium"]
    investmentCapacity: Literal[
        "Predicted_CAP_LT30K", "Predicted_CAP_80K_300K", "CAP_30K_80K",
        "CAP_LT30K", "CAP_80K_300K", "Predicted_CAP_30K_80K", "CAP_GT300K",
        "Predicted_CAP_GT300K"
    ]
    investor_type: Literal["active_trader", "buy_and_hold", "moderate_trader"]
    historical_investment_style: Literal["balanced", "concentrated", "focused", "diversified"]
    avg_transactions_per_month: float = Field(0.0, ge=0.0)
    days_since_last_buy: float = Field(999.0, ge=0.0)
    trading_activity_ratio: float = Field(0.0, ge=0.0, le=1.0)
    avg_buy_transaction_value: float = Field(0.0, ge=0.0)
    avg_buy_units: float = Field(0.0, ge=0.0)
    category_diversification: float = Field(0.0, ge=0.0, le=1.0)
    num_markets_bought: int = Field(0, ge=0)
    exploration_score: float = Field(0.5, ge=0.0, le=1.0)

class ClusterResponse(BaseModel):
    cluster: int
#  example new_custoemr input:
# new_customer = {
#     'riskLevel': 'Balanced',
#     'customerType': 'Mass',
#     'investmentCapacity': 'CAP_30K_80K',
#     'investor_type': 'active_trader',
#     'historical_investment_style': 'balanced',
#     'avg_transactions_per_month': 0.0,
#     'days_since_last_buy': 999.0,
#     'trading_activity_ratio': 0.0,
#     'avg_buy_transaction_value': 12000,
#     'avg_buy_units': 0.0,
#     'category_diversification': 0.8,
#     'num_markets_bought': 3,
#     'exploration_score': 0.75,
# }
