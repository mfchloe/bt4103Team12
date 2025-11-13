import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Button,
  Box,
  Snackbar,
  Alert,
  CircularProgress,
  Autocomplete,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import FormTextField from "../FormTextField";
import { useAuth } from "../../context/AuthContext.jsx";

const DEFAULT_DATASET_MONTH = dayjs("2022-11-01");

const INITIAL_FORM_STATE = {
  symbol: "",
  name: "",
  shares: "",
  buyPrice: "",
  buyDate: "",
};

const INITIAL_TOAST_STATE = {
  open: false,
  message: "",
  severity: "success",
};

const StockAutocomplete = ({
  selectedStock,
  stockOptions,
  searchLoading,
  loading,
  onStockSelect,
  onSearch,
}) => (
  <Box>
    <Box sx={styles.fieldLabel}>Search Stock</Box>
    <Autocomplete
      value={selectedStock}
      onChange={onStockSelect}
      onInputChange={(event, newInputValue) => onSearch(newInputValue)}
      options={stockOptions}
      getOptionLabel={(option) =>
        option?.symbol && option?.name
          ? `${option.symbol} - ${option.name}`
          : option?.symbol || option?.name || ""
      }
      loading={searchLoading}
      disabled={loading}
      sx={styles.autocomplete}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Type to search (e.g., AAPL or Apple)"
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {searchLoading && (
                    <CircularProgress color="inherit" size={20} />
                  )}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
      noOptionsText={searchLoading ? "Searching..." : "No stocks found"}
    />
  </Box>
);

const AddStockDialog = ({ open, onClose, onAdd }) => {
  const { authFetch } = useAuth();

  const [toast, setToast] = useState(INITIAL_TOAST_STATE);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [stockOptions, setStockOptions] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [purchaseMode, setPurchaseMode] = useState("price");
  const [buyDateValue, setBuyDateValue] = useState(null);

const showToast = (message, severity = "success") => {
    setToast({ open: true, message, severity });
  };

  const searchStocks = async (query) => {
    if (!query || query.length < 1) {
      setStockOptions([]);
      return;
    }

    setSearchLoading(true);
    try {
      const data = await authFetch(
        `/api/dataset/timeseries/search?q=${encodeURIComponent(
          query
        )}&limit=10`
      );
      if (data?.results) {
        setStockOptions(data.results);
      } else {
        setStockOptions([]);
      }
    } catch (error) {
      console.error("Error searching stocks:", error);
      setStockOptions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchStockPrice = async (symbol) => {
    try {
      const data = await authFetch(
        `/api/dataset/timeseries/${encodeURIComponent(symbol)}`
      );
      if (data?.success) {
        return {
          currentPrice: data.currentPrice,
          name: data.name,
        };
      }
      throw new Error(
        data?.detail || data?.error || "Failed to fetch stock data"
      );
    } catch (error) {
      throw error;
    }
  };

  const fetchHistoricalPrice = async (symbol, date) => {
    try {
      const data = await authFetch(
        `/api/dataset/timeseries/${encodeURIComponent(
          symbol
        )}/historical-price?date=${encodeURIComponent(date)}`
      );
      if (data?.success) {
        return data;
      }
      throw new Error(
        data?.detail || data?.error || "Failed to fetch historical price"
      );
    } catch (error) {
      throw error;
    }
  };

  const handleStockSelect = (_, value) => {
    setSelectedStock(value);
    setFormData((prev) => ({
      ...prev,
      symbol: value?.symbol || "",
      name: value?.name || "",
    }));
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_STATE);
    setSelectedStock(null);
    setStockOptions([]);
    setPurchaseMode("price");
    setBuyDateValue(null);
  };

  const updateFormField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePurchaseModeChange = (event) => {
    const value = event.target.value;
    setPurchaseMode(value);
    setFormData((prev) => ({
      ...prev,
      buyPrice: value === "price" ? prev.buyPrice : "",
      buyDate: value === "date" ? prev.buyDate : "",
    }));
    if (value === "price") {
      setBuyDateValue(null);
    } else if (formData.buyDate) {
      const parsed = dayjs(formData.buyDate);
      setBuyDateValue(parsed.isValid() ? parsed : null);
    }
  };

  const handleBuyDateChange = (newValue) => {
    if (newValue && newValue.isValid()) {
      setBuyDateValue(newValue);
      updateFormField("buyDate", newValue.format("YYYY-MM-DD"));
    } else {
      setBuyDateValue(null);
      updateFormField("buyDate", "");
    }
  };

  const validateForm = () => {
    const { symbol, name, shares, buyPrice } = formData;
    if (!symbol || !name || !shares) {
      showToast("Please fill in all required fields", "error");
      return false;
    }

    const sharesValue = parseFloat(shares);
    if (Number.isNaN(sharesValue) || sharesValue <= 0) {
      showToast("Number of shares must be greater than zero", "error");
      return false;
    }

    if (purchaseMode === "price") {
      if (!buyPrice) {
        showToast("Please enter the buy price", "error");
        return false;
      }
      const priceValue = parseFloat(buyPrice);
      if (Number.isNaN(priceValue) || priceValue <= 0) {
        showToast("Please enter a valid buy price", "error");
        return false;
      }
    }

    if (purchaseMode === "date") {
      if (!buyDateValue || !buyDateValue.isValid()) {
        showToast("Please select a valid buy date", "error");
        return false;
      }
      const now = dayjs();
      if (buyDateValue.isAfter(now, "day")) {
        showToast("Buy date cannot be in the future", "error");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      let currentPrice = null;
      let priceWarning = "";
      let resolvedBuyPrice = null;
      let buyPriceNote = "";
      const symbol = formData.symbol.toUpperCase();

      if (purchaseMode === "date") {
        try {
          const historical = await fetchHistoricalPrice(
            symbol,
            formData.buyDate
          );
          resolvedBuyPrice = parseFloat(historical.price);
          const effectiveDate = dayjs(historical.priceDate);
          buyPriceNote = ` (closing price on ${effectiveDate.format(
            "MM/DD/YYYY"
          )})`;
        } catch (error) {
          showToast(
            error.message ||
              "Unable to fetch the historical price for the selected date.",
            "error"
          );
          return;
        }
      } else {
        resolvedBuyPrice = parseFloat(formData.buyPrice);
      }

      if (Number.isNaN(resolvedBuyPrice)) {
        showToast("Please provide a valid buy price.", "error");
        return;
      }

      try {
        const stockData = await fetchStockPrice(symbol);
        currentPrice = stockData.currentPrice;
      } catch (error) {
        priceWarning = "Real-time data unavailable.";
        console.warn(`Could not fetch price for ${symbol}:`, error);
      }

      await onAdd({
        symbol,
        isin: selectedStock?.isin,
        name: formData.name,
        shares: parseFloat(formData.shares),
        buyPrice: resolvedBuyPrice,
        buyDate: formData.buyDate || null,
        currentPrice,
        entrySource: "manual",
        purchaseMode,
      });

      const baseMessage = `${symbol} has been added to your portfolio.`;
      const realtimeMessage = currentPrice
        ? ` Current price: $${currentPrice.toFixed(2)}.`
        : priceWarning
        ? ` ${priceWarning}`
        : "";
      const recordedBuyPriceMessage = ` Buy price recorded at $${resolvedBuyPrice.toFixed(
        2
      )}${buyPriceNote}.`;
      const buyDateMessage = formData.buyDate
        ? ` Buy date recorded as ${dayjs(formData.buyDate).format(
            "MM/DD/YYYY"
          )}.`
        : "";

      showToast(
        `${baseMessage}${realtimeMessage}${recordedBuyPriceMessage}${buyDateMessage}`,
        "success"
      );

      resetForm();
      onClose();
    } catch (error) {
      showToast(`Failed to add stock: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDialogClose = () => {
    resetForm();
    onClose();
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <>
        <Dialog
          open={open}
          onClose={handleDialogClose}
          maxWidth="sm"
          fullWidth
          slotProps={{ paper: { sx: styles.dialogPaper } }}
        >
          <DialogTitle sx={styles.dialogTitle}>
            Add Stock to Portfolio
          </DialogTitle>

          <DialogContent>
            <DialogContentText sx={styles.dialogDescription}>
              Search for a stock and enter your purchase details. Provide the buy
              price manually or select the date you purchased it and we'll fill it
              in for you. The current price will be fetched automatically.
            </DialogContentText>

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={styles.form}
              id="addStockForm"
            >
              <StockAutocomplete
                selectedStock={selectedStock}
                stockOptions={stockOptions}
                searchLoading={searchLoading}
                loading={loading}
                onStockSelect={handleStockSelect}
                onSearch={searchStocks}
              />

              <FormTextField
                label="Stock Symbol*"
                placeholder="e.g., AAPL"
                value={formData.symbol}
                onChange={(e) =>
                  updateFormField("symbol", e.target.value.toUpperCase())
                }
                disabled={loading}
              />

              <FormTextField
                label="Company Name*"
                placeholder="e.g., Apple Inc."
                value={formData.name}
                onChange={(e) => updateFormField("name", e.target.value)}
                disabled={loading}
              />

              <FormTextField
                label="Number of Shares*"
                placeholder="e.g., 10"
                type="number"
                htmlInputProps={{ step: "0.01", min: "0.01" }}
                value={formData.shares}
                onChange={(e) => updateFormField("shares", e.target.value)}
                disabled={loading}
              />

              <FormControl component="fieldset" sx={styles.purchaseModeGroup}>
                <FormLabel sx={styles.fieldLabel}>
                  How would you like to record the buy price?
                </FormLabel>
                <RadioGroup
                  row
                  value={purchaseMode}
                  onChange={handlePurchaseModeChange}
                  name="buy-price-mode"
                >
                  <FormControlLabel
                    value="price"
                    control={<Radio />}
                    label="Enter buy price"
                    disabled={loading}
                  />
                  <FormControlLabel
                    value="date"
                    control={<Radio />}
                    label="Select buy date"
                    disabled={loading}
                  />
                </RadioGroup>
              </FormControl>

              {purchaseMode === "price" ? (
                <FormTextField
                  label="Buy Price ($)*"
                  placeholder="e.g., 150.00"
                  type="number"
                  htmlInputProps={{ step: "0.01", min: "0.01" }}
                  value={formData.buyPrice}
                  onChange={(e) => updateFormField("buyPrice", e.target.value)}
                  disabled={loading}
                  required={purchaseMode === "price"}
                />
              ) : (
                <>
                  <DatePicker
                    label="Buy Date*"
                    value={buyDateValue}
                    onChange={handleBuyDateChange}
                    disableFuture
                    format="MM/DD/YYYY"
                    defaultCalendarMonth={DEFAULT_DATASET_MONTH}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: purchaseMode === "date",
                        disabled: loading,
                      },
                    }}
                  />
                  <DialogContentText sx={styles.helperText}>
                    The system will fetch the closing price on the selected date (or
                    the most recent trading day if markets were closed).
                  </DialogContentText>
                </>
              )}
            </Box>
          </DialogContent>

          <DialogActions sx={styles.dialogActions}>
            <Button
              onClick={handleDialogClose}
              variant="outlined"
              sx={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="addStockForm"
              variant="contained"
              sx={styles.submitButton}
              disabled={loading}
              startIcon={
                loading && <CircularProgress size={20} color="inherit" />
              }
            >
              {loading ? "Adding..." : "Add Stock"}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={toast.open}
          autoHideDuration={4000}
          onClose={() => setToast(INITIAL_TOAST_STATE)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setToast(INITIAL_TOAST_STATE)}
            severity={toast.severity}
            sx={{ width: "100%" }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      </>
    </LocalizationProvider>
  );
};

export default AddStockDialog;

const styles = {
  dialogPaper: {
    borderRadius: 3,
    maxWidth: 600,
  },
  dialogTitle: {
    fontSize: "1.75rem",
    fontWeight: 600,
    color: "#1a1a1a",
    pb: 1,
  },
  dialogDescription: {
    fontSize: "1rem",
    color: "#6b7280",
    mb: 3,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  fieldLabel: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "#1a1a1a",
    mb: 1,
  },
  purchaseModeGroup: {
    mt: -1,
    "& .MuiFormControlLabel-root": {
      marginRight: 3,
    },
    "& .MuiFormControlLabel-label": {
      fontSize: "0.95rem",
      fontWeight: 500,
    },
  },
  autocomplete: {
    "& .MuiInputLabel-root": {
      position: "static",
      transform: "none",
      fontSize: "1rem",
      fontWeight: 600,
      color: "#1a1a1a",
      marginBottom: 1,
    },
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      fontSize: "1rem",
      "& input": {
        padding: "14px 16px !important",
      },
      "& fieldset": {
        borderColor: "#e5e7eb",
      },
      "&:hover fieldset": {
        borderColor: "#d1d5db",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#3b82f6",
        borderWidth: 2,
      },
    },
  },
  helperText: {
    fontSize: "0.9rem",
    color: "#6b7280",
    mt: -1,
  },
  dialogActions: {
    px: 3,
    pb: 3,
    pt: 2,
    gap: 2,
  },
  cancelButton: {
    borderRadius: 2,
    textTransform: "none",
    fontSize: "1rem",
    fontWeight: 500,
    px: 3,
    py: 1.5,
    color: "#374151",
    borderColor: "#d1d5db",
    "&:hover": {
      borderColor: "#9ca3af",
      backgroundColor: "#f9fafb",
    },
  },
  submitButton: {
    borderRadius: 2,
    textTransform: "none",
    fontSize: "1rem",
    fontWeight: 500,
    px: 3,
    py: 1.5,
    backgroundColor: "#1a1a1a",
    "&:hover": {
      backgroundColor: "#2d2d2d",
    },
  },
};
