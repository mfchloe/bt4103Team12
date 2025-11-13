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
const STOCK_PRICE_API_URL = `${apiBaseUrl}/api/dataset/timeseries/batch`;

const ISIN_REGEX = /^[A-Z0-9]{12}$/i;

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
  const assetLookupCacheRef = useRef(new Map());

  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileInitial, setProfileInitial] = useState(null);
  const checkedProfileRef = useRef(false);

  // to cache recommendations
  const recommendationsCache = new Map();
  const getPortfolioKey = (portfolioIds) => {
    return portfolioIds.slice().sort().join(","); // sorted ensures order doesn't matter
  };

  // recommendations
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState(null);

  const [clusterId, setClusterId] = useState(null);

  const handleFetchRecommendations = async () => {
    if (!isAuthenticated) return;

    const existingPortfolio = portfolio.map((s) => s.assetId).filter(Boolean);
    const portfolioKey = getPortfolioKey(existingPortfolio);

    const userId = isFirebaseUser
      ? currentUser.uid
      : farCustomerSession?.customerId;

    // For FAR customers, we rely on model/dataset; for Firebase-only, use local clusterId
    const cluster_id =
      !isFarCustomer && typeof clusterId === "number" ? clusterId : null;

    // Check cache
    const cached = recommendationsCache.get(userId);
    if (
      cached &&
      cached.portfolioKey === portfolioKey &&
      cached.clusterId === cluster_id
    ) {
      console.log("Using cached recommendations");
      setRecommendations(cached.recommendations);
      setShowRecommendations(true);
      return;
    }

    setRecommendationsLoading(true);
    setRecommendationsError(null);

    try {
      const res = await fetch(
        "http://localhost:8000/api/recommendation/recommend",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_id: userId,
            existing_portfolio: existingPortfolio,
            cluster_id,
          }),
        }
      );

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson?.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();

      // save to cache
      recommendationsCache.set(userId, {
        portfolioKey,
        clusterId: cluster_id,
        recommendations: data.recommendations || [],
      });

      setRecommendations(data.recommendations || []);
      setShowRecommendations(true);
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
      setRecommendationsError(err.message);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  useEffect(() => {
    portfolioRef.current = portfolio;
  }, [portfolio]);

  useEffect(() => {
    if (!isAuthenticated) {
      assetLookupCacheRef.current.clear();
    }
  }, [isAuthenticated]);

  const mapServerItem = useCallback(
    (item) => ({
      id: item.id,
      symbol: item.symbol,
      isin: item.isin || null,
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

  const resolveAssetMetadata = useCallback(
    async ({ name, symbol, isin }) => {
      const cacheKeys = buildLookupCacheKeys({ name, symbol, isin });
      for (const key of cacheKeys) {
        if (key && assetLookupCacheRef.current.has(key)) {
          return assetLookupCacheRef.current.get(key);
        }
      }

      const query = (name || symbol || isin || "").trim();
      if (!query) return null;

      try {
        const data = await authFetch(
          `/api/dataset/timeseries/search?q=${encodeURIComponent(
            query
          )}&limit=10`
        );
        const results = data?.results || [];
        const normalizedName = name?.trim().toLowerCase();
        const normalizedSymbol = symbol?.trim().toUpperCase();
        const normalizedIsin = isin?.trim().toUpperCase();

        const matchByName =
          normalizedName &&
          results.find(
            (item) =>
              (item?.name || "").trim().toLowerCase() === normalizedName
          );

        const matchByIsin =
          normalizedIsin &&
          results.find(
            (item) =>
              (item?.isin || "").trim().toUpperCase() === normalizedIsin
          );

        const matchBySymbol =
          normalizedSymbol &&
          results.find(
            (item) =>
              (item?.symbol || "").trim().toUpperCase() === normalizedSymbol
          );

        const resolvedRaw =
          matchByName || matchByIsin || matchBySymbol || results[0] || null;
        const resolved = normalizeAssetResult(resolvedRaw);

        if (resolved) {
          buildLookupCacheKeys(resolved).forEach((key) => {
            if (key) {
              assetLookupCacheRef.current.set(key, resolved);
            }
          });
        }
        return resolved;
      } catch (error) {
        console.warn("Failed to resolve asset metadata:", error);
        return null;
      }
    },
    [authFetch]
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

  let cancelled = false;

  const refreshPrices = async () => {
    try {
      const lookupEntries = [];
      for (const stock of portfolioRef.current) {
        const metadata =
            (await resolveAssetMetadata({
              name: stock.name,
              symbol: stock.symbol,
              isin: stock.isin,
            })) || null;

          const lookupKeyRaw =
            metadata?.isin ||
            metadata?.symbol ||
            (stock.isin && stock.isin.toUpperCase()) ||
            (stock.symbol && stock.symbol.toUpperCase());

          if (!lookupKeyRaw) continue;
          const lookupKey = lookupKeyRaw.toUpperCase();
          lookupEntries.push({ id: stock.id, key: lookupKey });
        }

        const uniqueKeys = [
          ...new Set(lookupEntries.map((entry) => entry.key)),
        ];
        if (!uniqueKeys.length) return;

      const response = await fetch(STOCK_PRICE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: uniqueKeys }),
      });

      const data = await response.json();
      if (!data.success || cancelled) return;

      const idToLookupKey = new Map();
      lookupEntries.forEach(({ id, key }) => idToLookupKey.set(id, key));

      const pendingUpdates = [];
      setPortfolio((prevPortfolio) =>
          prevPortfolio.map((stock) => {
            const lookupKey = idToLookupKey.get(stock.id);
            if (!lookupKey) return stock;
            const updatedPrice = data.prices[lookupKey];
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
      if (!cancelled) {
        console.error("Failed to refresh prices:", error);
      }
    }
  };

  refreshPrices();
  const interval = setInterval(refreshPrices, 60 * 60 * 1000);
  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}, [authFetch, isAuthenticated, portfolio.length, resolveAssetMetadata]);

  const totalValue = calculateTotalValue(portfolio);
  const totalPL = calculateTotalPL(portfolio);
  const totalReturn = calculateTotalReturn(portfolio);
  const sharpeRatio = calculateSharpeRatio(portfolio);

  const resolveDisplaySymbol = useCallback(
    async (symbol, isin) => {
      const identifier = (isin || symbol || "").trim();
      if (!identifier) return "";
      const upperIdentifier = identifier.toUpperCase();

      if (!ISIN_REGEX.test(upperIdentifier)) {
        return upperIdentifier;
      }

      try {
        const data = await authFetch(
          `/api/dataset/timeseries/search?q=${encodeURIComponent(
            upperIdentifier
          )}&limit=1`
        );
        const results = data?.results || [];
        const match =
          results.find(
            (item) => item?.isin?.toUpperCase() === upperIdentifier
          ) || results[0];
        if (match?.symbol) {
          return match.symbol.toUpperCase();
        }
      } catch (error) {
        console.warn("Failed to resolve short symbol:", error);
      }

      return upperIdentifier;
    },
    [authFetch]
  );

  const fetchLatestSnapshot = useCallback(
    async (identifier) => {
      if (!identifier) return null;
      try {
        const data = await authFetch(
          `/api/dataset/timeseries/${encodeURIComponent(
            identifier
          )}/latest-snapshot`
        );
        return data || null;
      } catch (error) {
        console.warn("Failed to fetch latest snapshot:", error);
        return null;
      }
    },
    [authFetch]
  );

  const handleAddStock = useCallback(async (stock) => {
    const buyPrice = Number(stock.buyPrice);
    const normalizedBuyPrice = Number.isFinite(buyPrice) ? buyPrice : null;
    const hasCurrentPrice =
      stock.currentPrice !== undefined && stock.currentPrice !== null;
    const rawSymbol = stock.symbol?.toUpperCase();
    const rawIsin = stock.isin
      ? stock.isin.toUpperCase()
      : ISIN_REGEX.test(rawSymbol || "")
      ? rawSymbol
      : null;

    const assetMetadata =
      (await resolveAssetMetadata({
        name: stock.name,
        symbol: rawSymbol,
        isin: rawIsin,
      })) || null;

    const metadataSymbol = assetMetadata?.symbol;
    const metadataIsin = assetMetadata?.isin;

    const displaySymbol =
      metadataSymbol || (await resolveDisplaySymbol(rawSymbol, rawIsin));
    const snapshotIdentifier =
      metadataIsin || metadataSymbol || rawIsin || rawSymbol;
    const snapshot = await fetchLatestSnapshot(snapshotIdentifier);
    const canonicalSymbol =
      snapshot?.symbol?.toUpperCase() ||
      metadataSymbol ||
      displaySymbol ||
      rawSymbol ||
      snapshotIdentifier;
    const canonicalIsin =
      snapshot?.isin?.toUpperCase() || metadataIsin || rawIsin;
    const resolvedName =
      snapshot?.name || assetMetadata?.name || stock.name;
    const normalizedBuyDate = stock.buyDate
      ? dayjs(stock.buyDate).format("YYYY-MM-DD")
      : null;
    const entrySource = stock.entrySource;
    const purchaseMode = stock.purchaseMode;
    const manualByPrice = entrySource === "manual" && purchaseMode === "price";
    const manualByDate = entrySource === "manual" && purchaseMode === "date";

    let lastSeenPrice = snapshot?.price ?? normalizedBuyPrice;
    if ((manualByPrice || manualByDate) && normalizedBuyPrice !== null) {
      lastSeenPrice = normalizedBuyPrice;
    }

    let lastSeenDate = null;
    if (manualByPrice) {
      lastSeenDate = null;
    } else if (manualByDate && normalizedBuyDate) {
      lastSeenDate = normalizedBuyDate;
    } else if (snapshot?.date) {
      lastSeenDate = dayjs(snapshot.date).format("YYYY-MM-DD");
    } else if (normalizedBuyDate) {
      lastSeenDate = normalizedBuyDate;
    }

    const currentPrice = hasCurrentPrice
      ? Number(stock.currentPrice)
      : snapshot?.price ?? null;

    // Create a new stock object locally
    const mergedKey = (snapshot?.isin || canonicalSymbol || rawSymbol || "")
      .toString()
      .toUpperCase();
    const existingIndex = portfolioRef.current.findIndex((item) => {
      const existingKey = (
        item.isin ||
        item.symbol
      )
        ?.toString()
        .toUpperCase();
      return existingKey && existingKey === mergedKey;
    });

    const newStock = {
      id: `local-${Date.now()}`, // unique id for React key
      symbol: canonicalSymbol,
      isin: canonicalIsin || null,
      name: resolvedName,
      shares: Number(stock.shares),
      buyPrice: normalizedBuyPrice,
      buyDate: normalizedBuyDate,
      currentPrice,
      isSynthetic: false,
      lastSeenPrice,
      lastSeenDate,
      isNew: true, // mark as new for highlighting
    };

    setPortfolio((prev) => {
      const next = [...prev];
      if (existingIndex >= 0) {
        const merged = { ...next[existingIndex] };
        merged.shares = Number(merged.shares) + Number(newStock.shares);
        merged.buyPrice = newStock.buyPrice; // optional: keep latest buy price
        merged.currentPrice =
          newStock.currentPrice ?? merged.currentPrice ?? 0;
        merged.lastSeenPrice = newStock.lastSeenPrice ?? merged.lastSeenPrice;
        merged.lastSeenDate = newStock.lastSeenDate ?? merged.lastSeenDate;
        merged.symbol = newStock.symbol || merged.symbol;
        merged.name = newStock.name || merged.name;
        merged.isin = newStock.isin || merged.isin;
        merged.isNew = true;
        next[existingIndex] = merged;
        return next;
      }
      return [...next, newStock];
    });
  }, [resolveAssetMetadata, resolveDisplaySymbol, fetchLatestSnapshot]);

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

          if (typeof data.clusterId === "number") {
            setClusterId(data.clusterId);
          }

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

  // Compute cluster for profile
  function computeClusterFromProfile({
    investorType,
    customerType,
    riskLevel,
    diversificationScore,
    investmentCapacity,
  }) {
    const divRaw = Number(diversificationScore);
    const div = Number.isFinite(divRaw) ? divRaw : 0; // 0–1 expected

    const isPremium =
      customerType === "premium" ||
      investmentCapacity === "CAP_80K_300K" ||
      investmentCapacity === "CAP_GT300K";

    const isHighRiskPref =
      riskLevel === "balanced" || riskLevel === "aggressive";

    const isLowRiskPref =
      riskLevel === "income" || riskLevel === "conservative";

    const isActiveish =
      investorType === "active_trader" || investorType === "moderate_trader";

    // --- SEGMENT 0: Premium / higher-capacity, more engaged, somewhat diversified ---
    // maps to: Premium, Balanced, active_trader, div ≈ 0.32
    if (
      isPremium &&
      (isHighRiskPref || isActiveish) &&
      div >= 0.25 // "has started diversifying"
    ) {
      return 0;
    }

    // --- SEGMENT 2: Conservative buy & hold, modest diversification ---
    // maps to: Mass, Income, buy_and_hold, div ≈ 0.2
    if (
      customerType === "mass" &&
      isLowRiskPref &&
      investorType === "buy_and_hold" &&
      div >= 0.05 && // not totally concentrated
      div < 0.35 && // not as spread as Seg 0 premium types
      !isPremium
    ) {
      return 2;
    }

    // --- SEGMENT 1: Default / concentrated / active / mass retail ---
    // includes: low div, income focus, active traders, odd combos
    return 1;
  }

  const handleSaveProfile = async (payload) => {
    // payload has: investorType, customerType, riskLevel, diversificationScore, investmentCapacity
    const ref = doc(db, "users", currentUser.uid);

    try {
      // 1) compute cluster id using rules
      const clusterId = await computeClusterFromProfile(payload);

      // 2) save everything (profile + cluster) in one Firestore write
      const docData = {
        ...payload,
        clusterId,
        clusterUpdatedAt: serverTimestamp(),
        profileCompleted: true,
        updatedAt: serverTimestamp(),
        ...(profileInitial ? {} : { createdAt: serverTimestamp() }),
      };

      await setDoc(ref, docData, { merge: true });
      setClusterId(clusterId);
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

const buildLookupCacheKeys = ({ name, symbol, isin }) => {
  const keys = [];
  if (name && name.trim()) {
    keys.push(`NAME:${name.trim().toLowerCase()}`);
  }
  if (symbol && symbol.trim()) {
    keys.push(`SYM:${symbol.trim().toUpperCase()}`);
  }
  if (isin && isin.trim()) {
    keys.push(`ISIN:${isin.trim().toUpperCase()}`);
  }
  return keys;
};

const normalizeAssetResult = (result) => {
  if (!result) return null;
  const sanitizedSymbol = result.symbol
    ? result.symbol.trim().toUpperCase()
    : "";
  const sanitizedIsin = result.isin ? result.isin.trim().toUpperCase() : "";
  const sanitizedName =
    result.name?.trim() ||
    result.assetName?.trim() ||
    sanitizedSymbol ||
    sanitizedIsin;

  return {
    symbol: sanitizedSymbol,
    isin: sanitizedIsin,
    name: sanitizedName,
  };
};

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
