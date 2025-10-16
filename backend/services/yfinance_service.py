import logging
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

import pandas as pd
import yfinance as yf

from constants.common_stocks import common_stocks

logger = logging.getLogger(__name__)


class YFinanceService:
    """Service layer for fetching real-time and historical stock data from yfinance."""

    @staticmethod
    def search_stocks(query: str, limit: int = 10) -> List[Dict[str, str]]:
        """
        Search for stocks by symbol or company name using a curated list for now.
        """
        try:
            query_lower = query.lower()
            results: List[Dict[str, str]] = []

            for symbol, name in common_stocks:
                if query_lower in symbol.lower() or query_lower in name.lower():
                    results.append({"symbol": symbol, "name": name})
                    if len(results) >= limit:
                        break

            return results
        except Exception as error:  # pragma: no cover - defensive logging
            logger.error("Error searching stocks: %s", error)
            return []

    @staticmethod
    def get_realtime_stock_data(symbol: str) -> Dict[str, Any]:
        """
        Fetch real-time stock information including current price and company name.
        """
        try:
            ticker = yf.Ticker(symbol.upper())
            history = ticker.history(period="1d")

            if history.empty:
                raise ValueError(f"Invalid stock symbol: {symbol}")

            current_price = float(history["Close"].iloc[-1])
            info = ticker.info
            company_name = info.get("longName", info.get("shortName", symbol.upper()))

            return {
                "symbol": symbol.upper(),
                "name": company_name,
                "currentPrice": round(current_price, 2),
            }
        except ValueError:
            raise
        except Exception as error:  # pragma: no cover - defensive logging
            logger.error("Error fetching real-time data for %s: %s", symbol, error)
            raise ValueError(f"Failed to fetch stock data: {error}")

    @staticmethod
    def get_batch_realtime_prices(symbols: List[str]) -> Dict[str, Optional[float]]:
        """
        Fetch real-time prices for multiple stocks.
        """
        results: Dict[str, Optional[float]] = {}

        for symbol in symbols:
            symbol_upper = symbol.upper()
            try:
                ticker = yf.Ticker(symbol_upper)
                history = ticker.history(period="1d")

                if not history.empty:
                    results[symbol_upper] = round(float(history["Close"].iloc[-1]), 2)
                else:
                    results[symbol_upper] = None
                    logger.warning("No real-time data found for symbol: %s", symbol_upper)
            except Exception as error:  # pragma: no cover - defensive logging
                logger.error(
                    "Error fetching real-time price for %s: %s", symbol_upper, error
                )
                results[symbol_upper] = None

        return results

    @staticmethod
    def get_historical_price(symbol: str, target_date: date) -> Dict[str, Any]:
        """
        Fetch the closing price for a stock on or before the specified date.
        """
        try:
            ticker = yf.Ticker(symbol.upper())

            start_date = target_date - timedelta(days=10)
            end_date = target_date + timedelta(days=1)
            history = ticker.history(
                start=start_date.isoformat(),
                end=end_date.isoformat(),
            )

            if history.empty:
                raise ValueError(
                    f"No historical pricing data found for {symbol.upper()} "
                    f"around {target_date.isoformat()}"
                )

            history = history[history.index.date <= target_date]

            if history.empty:
                raise ValueError(
                    "No trading data available on or before "
                    f"{target_date.isoformat()} for {symbol.upper()}"
                )

            last_row = history.iloc[-1]
            close_price = round(float(last_row["Close"]), 2)
            price_date = history.index[-1].date()

            return {"price": close_price, "price_date": price_date}
        except ValueError:
            raise
        except Exception as error:  # pragma: no cover - defensive logging
            logger.error(
                "Error fetching historical price for %s on %s: %s",
                symbol,
                target_date,
                error,
            )
            raise ValueError(f"Failed to fetch historical price: {error}")

    @staticmethod
    def get_historical_series(
        symbols: List[str], start_date: date, end_date: date
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Fetch daily closing prices for multiple symbols within a date range.
        """
        results: Dict[str, List[Dict[str, Any]]] = {}
        inclusive_end = end_date + timedelta(days=1)

        for symbol in symbols:
            symbol_upper = symbol.upper()
            try:
                ticker = yf.Ticker(symbol_upper)
                history = ticker.history(
                    start=start_date.isoformat(),
                    end=inclusive_end.isoformat(),
                )

                if history.empty:
                    logger.warning(
                        "No historical series found for %s between %s and %s",
                        symbol_upper,
                        start_date.isoformat(),
                        end_date.isoformat(),
                    )
                    results[symbol_upper] = []
                    continue

                history = history.sort_index()

                series: List[Dict[str, Any]] = []
                for index, row in history.iterrows():
                    close_price = row.get("Close")
                    if close_price is None or pd.isna(close_price):
                        continue
                    series.append(
                        {
                            "date": index.date(),
                            "price": round(float(close_price), 2),
                        }
                    )

                results[symbol_upper] = series
            except Exception as error:  # pragma: no cover - defensive logging
                logger.error(
                    "Error fetching historical series for %s between %s and %s: %s",
                    symbol_upper,
                    start_date.isoformat(),
                    end_date.isoformat(),
                    error,
                )
                results[symbol_upper] = []

        return results
