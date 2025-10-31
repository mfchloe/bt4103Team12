import os
import joblib
import numpy as np

# Categorical vocabularies (must match training!)
INVESTOR_TYPES = ["active_trader","moderate_trader","buy_and_hold"]
CUSTOMER_TYPES = ["mass","premium"]
RISK_LEVELS   = ["income","conservative","balanced","aggressive"]
CAPACITY      = ["CAP_LT30K","CAP_30K_80K","CAP_80K_300K","CAP_GT300K"]

class ClusterService:
    def __init__(self, artifacts_dir: str):
        self.scaler = joblib.load(os.path.join(artifacts_dir, "scaler_for_kmeans_k3_20251031_130702.joblib"))
        self.kmeans = joblib.load(os.path.join(artifacts_dir, "kmeans_only_k3_20251031_130702.joblib"))

    def _encode(self, investor_type: str, customer_type: str, risk_level: str, capacity: str, diversification: float) -> np.ndarray:
        vec = []
        vec += [1.0 if investor_type == v else 0.0 for v in INVESTOR_TYPES]
        vec += [1.0 if customer_type == v else 0.0 for v in CUSTOMER_TYPES]
        vec += [1.0 if risk_level   == v else 0.0 for v in RISK_LEVELS]
        vec += [1.0 if capacity     == v else 0.0 for v in CAPACITY]
        vec += [float(diversification)]
        return np.array(vec, dtype=float).reshape(1, -1)

    def predict(self, *, investor_type: str, customer_type: str, risk_level: str, capacity: str, diversification: float) -> int:
        x = self._encode(investor_type, customer_type, risk_level, capacity, diversification)
        x_scaled = self.scaler.transform(x)
        return int(self.kmeans.predict(x_scaled)[0])
