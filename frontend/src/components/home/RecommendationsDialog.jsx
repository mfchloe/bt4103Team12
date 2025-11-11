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
} from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  CheckCircleOutline,
} from "@mui/icons-material";
import dayjs from "dayjs";
import { GREEN } from "../../constants/colors";

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

  const toggleSelectStock = (symbol) => {
    setSelectedStocks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(symbol)) newSet.delete(symbol);
      else newSet.add(symbol);
      return newSet;
    });
  };

  const handleAddSelected = async () => {
    for (const symbol of selectedStocks) {
      const stock = filteredRecommendations.find((s) => s.symbol === symbol);
      if (stock) {
        await onAdd({
          symbol: stock.symbol,
          name: stock.name,
          shares: 1,
          buyPrice: 0,
          buyDate: dayjs().format("YYYY-MM-DD"),
          currentPrice: 0,
        });
      }
    }
    setToast({
      open: true,
      message: `${selectedStocks.size} asset${
        selectedStocks.size > 1 ? "s" : ""
      } added to portfolio`,
      severity: "success",
    });
    setSelectedStocks(new Set());
    onClose();
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
            ) : filteredRecommendations.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                {recommendations?.length > 0
                  ? "All recommended assets are already in your portfolio!"
                  : "No recommendations available at this time."}
              </Typography>
            ) : (
              filteredRecommendations.map((stock, index) => {
                const selected = selectedStocks.has(stock.symbol);
                return (
                  <Card
                    key={stock.symbol}
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
                                Similarity Score
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

                        <IconButton
                          onClick={() => toggleSelectStock(stock.symbol)}
                          sx={{ color: selected ? GREEN : "default" }}
                        >
                          {selected ? <CheckCircle /> : <CheckCircleOutline />}
                        </IconButton>
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
};
