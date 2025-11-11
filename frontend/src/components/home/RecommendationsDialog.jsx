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
} from "@mui/material";
import { Add, TrendingUp } from "@mui/icons-material";
import { useMemo, useState } from "react";
import dayjs from "dayjs";

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
    symbol: "",
    severity: "success",
  });

  const filteredRecommendations = useMemo(() => {
    const presentSymbols = new Set(
      (currentPortfolio || []).map((stock) => stock.symbol?.toUpperCase())
    );
    return (recommendations || []).filter(
      (rec) => rec.symbol && !presentSymbols.has(rec.symbol.toUpperCase())
    );
  }, [recommendations, currentPortfolio]);

  const handleAddStock = async (stock) => {
    if (stock.latestPrice == null) {
      setToast({
        open: true,
        message: `${stock.symbol} does not have a latest price`,
        symbol: stock.symbol,
        severity: "error",
      });
      return;
    }
    try {
      await onAdd({
        symbol: stock.symbol,
        name: stock.name,
        shares: 1,
        buyPrice: stock.latestPrice,
        buyDate: dayjs().format("YYYY-MM-DD"),
        currentPrice: stock.latestPrice,
      });
      setToast({
        open: true,
        message: `${stock.symbol} added to portfolio`,
        symbol: stock.symbol,
        severity: "success",
      });
    } catch (err) {
      setToast({
        open: true,
        message: err.message || "Failed to add stock",
        symbol: stock.symbol,
        severity: "error",
      });
    }
  };

  const handleCloseToast = () => setToast({ ...toast, open: false });

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { maxHeight: "80vh" } }}
      >
        <DialogTitle>
          <Typography variant="h4" component="div">
            Recommended Stocks
          </Typography>
          <DialogContentText sx={{ mt: 1 }}>
            Explore recommended dataset securities based on recent FAR
            transactions.
          </DialogContentText>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            {loading ? (
              <Box sx={{ py: 5, display: "flex", justifyContent: "center" }}>
                <CircularProgress size={28} />
              </Box>
            ) : error ? (
              <Typography color="error" align="center">
                {error?.message || "Failed to fetch recommendations"}
              </Typography>
            ) : filteredRecommendations.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                All recommended stocks are already in your portfolio!
              </Typography>
            ) : (
              filteredRecommendations.map((stock) => (
                <Card
                  key={stock.symbol}
                  variant="outlined"
                  sx={{ "&:hover": { bgcolor: "action.hover" } }}
                >
                  <CardContent>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight="bold">
                          {stock.symbol}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {stock.name}
                        </Typography>

                        <Grid container spacing={2} sx={{ mb: 2 }}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Current Price
                            </Typography>
                            <Typography variant="body1" fontWeight="600">
                              {stock.latestPrice != null
                                ? `$${stock.latestPrice.toFixed(2)}`
                                : "N/A"}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Total Value Traded
                            </Typography>
                            <Typography variant="body1" fontWeight="600">
                              {stock.totalValue != null
                                ? `$${stock.totalValue.toLocaleString()}`
                                : "N/A"}
                            </Typography>
                          </Grid>
                        </Grid>

                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 1,
                          }}
                        >
                          <TrendingUp
                            sx={{ fontSize: 20, color: "success.main" }}
                          />
                          <Typography
                            variant="body2"
                            fontWeight="500"
                            sx={{ color: "success.main" }}
                          >
                            Units traded:{" "}
                            {stock.totalUnits?.toLocaleString() ?? "N/A"}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Dataset security (ISIN: {stock.isin})
                        </Typography>
                      </Box>

                      <Button
                        onClick={() => handleAddStock(stock)}
                        variant="contained"
                        size="small"
                        startIcon={<Add />}
                        sx={{ ml: 2 }}
                      >
                        Add
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))
            )}
          </Box>
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
