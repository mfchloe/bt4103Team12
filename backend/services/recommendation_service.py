from models_integration import recommend
from typing import List
def get_recommendations(customer_id: str, existing_portfolio: List[str]):
    """
    Calls models_integration.recommend to get top recommendations.
    Raises ValueError if the customer ID is invalid for all models.
    """
    try:
        recs = recommend(customer_id, existing_portfolio)
        if not recs or len(recs) == 0:
            # This means the customer wasn't found in any model
            raise ValueError(f"Customer ID '{customer_id}' not found in any recommendation model.")
        return recs
    except Exception as e:
        # Catch any other errors during recommendation
        raise ValueError(f"Error generating recommendations: {str(e)}")