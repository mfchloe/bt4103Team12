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
} from "@mui/material";
import FormTextField from "../FormTextField";
import CustomButton from "../CustomButton";

const API_BASE_URL = "http://localhost:8000/api/yfinance";

const INITIAL_FORM_STATE = {
  symbol: "",
  name: "",
  shares: "",
  buyPrice: "",
};

const INITIAL_TOAST_STATE = {
  open: false,
  message: "",
  severity: "success",
};

// AUTOCOMPLETE component
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
      getOptionLabel={(option) => `${option.symbol} - ${option.name}`}
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
  const [toast, setToast] = useState(INITIAL_TOAST_STATE);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [stockOptions, setStockOptions] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);

  // success/error for stock addition after submit button pressed
  const showToast = (message, severity = "success") => {
    setToast({ open: true, message, severity });
  };

  // API calls

  // search autocomplete
  const searchStocks = async (query) => {
    if (!query || query.length < 1) {
      setStockOptions([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/search?q=${encodeURIComponent(query)}&limit=10`
      );
      const data = await response.json();

      if (data.success) {
        setStockOptions(data.results);
      }
    } catch (error) {
      console.error("Error searching stocks:", error);
      setStockOptions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // fetch SINGLE stock price (for the one that's selected)
  const fetchStockPrice = async (symbol) => {
    const response = await fetch(`${API_BASE_URL}/${symbol}`);
    const data = await response.json();

    if (data.success) {
      return {
        currentPrice: data.currentPrice,
        name: data.name,
      };
    }
    throw new Error(data.error || "Failed to fetch stock data");
  };

  // change stock name, symbol when new stock selected
  const handleStockSelect = (_, value) => {
    setSelectedStock(value);
    setFormData((prev) => ({
      ...prev,
      symbol: value?.symbol || "",
      name: value?.name || "",
    }));
  };

  // FORM CRUD

  // form reset
  const resetForm = () => {
    setFormData(INITIAL_FORM_STATE);
    setSelectedStock(null);
    setStockOptions([]);
  };

  const updateFormField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const { symbol, name, shares, buyPrice } = formData;
    if (!symbol || !name || !shares || !buyPrice) {
      showToast("Please fill in all fields", "error");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      // try to fetch current price
      let currentPrice = null;
      let priceWarning = "";

      try {
        const stockData = await fetchStockPrice(formData.symbol);
        currentPrice = stockData.currentPrice;
      } catch (error) {
        // if price fetch fails, allow manual entry without current price
        priceWarning = " (real-time data unavailable)";
        console.warn(`Could not fetch price for ${formData.symbol}:`, error);
      }

      // add stock
      onAdd({
        symbol: formData.symbol.toUpperCase(),
        name: formData.name,
        shares: parseFloat(formData.shares),
        buyPrice: parseFloat(formData.buyPrice),
        currentPrice: currentPrice,
      });

      // show success message
      const successMessage = currentPrice
        ? `${formData.symbol.toUpperCase()} has been added to your portfolio at $${currentPrice}`
        : `${formData.symbol.toUpperCase()} has been added to your portfolio${priceWarning}`;

      showToast(successMessage, "success");

      resetForm();
      onClose();
    } catch (error) {
      showToast(`Failed to add stock: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // close dialog (cancel or press away)
  const handleDialogClose = () => {
    resetForm();
    onClose();
  };

  return (
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
            Search for a stock and enter your purchase details. The current
            price of the stock will be fetched automatically.
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

            <FormTextField
              label="Buy Price ($)*"
              placeholder="e.g., 150.00"
              type="number"
              htmlInputProps={{ step: "0.01", min: "0.01" }}
              value={formData.buyPrice}
              onChange={(e) => updateFormField("buyPrice", e.target.value)}
              disabled={loading}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={styles.dialogActions}>
          <CustomButton
            onClick={handleDialogClose}
            variant="outlined"
            sx={styles.cancelButton}
            disabled={loading}
          >
            Cancel
          </CustomButton>
          <CustomButton
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
          </CustomButton>
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
