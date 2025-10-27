import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";

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
import { useAuth } from "../context/AuthContext.jsx";
import { apiBaseUrl } from "../api/httpClient.js";
import dayjs from "dayjs";

const STOCK_PRICE_API_URL = `${apiBaseUrl}/api/yfinance/batch`;

const Home = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  const { authFetch, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const portfolioRef = useRef(portfolio);

  useEffect(() => {
    portfolioRef.current = portfolio;
  }, [portfolio]);

  const mapServerItem = useCallback(
    (item) => ({
      id: item.id,
      symbol: item.symbol,
      name: item.name,
      shares: item.shares,
      buyPrice: item.buy_price,
      buyDate: item.buy_date,
      currentPrice: item.current_price,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }),
    []
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setPortfolio([]);
      return;
    }

    const controller = new AbortController();
    const loadPortfolio = async () => {
      setPortfolioLoading(true);
      setApiError(null);
      try {
        const items = await authFetch("/api/portfolio/", {
          signal: controller.signal,
        });
        setPortfolio(items.map(mapServerItem));
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error?.status === 401) {
          setPortfolio([]);
          setApiError(null);
          return;
        }
        setApiError(error.message || "Failed to load portfolio.");
      } finally {
        if (!controller.signal.aborted) {
          setPortfolioLoading(false);
        }
      }
    };

    loadPortfolio();
    return () => controller.abort();
  }, [authFetch, isAuthenticated, mapServerItem]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!portfolioRef.current.length) return;

    const refreshPrices = async () => {
      try {
        const symbols = portfolioRef.current.map((stock) => stock.symbol);
        if (!symbols.length) return;

        const response = await fetch(STOCK_PRICE_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbols }),
        });

        const data = await response.json();
        if (!data.success) return;

        const pendingUpdates = [];
        setPortfolio((prevPortfolio) =>
          prevPortfolio.map((stock) => {
            const updatedPrice = data.prices[stock.symbol];
            if (updatedPrice === undefined) {
              return stock;
            }
            pendingUpdates.push({ id: stock.id, current_price: updatedPrice });
            return { ...stock, currentPrice: updatedPrice };
          })
        );

        pendingUpdates.forEach(({ id, current_price }) => {
          authFetch(`/api/portfolio/${id}`, {
            method: "PUT",
            body: { current_price },
          }).catch((error) =>
            console.warn(`Failed to sync price for item ${id}`, error)
          );
        });
      } catch (error) {
        console.error("Failed to refresh prices:", error);
      }
    };

    refreshPrices();
    const interval = setInterval(refreshPrices, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [authFetch, isAuthenticated, portfolio.length]);

  const totalValue = calculateTotalValue(portfolio);
  const totalPL = calculateTotalPL(portfolio);
  const totalReturn = calculateTotalReturn(portfolio);
  const sharpeRatio = calculateSharpeRatio(portfolio);

  const handleAddStock = useCallback(
    async (stock) => {
      const payload = {
        symbol: stock.symbol?.toUpperCase(),
        name: stock.name,
        shares: Number(stock.shares),
        buy_price: Number(stock.buyPrice),
        buy_date: stock.buyDate
          ? dayjs(stock.buyDate).format("YYYY-MM-DD")
          : null,
        current_price:
          stock.currentPrice !== undefined ? Number(stock.currentPrice) : null,
      };

      const created = await authFetch("/api/portfolio/", {
        method: "POST",
        body: payload,
      });
      setPortfolio((prev) => [...prev, mapServerItem(created)]);
    },
    [authFetch, mapServerItem]
  );

  const handleRemoveStock = useCallback(
    async (id) => {
      await authFetch(`/api/portfolio/${id}`, { method: "DELETE" });
      setPortfolio((prev) => prev.filter((stock) => stock.id !== id));
    },
    [authFetch]
  );

  const handleAddRecommendation = useCallback(
    async (stock) => {
      await handleAddStock(stock);
      setShowRecommendations(false);
    },
    [handleAddStock]
  );

  return (
    
    <Box sx={styles.container}>
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        {/* Header Row */}
        <Box sx={styles.topBar}>
          <Typography variant="h4" sx={styles.header}>
            My Portfolio
          </Typography>

          {/* Button group on the top-right */}
          <Box sx={styles.txButtonsGroup}>
            <Button
              onClick={() => navigate("/transactions")}
              sx={styles.txButtonTop}
              variant="contained"
            >
              My Transactions
            </Button>

            <Button
              onClick={() => navigate("/myCharts")}
              sx={styles.txButtonTop}
              variant="contained"
            >
              My Charts
            </Button>
          </Box>
        </Box>

        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}

        {portfolioLoading ? (
          <Box sx={styles.loader}>
            <CircularProgress />
          </Box>
        ) : (
          <PortfolioTable
            portfolio={portfolio}
            onRemove={handleRemoveStock}
            onAddStock={() => setShowAddStock(true)}
          />
        )}

        <Box sx={styles.buttonsContainer}>
          <Button
            onClick={() => setShowAddStock(true)}
            sx={[styles.button, { bgcolor: "#305D9E" }]}
          >
            Add Stock
          </Button>
          <Button
            onClick={() => setShowRecommendations(true)}
            disabled={portfolioLoading || portfolio.length === 0}
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
  loader: {
    bgcolor: "white",
    borderRadius: 3,
    boxShadow: 1,
    py: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  topBar: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  mb: 2,
  flexWrap: "wrap", // makes it responsive
  },
  txButtonsGroup: {
    display: "flex",
    gap: 2,
    ml: "auto",
  },
  txButtonTop: {
    bgcolor: "#305D9E",
    "&:hover": { bgcolor: "#254a7d" },
  },

};
