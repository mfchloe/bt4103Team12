"""
Markowitz mean-variance portfolio optimisation helpers.

The module loads daily return forecasts from ``predictions.csv`` and the
historical covariance matrix from ``covariance.csv`` to construct long-only
portfolios subject to classic mean-variance constraints.

Typical usage::

    weights = optimize_portfolio_weights(
        ["US0378331005", "US5949181045", "US30303M1027"],
        target_return=0.001,
    )

which returns a list of weights matching the input order.
"""

from __future__ import annotations

import argparse

from pathlib import Path
from typing import Iterable, List, Optional, Sequence

import numpy as np
import pandas as pd

import cvxpy as cp


DATASETS_DIR = Path(__file__).resolve().parent.parent / "datasets"
PROCESSED_DATA_DIR = DATASETS_DIR / "processed_data"


class MarkowitzOptimisationError(RuntimeError):
    """Raised when optimisation inputs are invalid or the solver fails."""


def _resolve_path(default_filename: str, override: Optional[Path | str]) -> Path:
    """
    Resolve dataset paths, falling back to the shared backend/datasets directory.
    """
    if override is None:
        processed_candidate = PROCESSED_DATA_DIR / default_filename
        if processed_candidate.exists():
            return processed_candidate
        return DATASETS_DIR / default_filename

    resolved = Path(override).expanduser()
    if not resolved.is_absolute():
        resolved = (Path.cwd() / resolved).resolve()
    return resolved


def _validate_isins(isins: Iterable[str]) -> List[str]:
    """
    Normalise and validate the provided ISIN sequence.
    """
    normalized = []
    seen = set()
    for raw in isins:
        isin = str(raw).strip()
        if not isin:
            raise ValueError("ISIN values must be non-empty strings.")
        if isin in seen:
            raise ValueError(f"Duplicate ISIN detected: {isin}")
        seen.add(isin)
        normalized.append(isin)

    if not normalized:
        raise ValueError("At least one ISIN must be provided.")

    return normalized


def _load_expected_returns(
    isins: Sequence[str],
    predictions_path: Path,
) -> pd.Series:
    """
    Compute expected daily returns for each ISIN from predictions data.
    """
    if not predictions_path.exists():
        raise FileNotFoundError(f"Predictions file not found: {predictions_path}")

    df = pd.read_csv(predictions_path, dtype={"ISIN": str})
    if df.empty:
        raise MarkowitzOptimisationError("Predictions file is empty.")

    df = df[df["ISIN"].isin(isins)]
    if df.empty:
        missing = ", ".join(isins)
        raise MarkowitzOptimisationError(
            f"Predictions file does not contain the requested ISINs: {missing}"
        )

    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df["closePrice"] = pd.to_numeric(df["closePrice"], errors="coerce")
    df = df.dropna(subset=["timestamp", "closePrice"])
    if df.empty:
        raise MarkowitzOptimisationError("Predictions data contains no valid entries.")

    exp_returns = {}
    for isin, group in df.groupby("ISIN"):
        group = group.sort_values("timestamp")
        prices = group["closePrice"].to_numpy(dtype=float)
        if prices.size < 2:
            exp_returns[isin] = 0.0
            continue

        daily_returns = pd.Series(prices).pct_change().dropna()
        if daily_returns.empty:
            exp_returns[isin] = 0.0
        else:
            exp_returns[isin] = float(daily_returns.mean())

    missing_isins = set(isins) - exp_returns.keys()
    if missing_isins:
        formatted = ", ".join(sorted(missing_isins))
        raise MarkowitzOptimisationError(
            f"Missing expected returns for the following ISINs: {formatted}"
        )

    return pd.Series(exp_returns).reindex(isins)


def _load_covariance_matrix(
    isins: Sequence[str],
    covariance_path: Path,
) -> pd.DataFrame:
    """
    Load and extract the covariance sub-matrix for the requested ISINs.
    """
    if not covariance_path.exists():
        raise FileNotFoundError(f"Covariance file not found: {covariance_path}")

    cov = pd.read_csv(covariance_path, index_col=0, dtype=str)
    if cov.empty:
        raise MarkowitzOptimisationError("Covariance file is empty.")

    cov = cov.apply(pd.to_numeric, errors="coerce")
    cov = cov.reindex(index=isins, columns=isins)

    if cov.isna().all().any():
        missing = [
            isins[idx] for idx, all_nan in enumerate(cov.isna().all())
            if all_nan
        ]
        formatted = ", ".join(missing)
        raise MarkowitzOptimisationError(
            f"Covariance matrix does not contain the requested ISINs: {formatted}"
        )

    cov = cov.fillna(0.0)
    return cov


def optimize_portfolio_weights(
    isins: Sequence[str],
    *,
    target_return: Optional[float] = None,
    target_risk: Optional[float] = None,
    predictions_path: Optional[Path | str] = None,
    covariance_path: Optional[Path | str] = None,
    allow_short: bool = False,
    solver: Optional[str] = None,
) -> List[float]:
    """
    Solve a Markowitz mean-variance optimisation problem for the selected ISINs.

    Exactly one of ``target_return`` or ``target_risk`` must be provided:

    * ``target_return``: minimise portfolio variance subject to the expected
      daily return meeting or exceeding this target.
    * ``target_risk``: maximise expected daily return subject to the portfolio
      standard deviation not exceeding this value.

    Parameters
    ----------
    isins:
        Sequence of ISIN codes. The returned weights follow this order.
    target_return:
        Minimum expected daily return for the portfolio (fractional, e.g. 0.001).
    target_risk:
        Maximum allowed daily standard deviation (fractional, e.g. 0.02).
    predictions_path:
        Optional override for ``predictions.csv``.
    covariance_path:
        Optional override for ``covariance.csv``.
    allow_short:
        When ``True`` the optimiser may allocate negative weights.
    solver:
        Optional cvxpy solver name (e.g. ``"OSQP"``). Defaults to cvxpy's
        automatic selection.
    """
    clean_isins = _validate_isins(isins)

    if (target_return is None) == (target_risk is None):
        raise ValueError("Provide exactly one of target_return or target_risk.")

    predictions_file = _resolve_path("predictions.csv", predictions_path)
    covariance_file = _resolve_path("covariance.csv", covariance_path)

    expected_returns = _load_expected_returns(clean_isins, predictions_file)
    covariance = _load_covariance_matrix(clean_isins, covariance_file)

    returns_vector = expected_returns.to_numpy(dtype=float)
    covariance_matrix = covariance.to_numpy(dtype=float)
    covariance_matrix = 0.5 * (covariance_matrix + covariance_matrix.T)

    n_assets = len(clean_isins)
    weights = cp.Variable(n_assets)

    constraints = [cp.sum(weights) == 1]
    if not allow_short:
        constraints.append(weights >= 0)

    variance_expression = cp.quad_form(weights, covariance_matrix)
    return_expression = returns_vector @ weights

    if target_return is not None:
        constraints.append(return_expression >= float(target_return))
        objective = cp.Minimize(variance_expression)
    else:
        if target_risk is not None and target_risk < 0:
            raise ValueError("target_risk must be non-negative.")
        constraints.append(variance_expression <= float(target_risk) ** 2)
        objective = cp.Maximize(return_expression)

    problem = cp.Problem(objective, constraints)

    solve_kwargs = {}
    if solver:
        solve_kwargs["solver"] = solver
    else:
        # Fall back to SCS which is bundled with cvxpy and handles quadratic programs.
        solve_kwargs["solver"] = cp.SCS
    try:
        problem.solve(**solve_kwargs)
    except cp.SolverError as exc:
        raise MarkowitzOptimisationError("Failed to solve the optimisation problem.") from exc

    if problem.status not in {cp.OPTIMAL, cp.OPTIMAL_INACCURATE}:
        if problem.status in {cp.INFEASIBLE, cp.INFEASIBLE_INACCURATE}:
            raise MarkowitzOptimisationError(
                "You are over optimistic, please try lower expected returns / higher risk tolerance."
            )
        raise MarkowitzOptimisationError(f"Optimisation failed with status: {problem.status}")

    solution = np.asarray(weights.value, dtype=float).reshape(-1)
    if solution.size != n_assets:
        raise MarkowitzOptimisationError("Unexpected solver output size.")

    # Clean small numerical noise and renormalise.
    if not allow_short:
        solution = np.maximum(solution, 0.0)

    total = solution.sum()
    if np.isclose(total, 0.0):
        raise MarkowitzOptimisationError("Optimised weights sum to zero.")

    normalised = solution / total
    return normalised.tolist()


def calculate_return_and_risk(
    isins: Sequence[str],
    weights: Sequence[float],
    *,
    predictions_path: Optional[Path | str] = None,
    covariance_path: Optional[Path | str] = None,
) -> tuple[float, float]:
    """
    Compute portfolio expected return and risk for a given allocation.

    Parameters
    ----------
    isins:
        Sequence of ISIN codes that matches the weight ordering.
    weights:
        Portfolio weights aligned with ``isins``.
    predictions_path:
        Optional override for ``predictions.csv``.
    covariance_path:
        Optional override for ``covariance.csv``.

    Returns
    -------
    (expected_return, risk)
        Expected daily return and standard deviation implied by the inputs.
    """
    clean_isins = _validate_isins(isins)
    weight_array = np.asarray(weights, dtype=float).reshape(-1)

    if weight_array.size != len(clean_isins):
        raise ValueError("weights length must match the number of ISINs.")
    if not np.all(np.isfinite(weight_array)):
        raise ValueError("weights must be finite numbers.")

    predictions_file = _resolve_path("predictions.csv", predictions_path)
    covariance_file = _resolve_path("covariance.csv", covariance_path)

    expected_returns = _load_expected_returns(clean_isins, predictions_file)
    covariance = _load_covariance_matrix(clean_isins, covariance_file)

    returns_vector = expected_returns.to_numpy(dtype=float)
    covariance_matrix = covariance.to_numpy(dtype=float)
    covariance_matrix = 0.5 * (covariance_matrix + covariance_matrix.T)

    expected_return = float(returns_vector @ weight_array)
    variance = float(weight_array @ covariance_matrix @ weight_array)
    risk = float(np.sqrt(max(variance, 0.0)))

    return expected_return, risk


__all__ = [
    "optimize_portfolio_weights",
    "calculate_return_and_risk",
    "MarkowitzOptimisationError",
]


def _parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    """
    Parse CLI arguments for the module's test harness.
    """
    parser = argparse.ArgumentParser(
        description="Run a Markowitz portfolio optimisation for a list of ISINs."
    )
    parser.add_argument(
        "isins",
        nargs="+",
        help="Ordered list of ISIN codes for the optimisation universe.",
    )
    parser.add_argument(
        "--target-return",
        type=float,
        default=None,
        help="Minimum expected daily return (e.g. 0.001).",
    )
    parser.add_argument(
        "--target-risk",
        type=float,
        default=None,
        help="Maximum allowed daily standard deviation (e.g. 0.02).",
    )
    parser.add_argument(
        "--predictions",
        type=str,
        default=None,
        help="Optional path to predictions.csv.",
    )
    parser.add_argument(
        "--covariance",
        type=str,
        default=None,
        help="Optional path to covariance.csv.",
    )
    parser.add_argument(
        "--allow-short",
        action="store_true",
        help="Permit short positions (negative weights).",
    )
    parser.add_argument(
        "--solver",
        type=str,
        default=None,
        help="Optional cvxpy solver name override (e.g. OSQP).",
    )
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> None:
    """
    Test harness to run the optimiser from the command line.
    """
    args = _parse_args(argv)
    try:
        weights = optimize_portfolio_weights(
            args.isins,
            target_return=args.target_return,
            target_risk=args.target_risk,
            predictions_path=args.predictions,
            covariance_path=args.covariance,
            allow_short=args.allow_short,
            solver=args.solver,
        )
    except Exception as exc:  # pragma: no cover - CLI convenience
        raise SystemExit(f"Optimisation failed: {exc}") from exc

    for isin, weight in zip(args.isins, weights):
        print(f"{isin}: {weight:.6f}")

    expected_return, risk = calculate_return_and_risk(
        args.isins,
        weights,
        predictions_path=args.predictions,
        covariance_path=args.covariance,
    )

    print(f"Expected daily return: {expected_return:.6f}")
    print(f"Expected daily risk: {risk:.6f}")


if __name__ == "__main__":  # pragma: no cover
    main()
