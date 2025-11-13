from __future__ import annotations

import math
from typing import Dict, List, Optional

from models.markowitz import (
    MarkowitzOptimisationError,
    optimize_portfolio_weights,
)
from services.dataset_time_series_service import DatasetTimeSeriesService


dataset_service = DatasetTimeSeriesService()


def _normalize_isins(isins: List[str]) -> List[str]:
    normalized: List[str] = []
    seen = set()
    for raw in isins:
        isin = (raw or "").strip().upper()
        if not isin:
            continue
        if isin in seen:
            continue
        seen.add(isin)
        normalized.append(isin)
    return normalized


def allocate_recommendation_shares(
    isins: List[str],
    investment_amount: float,
    target_return: Optional[float] = None,
    max_risk: Optional[float] = None,
) -> List[Dict[str, float]]:
    clean_isins = _normalize_isins(isins)
    if not clean_isins:
        raise ValueError("At least one ISIN must be provided.")

    if investment_amount is None or investment_amount <= 0:
        raise ValueError("Investment amount must be a positive number.")

    # Ensure the user provided exactly one optimisation objective.
    if (target_return is None and max_risk is None) or (
        target_return is not None and max_risk is not None
    ):
        raise ValueError("Provide either target_return or max_risk, but not both.")

    try:
        weights = optimize_portfolio_weights(
            clean_isins,
            target_return=target_return,
            target_risk=max_risk,
        )
    except MarkowitzOptimisationError as exc:
        raise ValueError(str(exc)) from exc

    non_negative = [max(0.0, float(w)) for w in weights]
    total_weight = sum(non_negative)
    if total_weight <= 0:
        raise ValueError("Optimisation returned invalid weights.")

    normalized_weights = [w / total_weight for w in non_negative]
    allocations: List[Dict[str, float]] = []

    min_price = math.inf
    for isin, weight in zip(clean_isins, normalized_weights):
        asset_info = dataset_service.get_asset_info_by_isin(isin) or {}
        symbol = asset_info.get("symbol") or isin
        name = asset_info.get("name") or symbol

        price = dataset_service.get_latest_price_for_symbol(symbol)
        if price is None or price <= 0:
            price = dataset_service.get_latest_price_for_symbol(isin)

        price = float(price) if price is not None else None
        if price is not None and price > 0:
            min_price = min(min_price, price)

        capital_slice = float(investment_amount * weight)
        if price is None or price <= 0:
            shares = 0
            allocated_value = 0.0
            remainder = 0.0
        else:
            exact_shares = capital_slice / price if price else 0.0
            shares = math.floor(exact_shares)
            allocated_value = shares * price
            remainder = exact_shares - shares

        allocations.append(
            {
                "isin": isin,
                "symbol": symbol,
                "name": name,
                "weight": weight,
                "price": price,
                "shares": shares,
                "allocated_value": allocated_value,
                "target_value": capital_slice,
                "remainder": remainder,
            }
        )

    leftover = float(investment_amount) - sum(
        entry["allocated_value"] for entry in allocations
    )

    # Distribute remaining capital to the assets with the largest remainders when possible.
    if leftover > 0 and min_price != math.inf:
        for entry in sorted(
            allocations, key=lambda item: item["remainder"], reverse=True
        ):
            price = entry["price"]
            if price is None or price <= 0:
                continue
            if entry["remainder"] <= 0:
                continue
            if leftover + 1e-9 < price:
                continue
            entry["shares"] += 1
            entry["allocated_value"] += price
            leftover -= price
            if leftover < min_price:
                break

    for entry in allocations:
        entry.pop("remainder", None)
        entry["shares"] = int(entry["shares"])
        entry["allocated_value"] = float(entry["allocated_value"])

    return allocations
