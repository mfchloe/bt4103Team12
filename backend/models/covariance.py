"""
Utility script to compute a covariance matrix for ISIN daily returns.

The script reads `close_prices.csv`, aligns each ISIN's price series,
computes daily percentage returns, derives their pairwise covariances
using overlapping periods, replaces missing values with zeros (for
non-overlapping pairs), and writes the result to `covariance.csv`.
"""

from pathlib import Path

import pandas as pd


def compute_covariance_matrix(
    input_path: Path,
    output_path: Path,
) -> None:
    """
    Compute and persist an ISIN-by-ISIN covariance matrix of daily returns.

    Parameters
    ----------
    input_path:
        CSV file with columns [ISIN, timestamp, closePrice].
    output_path:
        Destination CSV file for the covariance matrix.
    """
    df = pd.read_csv(input_path, parse_dates=["timestamp"])
    df["closePrice"] = pd.to_numeric(df["closePrice"], errors="coerce")
    df = df.dropna(subset=["closePrice"])

    if df.empty:
        # Handle edge case gracefully by writing an empty frame.
        output_path.parent.mkdir(parents=True, exist_ok=True)
        pd.DataFrame().to_csv(output_path)
        return

    # Pivot to wide format with timestamps as rows and ISINs as columns.
    price_matrix = df.pivot_table(
        index="timestamp",
        columns="ISIN",
        values="closePrice",
        aggfunc="last",
    ).sort_index()

    # Compute simple daily returns as percentage change.
    daily_returns = price_matrix.pct_change()
    daily_returns = daily_returns.dropna(how="all")

    # Compute pairwise covariance using overlapping data only.
    covariance = daily_returns.cov(min_periods=1)

    # Ensure deterministic ordering and include ISINs with zero overlap.
    sorted_isins = sorted(price_matrix.columns.tolist())
    covariance = covariance.reindex(
        index=sorted_isins,
        columns=sorted_isins,
        fill_value=0.0,
    )

    # Replace NaNs (including no-overlap pairs) with zeros.
    covariance = covariance.fillna(0.0)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    covariance.to_csv(output_path, float_format="%.10f")


def main() -> None:
    base_path = Path(__file__).resolve().parent.parent
    datasets_dir = base_path / "datasets"
    input_csv = datasets_dir / "close_prices.csv"
    output_csv = datasets_dir / "covariance.csv"

    compute_covariance_matrix(input_csv, output_csv)


if __name__ == "__main__":
    main()
