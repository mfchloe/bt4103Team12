import { useState, useEffect, useRef } from "react";
import { Box, Typography, Grid, Button } from "@mui/material";
import { TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import StatCard from "../components/StatCard";
import PortfolioTable from "../components/home/PortfolioTable";
import RecommendationsDialog from "../components/home/RecommendationsDialog";
import AddStockDialog from "../components/home/AddStockDialog";
import PortfolioChart from "../components/home/PortfolioChart";
import {
  calculateTotalValue,
  calculateTotalPL,
  calculateTotalReturn,
  calculateSharpeRatio,
} from "../utils/mathHelpers";
import CustomButton from "../components/CustomButton";
import ChartsSection from "../components/home/ChartsSection";
import StatsSection from "../components/home/StatsSection";
const PLACEHOLDER_PORTFOLIO = [
  {
    id: 1,
    symbol: "AAPL",
    name: "Apple Inc.",
    shares: 10,
    buyPrice: 150.0,
    currentPrice: 180.25,
  },
  {
    id: 2,
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    shares: 5,
    buyPrice: 2500.0,
    currentPrice: 2800.5,
  },
  {
    id: 3,
    symbol: "TSLA",
    name: "Tesla Inc.",
    shares: 8,
    buyPrice: 600.0,
    currentPrice: 700.0,
  },
  {
    id: 4,
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    shares: 3,
    buyPrice: 3100.0,
    currentPrice: 3300.0,
  },
  {
    id: 5,
    symbol: "MSFT",
    name: "Microsoft Corp.",
    shares: 12,
    buyPrice: 280.0,
    currentPrice: 310.0,
  },
];

const Home = () => {
  const [portfolio, setPortfolio] = useState(PLACEHOLDER_PORTFOLIO);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);

  const STOCK_PRICE_API_URL = "http://localhost:8000/api/yfinance/batch";

  const portfolioRef = useRef(portfolio);

  // refresh stock prices every 5 minutes!
  useEffect(() => {
    if (portfolio.length === 0) return;

    const refreshPrices = async () => {
      try {
        // get symbols from current portfolio
        const symbols = portfolioRef.current.map((stock) => stock.symbol);

        // send to backend
        const response = await fetch(STOCK_PRICE_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ symbols }),
        });

        // fetch result! (jsonify the response first)
        const data = await response.json();

        if (data.success) {
          //  reset portfolio data
          setPortfolio((prevPortfolio) =>
            prevPortfolio.map((stock) => ({
              ...stock,
              currentPrice: data.prices[stock.symbol] || stock.currentPrice, // reset back to currentPrice if realtime info not avail..
            }))
          );
        }
      } catch (error) {
        console.error("Failed to refresh prices:", error);
      }
    };

    // refresh immediately ON MOUNT
    refreshPrices();

    // then refresh every 1 hour (can change this)
    const interval = setInterval(refreshPrices, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(interval);
  }, []);

  // get STATS
  const totalValue = calculateTotalValue(portfolio);
  // const totalCost = calculateTotalCost(portfolio);
  const totalPL = calculateTotalPL(portfolio);
  const totalReturn = calculateTotalReturn(portfolio);
  const sharpeRatio = calculateSharpeRatio(portfolio);

  // portfolio table's CRUD operations
  const handleAddStock = (stock) => {
    setPortfolio([...portfolio, { ...stock, id: Date.now() }]);
  };

  const handleRemoveStock = (id) => {
    setPortfolio(portfolio.filter((stock) => stock.id !== id));
  };

  const handleAddRecommendation = (stock) => {
    handleAddStock(stock);
    setShowRecommendations(false);
  };

  return (
    <Box sx={styles.container}>
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        {/* Portfolio Section */}
        <Typography variant="h4" sx={styles.header}>
          My Portfolio
        </Typography>

        <PortfolioTable
          portfolio={portfolio}
          onRemove={handleRemoveStock}
          onAddStock={() => setShowAddStock(true)}
        />

        {/* Action Buttons */}
        <Box sx={styles.buttonsContainer}>
          <CustomButton
            onClick={() => setShowAddStock(true)}
            sx={[styles.button, { bgcolor: "#305D9E" }]}
          >
            Add Stock
          </CustomButton>
          <CustomButton
            onClick={() => setShowRecommendations(true)}
            disabled={portfolio.length === 0}
            sx={[styles.button, styles.reccoButton]}
          >
            Get Recommendations
          </CustomButton>
        </Box>

        {/* Stats Section */}

        <StatsSection
          totalValue={totalValue}
          totalPL={totalPL}
          totalReturn={totalReturn}
          sharpeRatio={sharpeRatio}
        />

        {/* charts section */}
        <ChartsSection portfolio={portfolio} />

        {/* dialogs */}
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
