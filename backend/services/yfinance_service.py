import yfinance as yf
from typing import Dict, Optional, List
import logging
from constants.common_stocks import common_stocks

logger = logging.getLogger(__name__)

class YFinanceService:
    """Service layer for fetching real-time stock data from yfinance (Yahoo Finance)"""
    
    # 1. search for stock
    @staticmethod
    def search_stocks(query: str, limit: int = 10) -> List[Dict]:
        """
        Search for stocks by symbol or company name
        
        Args:
            query: Search query string
            limit: Maximum number of results to return
            
        Returns:
            List of matching stocks with symbol and name
        """
        try:
            # yfinance doesn't have a built-in search, so we'll use a common stock list (manual from chatgpt lol)

            # convert to lowercase          
            query_lower = query.lower()
            results = []
            
            for symbol, name in common_stocks:
                if (query_lower in symbol.lower() or 
                    query_lower in name.lower()):
                    results.append({
                        "symbol": symbol,
                        "name": name
                    })
                    
                    if len(results) >= limit:
                        break
            
            return results
        
        except Exception as e:
            logger.error(f"Error searching stocks: {str(e)}")
            return []
        
    # getch realtime info based on symbol
    @staticmethod
    def get_realtime_stock_data(symbol: str) -> Dict:
        """
        Fetch real-time stock information including current price and company name
        
        Args:
            symbol: Stock ticker symbol (e.g., 'AAPL')
            
        Returns:
            Dictionary with stock information
            
        Raises:
            ValueError: If symbol is invalid or data cannot be fetched
        """
        try:
            ticker = yf.Ticker(symbol.upper())
            data = ticker.history(period='1d')
            
            if data.empty:
                raise ValueError(f'Invalid stock symbol: {symbol}')
            
            current_price = float(data['Close'].iloc[-1])
            
            # get company info
            info = ticker.info
            company_name = info.get('longName', info.get('shortName', symbol.upper()))
            
            return {
                'symbol': symbol.upper(),
                'name': company_name,
                'currentPrice': round(current_price, 2)
            }
        
        except ValueError:
            raise
        except Exception as e:
            
            logger.error(f"Error fetching real-time data for {symbol}: {str(e)}")
            raise ValueError(f'Failed to fetch stock data: {str(e)}')
    
    # get prices by batch
    @staticmethod
    def get_batch_realtime_prices(symbols: List[str]) -> Dict[str, Optional[float]]:
        """
        Fetch real-time prices for multiple stocks
        
        Args:
            symbols: List of stock ticker symbols
            
        Returns:
            Dictionary mapping symbols to their current prices
        """
        results = {}
        
        for symbol in symbols:
            try:
                ticker = yf.Ticker(symbol.upper())
                hist = ticker.history(period='1d')
                
                if not hist.empty:
                    results[symbol.upper()] = round(float(hist['Close'].iloc[-1]), 2)
                else:
                    results[symbol.upper()] = None
                    logger.warning(f"No real-time data found for symbol: {symbol}")
            
            except Exception as e:
                logger.error(f"Error fetching real-time price for {symbol}: {str(e)}")
                results[symbol.upper()] = None
        
        return results