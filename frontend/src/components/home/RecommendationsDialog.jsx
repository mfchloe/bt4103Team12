import { useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Box,
  Snackbar,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  CheckCircleOutline,
} from "@mui/icons-material";
import dayjs from "dayjs";
import { GREEN } from "../../constants/colors";
import { apiBaseUrl } from "../../api/httpClient";

const RecommendationsDialog = ({
  open,
  onClose,
  onAdd,
  currentPortfolio,
  recommendations,
  loading,
  error,
}) => {
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [selectedStocks, setSelectedStocks] = useState(new Set());
  const [shareCounts, setShareCounts] = useState({});
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [targetReturn, setTargetReturn] = useState("");
  const [maxRisk, setMaxRisk] = useState("");
  const [objectiveType, setObjectiveType] = useState("target");
  const [allocating, setAllocating] = useState(false);
  const [allocationError, setAllocationError] = useState("");
  const normalizeKey = (symbol) => (symbol || "").toUpperCase();

  const transformedRecommendations = useMemo(() => {
    if (!recommendations || !Array.isArray(recommendations)) return [];
    return recommendations.map((rec) => ({
      symbol: rec[0],
      name: rec[1],
      similarityScore: rec[2],
      sharpeRatio: rec[3],
    }));
  }, [recommendations]);

  const filteredRecommendations = useMemo(() => {
    const existingSymbols = new Set(
      currentPortfolio.map((s) => s.symbol?.toUpperCase())
    );
    return transformedRecommendations.filter(
      (rec) => rec.symbol && !existingSymbols.has(rec.symbol.toUpperCase())
    );
  }, [transformedRecommendations, currentPortfolio]);

  const sortedRecommendations = useMemo(() => {
    const sharpeValue = (value) =>
      typeof value === "number" && Number.isFinite(value)
        ? value
        : Number.NEGATIVE_INFINITY;
    return [...filteredRecommendations].sort((a, b) => {
      const sharpeDiff = sharpeValue(b.sharpeRatio) - sharpeValue(a.sharpeRatio);
      if (sharpeDiff !== 0) return sharpeDiff;
      const simA =
        typeof a.similarityScore === "number" && Number.isFinite(a.similarityScore)
          ? a.similarityScore
          : 0;
      const simB =
        typeof b.similarityScore === "number" && Number.isFinite(b.similarityScore)
          ? b.similarityScore
          : 0;
      return simB - simA;
    });
  }, [filteredRecommendations]);

  const handleShareChange = (symbol, value) => {
    const key = normalizeKey(symbol);
    if (!/^\d*$/.test(value)) return;
    setShareCounts((prev) => ({ ...prev, [key]: value }));
  };

  const handleWheelDisable = (event) => {
    event.preventDefault();
    event.target.blur();
  };

  const getSharesForSymbol = (symbol) => {
    const key = normalizeKey(symbol);
    const parsed = parseInt(shareCounts[key], 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  };

  const toggleSelectStock = (symbol) => {
    const key = normalizeKey(symbol);
    setSelectedStocks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      return newSet;
    });
    setShareCounts((prev) => (prev[key] ? prev : { ...prev, [key]: "1" }));
  };

  const handleObjectiveChange = (_, newValue) => {
    if (!newValue) return;
    setObjectiveType(newValue);
    setAllocationError("");
  };

  const handleAddSelected = async () => {
    const symbolsToAdd = Array.from(selectedStocks);
    if (symbolsToAdd.length === 0) return;

    for (const symbol of symbolsToAdd) {
      const stock = sortedRecommendations.find(
        (s) => normalizeKey(s.symbol) === symbol
      );
      if (stock) {
        await onAdd({
          symbol: stock.symbol,
          name: stock.name,
          shares: getSharesForSymbol(symbol),
          buyPrice: 0,
          buyDate: dayjs().format("YYYY-MM-DD"),
          currentPrice: 0,
        });
      }
    }
    setToast({
      open: true,
      message: `${symbolsToAdd.length} asset${
        symbolsToAdd.length > 1 ? "s" : ""
      } added to portfolio`,
      severity: "success",
    });
    setSelectedStocks(new Set());
    onClose();
  };

  const handleRecommendPortfolio = async () => {
    setAllocationError("");
    const amount = Number(investmentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setAllocationError("Enter an investment amount greater than 0.");
      return;
    }

    const usingTarget = objectiveType === "target";
    const constraintValue = usingTarget ? targetReturn : maxRisk;
    if (constraintValue === "") {
      setAllocationError(
        usingTarget
          ? "Please provide a target return."
          : "Please provide a max risk tolerance."
      );
      return;
    }

    const parsedConstraint = Number(constraintValue);
    if (!Number.isFinite(parsedConstraint)) {
      setAllocationError(
        usingTarget
          ? "Target return must be a valid number."
          : "Max risk tolerance must be a valid number."
      );
      return;
    }

    const universe =
      selectedStocks.size > 0
        ? sortedRecommendations.filter((rec) =>
            selectedStocks.has(normalizeKey(rec.symbol))
          )
        : sortedRecommendations;

    if (universe.length === 0) {
      setAllocationError("Select at least one recommendation to optimise.");
      return;
    }

    setAllocating(true);
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/recommendation/allocate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isins: universe.map((rec) => rec.symbol),
            investment_amount: amount,
            target_return: usingTarget ? parsedConstraint : undefined,
            max_risk: usingTarget ? undefined : parsedConstraint,
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody?.detail || "Failed to optimise portfolio.");
      }

      const payload = await response.json();
      const allocations = payload?.allocations || [];
      if (!allocations.length) {
        throw new Error("Optimiser did not return any allocations.");
      }

      const updatedShares = { ...shareCounts };
      const updatedSelection = new Set(selectedStocks);
      allocations.forEach((allocation) => {
        const key = normalizeKey(allocation?.isin || allocation?.symbol);
        if (!key) {
          return;
        }
        const roundedShares = Math.max(0, Number(allocation.shares || 0));
        updatedShares[key] = String(roundedShares);
        if (roundedShares > 0) {
          updatedSelection.add(key);
        }
      });

      setShareCounts(updatedShares);
      setSelectedStocks(updatedSelection);
      setToast({
        open: true,
        message: "Suggested share counts generated.",
        severity: "success",
      });
    } catch (err) {
      setAllocationError(err.message || "Failed to optimise portfolio.");
    } finally {
      setAllocating(false);
    }
  };

  const handleCloseToast = () => setToast({ ...toast, open: false });

  const getSharpeColor = (sharpe) => {
    if (sharpe > 0.5) return "success.main";
    if (sharpe > 0) return "info.main";
    if (sharpe > -0.5) return "warning.main";
    return "error.main";
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: styles.dialogPaper }}
      >
        <DialogTitle>
          <Typography sx={styles.title}>Recommended Assets</Typography>
          <DialogContentText sx={styles.subtitle}>
            Select assets to add to your portfolio
          </DialogContentText>
        </DialogTitle>

        <DialogContent>
          <Box sx={styles.contentContainer}>
            <Box sx={styles.optimizerBox}>
              <Typography variant="subtitle1" fontWeight="600">
                Portfolio Optimizer
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Allocate your investment across the recommended assets using the
                Markowitz optimiser. Enter your total budget and either a target
                return or a max risk tolerance.
              </Typography>

              <Box sx={styles.optimizerFields}>
                <TextField
                  fullWidth
                  label="Investment Amount"
                  placeholder="10000"
                  type="number"
                  value={investmentAmount}
                  onChange={(event) => {
                    setInvestmentAmount(event.target.value);
                    setAllocationError("");
                  }}
                  onWheel={handleWheelDisable}
                  inputProps={{ min: "0", step: "any" }}
                />

                <Box sx={styles.objectiveRow}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Optimisation Objective
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={objectiveType}
                    onChange={handleObjectiveChange}
                    sx={{ mt: 1 }}
                  >
                    <ToggleButton value="target">Target Return</ToggleButton>
                    <ToggleButton value="risk">Max Risk</ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                <TextField
                  fullWidth
                  type="number"
                  label={
                    objectiveType === "target"
                      ? "Target Return"
                      : "Max Risk Tolerance"
                  }
                  placeholder={objectiveType === "target" ? "0.001" : "0.005"}
                  helperText={
                    objectiveType === "target"
                      ? "Daily expected return"
                      : "Daily standard deviation"
                  }
                  value={objectiveType === "target" ? targetReturn : maxRisk}
                  onChange={(event) => {
                    if (objectiveType === "target") {
                      setTargetReturn(event.target.value);
                    } else {
                      setMaxRisk(event.target.value);
                    }
                    setAllocationError("");
                  }}
                  onWheel={handleWheelDisable}
                  inputProps={{ step: "any" }}
                />

                <Box sx={styles.optimizerActions}>
                  <Button
                    variant="outlined"
                    onClick={handleRecommendPortfolio}
                    disabled={
                      allocating ||
                      loading ||
                      sortedRecommendations.length === 0
                    }
                  >
                    {allocating ? (
                      <CircularProgress size={18} />
                    ) : (
                      "Recommend Portfolio"
                    )}
                  </Button>
                </Box>
              </Box>

              {allocationError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {allocationError}
                </Alert>
              )}
            </Box>

            {selectedStocks.size > 0 && (
              <Box sx={styles.selectedHint}>
                <Typography variant="body2" color="info.contrastText">
                  You have selected {selectedStocks.size} asset
                  {selectedStocks.size > 1 ? "s" : ""}. Scroll down and click{" "}
                  <strong>Add Selected</strong> to add them to your portfolio.
                </Typography>
              </Box>
            )}

            {loading ? (
              <Box sx={styles.loader}>
                <CircularProgress size={28} />
              </Box>
            ) : error ? (
              <Typography color="error" align="center">
                {error?.message || "Failed to fetch recommendations"}
              </Typography>
            ) : sortedRecommendations.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                {recommendations?.length > 0
                  ? "All recommended assets are already in your portfolio!"
                  : "No recommendations available at this time."}
              </Typography>
            ) : (
              sortedRecommendations.map((stock, index) => {
                const key = normalizeKey(stock.symbol);
                const selected = selectedStocks.has(key);
                return (
                  <Card
                    key={key || stock.symbol || index}
                    variant="outlined"
                    sx={{
                      ...styles.card,
                      borderLeftColor: getSharpeColor(stock.sharpeRatio),
                    }}
                  >
                    <CardContent>
                      <Box sx={styles.cardContent}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={styles.cardHeader}>
                            <Chip
                              label={`#${index + 1}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            <Typography variant="h6" fontWeight="bold">
                              {stock.name}
                            </Typography>
                          </Box>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 2 }}
                          >
                            {stock.symbol}
                          </Typography>

                          <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={6}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Score
                              </Typography>
                              <Typography variant="body1" fontWeight="600">
                                {(stock.similarityScore * 100).toFixed(2)}%
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Sharpe Ratio
                              </Typography>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                }}
                              >
                                <Typography
                                  variant="body1"
                                  fontWeight="600"
                                  sx={{
                                    color: getSharpeColor(stock.sharpeRatio),
                                  }}
                                >
                                  {stock.sharpeRatio.toFixed(3)}
                                </Typography>
                                {stock.sharpeRatio > 0 ? (
                                  <TrendingUp
                                    sx={{ fontSize: 18, color: "success.main" }}
                                  />
                                ) : (
                                  <TrendingDown
                                    sx={{ fontSize: 18, color: "error.main" }}
                                  />
                                )}
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>

                        <Box sx={styles.selectionColumn}>
                          <IconButton
                            onClick={() => toggleSelectStock(stock.symbol)}
                            sx={{ color: selected ? GREEN : "default" }}
                          >
                            {selected ? (
                              <CheckCircle />
                            ) : (
                              <CheckCircleOutline />
                            )}
                          </IconButton>
                          {selected && (
                            <TextField
                              label="Shares"
                              type="number"
                              size="small"
                              value={
                                shareCounts[normalizeKey(stock.symbol)] ?? "1"
                              }
                              onChange={(e) =>
                                handleShareChange(stock.symbol, e.target.value)
                              }
                              onWheel={handleWheelDisable}
                              inputProps={{ min: 1 }}
                              sx={{ width: 90 }}
                            />
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </Box>

          {selectedStocks.size > 0 && (
            <Box sx={styles.addSelectedContainer}>
              <Button variant="contained" onClick={handleAddSelected}>
                Add {selectedStocks.size} Selected
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toast.severity}
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default RecommendationsDialog;

const styles = {
  dialogPaper: { maxHeight: "80vh" },
  title: { fontSize: 20 },
  subtitle: { mt: 1 },
  contentContainer: { display: "flex", flexDirection: "column", gap: 2, mt: 2 },
  optimizerBox: {
    border: "1px solid",
    borderColor: "divider",
    borderRadius: 2,
    p: 2,
    bgcolor: "background.paper",
  },
  optimizerFields: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    mt: 2,
  },
  objectiveRow: {
    display: "flex",
    flexDirection: "column",
  },
  optimizerActions: {
    display: "flex",
    justifyContent: "flex-end",
  },
  selectedHint: {
    my: 1,
    p: 1,
    bgcolor: GREEN,
    borderRadius: 1,
    textAlign: "center",
  },
  loader: { py: 5, display: "flex", justifyContent: "center" },
  card: { "&:hover": { bgcolor: "action.hover" }, borderLeft: "4px solid" },
  cardContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardHeader: { display: "flex", alignItems: "center", gap: 1, mb: 1 },
  addSelectedContainer: { display: "flex", justifyContent: "flex-end", mt: 2 },
  selectionColumn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 1,
  },
};
