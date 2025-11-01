import os
import joblib
import numpy as np
import pandas as pd

class ClusterService:
    def __init__(self, artifacts_dir: str):
        self.scaler = joblib.load(os.path.join(artifacts_dir, "scaler_for_kmeans.joblib"))
        self.kmeans = joblib.load(os.path.join(artifacts_dir, "kmeans_model.joblib"))
        self.le_dict = joblib.load(os.path.join(artifacts_dir, "label_encoders_for_kmeans.joblib"))
        self.feature_order = [
            "riskLevel", "customerType", "investmentCapacity",
            "avg_transactions_per_month", "days_since_last_buy", "trading_activity_ratio",
            "investor_type", "avg_buy_transaction_value", "avg_buy_units",
            "category_diversification", "num_markets_bought", "historical_investment_style",
            "exploration_score"
        ]

    def _prepare_input(self, customer_dict: dict) -> np.ndarray:
        # Build dataframe
        df = pd.DataFrame([customer_dict])
        
        # Reorder columns
        df = df[self.feature_order]

        # Encode categorical columns
        for col, le in self.le_dict.items():
            df[col] = df[col].map(lambda x: le.transform([x])[0] if x in le.classes_ else -1)

        # Scale
        X_scaled = self.scaler.transform(df)
        return X_scaled

    def predict(self, customer_dict: dict) -> int:
        X_scaled = self._prepare_input(customer_dict)
        cluster_label = self.kmeans.predict(X_scaled)[0]
        return int(cluster_label)


# example new_custoemr input:
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
