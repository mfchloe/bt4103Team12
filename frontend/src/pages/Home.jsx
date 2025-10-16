import { useEffect, useRef, useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import { TrendingUp, DollarSign, BarChart3 } from "lucide-react";

import PortfolioTable from "../components/home/PortfolioTable";
import RecommendationsDialog from "../components/home/RecommendationsDialog";
import AddStockDialog from "../components/home/AddStockDialog";
import PortfolioChart from "../components/home/PortfolioChart";
import StatsSection from "../components/home/StatsSection";
import {
  calculateTotalValue,
  calculateTotalPL,
  calculateTotalReturn,
  calculateSharpeRatio,
} from "../utils/mathHelpers";

const STOCK_PRICE_API_URL = "http://localhost:8000/api/yfinance/batch";

const Home = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);

  const portfolioRef = useRef(portfolio);

  useEffect(() => {
    portfolioRef.current = portfolio;
  }, [portfolio]);

  useEffect(() => {
    if (portfolio.length === 0) return;

    const refreshPrices = async () => {
      try {
        const symbols = portfolioRef.current.map((stock) => stock.symbol);
        const response = await fetch(STOCK_PRICE_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbols }),
        });

        const data = await response.json();
        if (data.success) {
          setPortfolio((prevPortfolio) =>
            prevPortfolio.map((stock) => ({
              ...stock,
              currentPrice:
                data.prices[stock.symbol] !== undefined
                  ? data.prices[stock.symbol]
                  : stock.currentPrice,
            }))
          );
        }
      } catch (error) {
        console.error("Failed to refresh prices:", error);
      }
    };

    refreshPrices();
    const interval = setInterval(refreshPrices, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const totalValue = calculateTotalValue(portfolio);
  const totalPL = calculateTotalPL(portfolio);
  const totalReturn = calculateTotalReturn(portfolio);
  const sharpeRatio = calculateSharpeRatio(portfolio);

  const handleAddStock = (stock) => {
    setPortfolio((prev) => [...prev, { ...stock, id: Date.now() }]);
  };

  const handleRemoveStock = (id) => {
    setPortfolio((prev) => prev.filter((stock) => stock.id !== id));
  };

  const handleAddRecommendation = (stock) => {
    handleAddStock(stock);
    setShowRecommendations(false);
  };

  return (
    <Box sx={styles.container}>
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        <Typography variant="h4" sx={styles.header}>
          My Portfolio
        </Typography>

        <PortfolioTable
          portfolio={portfolio}
          onRemove={handleRemoveStock}
          onAddStock={() => setShowAddStock(true)}
        />

        <Box sx={styles.buttonsContainer}>
          <Button
            onClick={() => setShowAddStock(true)}
            sx={[styles.button, { bgcolor: "#305D9E" }]}
          >
            Add Stock
          </Button>
          <Button
            onClick={() => setShowRecommendations(true)}
            disabled={portfolio.length === 0}
            sx={[styles.button, styles.reccoButton]}
          >
            Get Recommendations
          </Button>
        </Box>

        <StatsSection
          totalValue={totalValue}
          totalPL={totalPL}
          totalReturn={totalReturn}
          sharpeRatio={sharpeRatio}
        />

        <Box
          sx={{ bgcolor: "white", borderRadius: 3, p: 3, mb: 6, boxShadow: 1 }}
        >
          {portfolio.length > 0 ? (
            <PortfolioChart portfolio={portfolio} />
          ) : (
            <Typography sx={styles.chartPreviewText}>
              Add stocks to your portfolio to see charts
            </Typography>
          )}
        </Box>

        <AddStockDialog
          open={showAddStock}
          onClose={() => setShowAddStock(false)}
          onAdd={handleAddStock}
        />

        <RecommendationsDialog
          open={showRecommendations}
          onClose={() => setShowRecommendations(false)}
          onAdd={handleAddRecommendation}
          currentPortfolio={portfolio}
        />
      </Box>
    </Box>
  );
};

export default Home;

const styles = {
  container: {
    minHeight: "100vh",
    p: 3,
  },
  header: {
    fontWeight: "bold",
    color: "#305D9E",
    mb: 4,
  },
  buttonsContainer: {
    display: "flex",
    justifyContent: "center",
    gap: 2,
    mt: 4,
    mb: 6,
  },
  button: {
    color: "white",
    px: 3,
    py: 1.5,
    "&:hover": { bgcolor: "#254a7d" },
  },
  reccoButton: {
    bgcolor: "#2E8B8B",
    "&:disabled": { bgcolor: "#cccccc" },
    "&:hover": { bgcolor: "#267373" },
  },
  chartPreviewText: {
    color: "#9ca3af",
    fontStyle: "italic",
    textAlign: "center",
    py: 6,
  },
};
