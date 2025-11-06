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
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";

const RecommendationsDialog = ({ open, onClose, onAdd, currentPortfolio }) => {
  const [toast, setToast] = useState({
    open: false,
    message: "",
    symbol: "",
    severity: "success",
  });
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  // Dummy recommendations
  useEffect(() => {
    if (!open) return;

    setLoading(true);

    const dummyData = [
      {
        symbol: "AAPL",
        name: "Apple Inc.",
        latestPrice: 175.25,
        totalValue: 120000000,
        totalUnits: 685000,
        isin: "US0378331005",
      },
      {
        symbol: "GOOGL",
        name: "Alphabet Inc.",
        latestPrice: 135.1,
        totalValue: 95000000,
        totalUnits: 703000,
        isin: "US02079K3059",
      },
      {
        symbol: "AMZN",
        name: "Amazon.com Inc.",
        latestPrice: 3250.5,
        totalValue: 140000000,
        totalUnits: 43000,
        isin: "US0231351067",
      },
      {
        symbol: "TSLA",
        name: "Tesla Inc.",
        latestPrice: 880.3,
        totalValue: 70000000,
        totalUnits: 80000,
        isin: "US88160R1014",
      },
      {
        symbol: "MSFT",
        name: "Microsoft Corp.",
        latestPrice: 310.4,
        totalValue: 110000000,
        totalUnits: 350000,
        isin: "US5949181045",
      },
    ];

    setTimeout(() => {
      setRecommendations(dummyData);
      setLoading(false);
    }, 500); // simulate loading delay
  }, [open]);

  const filteredRecommendations = useMemo(() => {
    const presentSymbols = new Set(
      (currentPortfolio || []).map((stock) => stock.symbol?.toUpperCase())
    );
    return recommendations.filter(
      (rec) => rec.symbol && !presentSymbols.has(rec.symbol.toUpperCase())
    );
  }, [recommendations, currentPortfolio]);

  const handleAddStock = async (stock) => {
    if (stock.latestPrice == null) {
      setToast({
        open: true,
        message: `${stock.symbol} does not have a latest price in the dataset.`,
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
        message: `${stock.symbol} has been added to your portfolio.`,
        symbol: stock.symbol,
        severity: "success",
      });
    } catch (error) {
      setToast({
        open: true,
        message: error.message || "Failed to add stock",
        symbol: stock.symbol,
        severity: "error",
      });
    }
  };

  const handleCloseToast = () => {
    setToast({ ...toast, open: false });
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { maxHeight: "80vh" } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h4" component="div">
            Recommended Stocks
          </Typography>
          <DialogContentText sx={{ mt: 1 }}>
            Explore popular dataset securities based on recent FAR transactions.
          </DialogContentText>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            {loading ? (
              <Box sx={{ py: 5, display: "flex", justifyContent: "center" }}>
                <CircularProgress size={28} />
              </Box>
            ) : filteredRecommendations.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                All recommended stocks are already in your portfolio!
              </Typography>
            ) : (
              filteredRecommendations.map((stock) => (
                <Card
                  key={stock.symbol}
                  variant="outlined"
                  sx={{
                    transition: "background-color 0.2s",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 2,
                          }}
                        >
                          <Typography variant="h6" fontWeight="bold">
                            {stock.symbol}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {stock.name}
                          </Typography>
                        </Box>

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
                            {stock.totalUnits != null
                              ? stock.totalUnits.toLocaleString()
                              : "N/A"}
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
          severity={toast.severity || "success"}
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default RecommendationsDialog;
