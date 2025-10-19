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
} from "@mui/material";
import { Add, TrendingUp } from "@mui/icons-material";
import { useState } from "react";
import dayjs from "dayjs";

// Mock recommendations - will be replaced with backend data later
const mockRecommendations = [
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    currentPrice: 495.5,
    targetPrice: 600.0,
    potentialReturn: 21.1,
    reason: "Strong AI chip demand and market leadership",
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    currentPrice: 380.0,
    targetPrice: 450.0,
    potentialReturn: 18.4,
    reason: "Cloud growth and AI integration",
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    currentPrice: 142.5,
    targetPrice: 170.0,
    potentialReturn: 19.3,
    reason: "Search dominance and AI development",
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    currentPrice: 248.0,
    targetPrice: 310.0,
    potentialReturn: 25.0,
    reason: "EV market leader with production expansion",
  },
];

const RecommendationsDialog = ({ open, onClose, onAdd, currentPortfolio }) => {
  const [toast, setToast] = useState({ open: false, message: "", symbol: "" });

  // Filter out stocks already in portfolio
  const recommendations = mockRecommendations.filter(
    (rec) => !currentPortfolio.some((stock) => stock.symbol === rec.symbol)
  );

  const handleAddStock = async (stock) => {
    try {
      await onAdd({
        symbol: stock.symbol,
        name: stock.name,
        shares: 1,
        buyPrice: stock.currentPrice,
        buyDate: dayjs().format("YYYY-MM-DD"),
        currentPrice: stock.currentPrice,
      });

      setToast({
        open: true,
        message: `${stock.symbol} has been added to your portfolio`,
        symbol: stock.symbol,
      });
    } catch (error) {
      setToast({
        open: true,
        message: error.message || "Failed to add stock",
        symbol: stock.symbol,
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
        PaperProps={{
          sx: { maxHeight: "80vh" },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h4" component="div">
            Recommended Stocks
          </Typography>
          <DialogContentText sx={{ mt: 1 }}>
            Based on your portfolio, here are our AI-powered recommendations
          </DialogContentText>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            {recommendations.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                All recommended stocks are already in your portfolio!
              </Typography>
            ) : (
              recommendations.map((stock) => (
                <Card
                  key={stock.symbol}
                  variant="outlined"
                  sx={{
                    transition: "background-color 0.2s",
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
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
                          <Typography
                            variant="h6"
                            component="h3"
                            fontWeight="bold"
                          >
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
                              ${stock.currentPrice.toFixed(2)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              Target Price
                            </Typography>
                            <Typography variant="body1" fontWeight="600">
                              ${stock.targetPrice.toFixed(2)}
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
                            +{stock.potentialReturn.toFixed(1)}% potential
                            return
                          </Typography>
                        </Box>

                        <Typography variant="body2" color="text.secondary">
                          {stock.reason}
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
          severity="success"
          sx={{ width: "100%" }}
        >
          <strong>Stock Added:</strong> {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default RecommendationsDialog;
