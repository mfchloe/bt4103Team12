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
  calculateTotalCost,
  calculateTotalPL,
  calculateTotalReturn,
} from "../utils/mathHelpers";
const Home = () => {
  const [portfolio, setPortfolio] = useState([]);
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

        {/* Stats Section */}

        {/* Stat Cards */}
        <Grid container spacing={3} mb={6}>
          <Grid item xs={12} md={4}>
            <StatCard
              title="Total Portfolio Value"
              value={`$${totalValue.toFixed(2)}`}
              icon={DollarSign}
              trend={totalReturn}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <StatCard
              title="Today's P&L"
              value={
                totalPL >= 0
                  ? `+$${totalPL.toFixed(2)}`
                  : `-$${Math.abs(totalPL).toFixed(2)}`
              }
              icon={TrendingUp}
              trend={totalPL >= 0 ? 2.1 : -2.1}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <StatCard
              title="Total Return"
              value={`${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(2)}%`}
              icon={BarChart3}
              trend={totalReturn}
            />
          </Grid>
        </Grid>

        {/* charts section */}
        <Box
          sx={{ bgcolor: "white", borderRadius: 3, p: 3, mb: 6, boxShadow: 1 }}
        >
          {/* piechart */}
          {portfolio.length > 0 ? (
            <PortfolioChart portfolio={portfolio} />
          ) : (
            <Typography sx={styles.chartPreviewText}>
              Add stocks to your portfolio to see charts
            </Typography>
          )}
        </Box>

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
