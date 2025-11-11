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
import StatsSection from "../components/home/StatsSection";
import UserProfileDialog from "../components/home/UserProfileDialog.jsx";
import ChartsSection from "../components/home/ChartsSection.jsx";
import {
  calculateTotalValue,
  calculateTotalPL,
  calculateTotalReturn,
  calculateSharpeRatio,
} from "../utils/mathHelpers";
import { useAuth } from "../context/AuthContext.jsx";
import { apiBaseUrl } from "../api/httpClient.js";
import dayjs from "dayjs";
import { db } from "../../firebase.jsx";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useApi } from "../hooks/useApi.js";
const STOCK_PRICE_API_URL = `${apiBaseUrl}/api/dataset/timeseries/batch`;

const Home = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  const {
    authFetch,
    isAuthenticated,
    currentUser,
    farCustomerSession,
    isFirebaseUser,
    isFarCustomer,
  } = useAuth();
  const navigate = useNavigate();

  const portfolioRef = useRef(portfolio);

  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileInitial, setProfileInitial] = useState(null);
  const checkedProfileRef = useRef(false);

  // recommendations
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState(null);

  const CLUSTER_API_URL = `${apiBaseUrl}/cluster/predict`;

  const handleFetchRecommendations = async () => {
    if (!isAuthenticated) return;

    const existingPortfolio = portfolio.map((s) => s.symbol).filter(Boolean);
    const userId = isFirebaseUser
      ? currentUser.uid
      : farCustomerSession?.customerId;

    try {
      const res = await fetch(
        "http://localhost:8000/api/recommendation/recommend",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_id: userId,
            existing_portfolio: existingPortfolio,
          }),
        }
      );

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson?.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log("Recommendations API response:", data);

      setShowRecommendations(true);

      // Optionally store them in state
      setRecommendations(data.recommendations || []);
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
    }
  };

  async function fetchClusterForProfile({
    investorType,
    customerType,
    riskLevel,
    diversificationScore,
    investmentCapacity,
  }) {
    // Map frontend keys -> backend keys
    const body = {
      investor_type: investorType,
      customer_type: customerType,
      risk_level: riskLevel,
      capacity: investmentCapacity,
      diversification: Number(diversificationScore),
    };

    const res = await fetch(CLUSTER_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Cluster API failed (${res.status})`);
    }
    const data = await res.json();
    if (typeof data?.cluster !== "number") {
      throw new Error("Cluster API returned an invalid response.");
    }
    return data.cluster; // integer ID
  }

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
      totalBuyValue: item.total_buy_value,
      totalSellValue: item.total_sell_value,
      realizedPl: item.realized_pl,
      remainingCost: item.remaining_cost,
      isSynthetic: Boolean(item.synthetic),
      lastSeenPrice:
        item.last_seen_price !== undefined && item.last_seen_price !== null
          ? item.last_seen_price
          : item.buy_price,
      lastSeenDate: item.last_seen_date || item.buy_date,
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
        const symbols = portfolioRef.current
          .map((stock) => stock.symbol && stock.symbol.toUpperCase())
          .filter(Boolean);
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
            if (updatedPrice === undefined || updatedPrice === null) {
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

  const handleAddStock = useCallback((stock) => {
    // Create a new stock object locally
    const newStock = {
      id: `local-${Date.now()}`, // unique id for React key
      symbol: stock.symbol?.toUpperCase(),
      name: stock.name,
      shares: Number(stock.shares),
      buyPrice: Number(stock.buyPrice),
      buyDate: stock.buyDate ? dayjs(stock.buyDate).format("YYYY-MM-DD") : null,
      currentPrice:
        stock.currentPrice !== undefined ? Number(stock.currentPrice) : null,
      isSynthetic: false,
      lastSeenPrice:
        stock.currentPrice !== undefined ? Number(stock.currentPrice) : null,
      lastSeenDate: stock.buyDate
        ? dayjs(stock.buyDate).format("YYYY-MM-DD")
        : null,
      isNew: true, // mark as new for highlighting
    };

    setPortfolio((prev) => [...prev, newStock]);
  }, []);

  const handleRemoveStock = useCallback((id) => {
    setPortfolio((prev) => prev.filter((stock) => stock.id !== id));
  }, []);

  useEffect(() => {
    // Only run once per mount after auth is ready
    if (!isAuthenticated || !currentUser?.uid || checkedProfileRef.current)
      return;

    const run = async () => {
      try {
        const ref = doc(db, "users", currentUser.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          // brand new user — show dialog
          setProfileInitial(null);
          setShowProfileDialog(true);
        } else {
          const data = snap.data() || {};
          const hasAll =
            data.investorType &&
            data.customerType &&
            data.riskLevel &&
            typeof data.diversificationScore === "number" &&
            data.investmentCapacity;

          setProfileInitial({
            investorType: data.investorType || "",
            customerType: data.customerType || "",
            riskLevel: data.riskLevel || "",
            diversificationScore:
              typeof data.diversificationScore === "number"
                ? data.diversificationScore
                : undefined,
            investmentCapacity: data.investmentCapacity || "",
          });

          if (!hasAll || data.profileCompleted === false) {
            setShowProfileDialog(true);
          }
        }
      } catch (e) {
        console.warn("Failed to check user profile:", e);
        // Fail-open: don’t block portfolio; you can optionally show a toast here.
      } finally {
        checkedProfileRef.current = true;
      }
    };

    run();
  }, [isAuthenticated, currentUser?.uid]);

  const handleAddRecommendation = useCallback(
    async (stock) => {
      await handleAddStock(stock);
      setShowRecommendations(false);
    },
    [handleAddStock]
  );

  const handleSaveProfile = async (payload) => {
    // payload has: investorType, customerType, riskLevel, diversificationScore, investmentCapacity
    const ref = doc(db, "users", currentUser.uid);

    try {
      // 1) get cluster id from backend
      const clusterId = await fetchClusterForProfile(payload);

      // 2) save everything (profile + cluster) in one Firestore write
      const docData = {
        ...payload,
        clusterId, // ← store cluster
        clusterUpdatedAt: serverTimestamp(),
        profileCompleted: true,
        updatedAt: serverTimestamp(),
        ...(profileInitial ? {} : { createdAt: serverTimestamp() }),
      };

      await setDoc(ref, docData, { merge: true });
    } catch (err) {
      console.warn(
        "Failed to compute cluster; saving profile without cluster.",
        err
      );

      // Fallback: still save the profile so UX isn’t blocked
      const docData = {
        ...payload,
        profileCompleted: true,
        updatedAt: serverTimestamp(),
        ...(profileInitial ? {} : { createdAt: serverTimestamp() }),
      };
      await setDoc(ref, docData, { merge: true });

      // Optional: toast the warning to the user
      // setApiError("Saved profile, but clustering is temporarily unavailable.");
    }
  };

  return (
    <Box sx={styles.container}>
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        {/* Header Row */}

        <Typography variant="h4" sx={styles.header}>
          My Portfolio Playground
        </Typography>

        {/* MY transactions group */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 4 }}>
          <Button
            onClick={() => navigate("/transactions")}
            sx={styles.txButtonTop}
            variant="contained"
          >
            My Transactions
          </Button>
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
            onClick={handleFetchRecommendations}
            disabled={
              portfolioLoading ||
              portfolio.length === 0 ||
              recommendationsLoading
            }
            sx={{
              color: "white",
              px: 3,
              py: 1.5,
              bgcolor: "#2E8B8B",
              "&:disabled": { bgcolor: "#cccccc" },
              "&:hover": { bgcolor: "#267373" },
            }}
          >
            {recommendationsLoading ? (
              <CircularProgress size={20} />
            ) : (
              "Get Recommendations"
            )}
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
            <ChartsSection portfolio={portfolio} />
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
          recommendations={recommendations || []}
          loading={recommendationsLoading}
          error={recommendationsError}
        />
      </Box>
      <UserProfileDialog
        open={showProfileDialog}
        onClose={() => setShowProfileDialog(false)}
        onSave={handleSaveProfile}
        initial={profileInitial}
      />
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
    mb: 4,
  },
  txButtonTop: {
    bgcolor: "#305D9E",
    "&:hover": { bgcolor: "#254a7d" },
  },
};
