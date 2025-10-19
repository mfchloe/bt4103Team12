import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Autocomplete } from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import { X } from "lucide-react";

import { CHART_COLORS } from "../constants/colors";
import { formatCurrency } from "../utils/mathHelpers";
import { useSessionStorageState } from "../hooks/useSessionStorageState";
import { apiBaseUrl } from "../api/httpClient.js";

const API_BASE_URL = `${apiBaseUrl}/api/yfinance`;
const INITIAL_START_DATE = dayjs().subtract(6, "month");
const INITIAL_START_DATE_STRING = INITIAL_START_DATE.format("YYYY-MM-DD");

const TimeSeries = () => {
  const [searchInput, setSearchInput] = useSessionStorageState(
    "time-series:search-input",
    ""
  );
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [selectedStocks, setSelectedStocks] = useSessionStorageState(
    "time-series:selected-stocks",
    []
  );
  const [startDateRaw, setStartDateRaw] = useSessionStorageState(
    "time-series:start-date",
    INITIAL_START_DATE_STRING
  );
  const startDate = useMemo(
    () => (startDateRaw ? dayjs(startDateRaw) : null),
    [startDateRaw]
  );

  const [chartData, setChartData] = useSessionStorageState(
    "time-series:chart-data",
    []
  );
  const [lastRequestSignature, setLastRequestSignature] =
    useSessionStorageState("time-series:last-request", null);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [seriesError, setSeriesError] = useState(null);

  const hasValidDate = startDate && startDate.isValid();

  const handleSearchChange = useCallback(async (query) => {
    if (!query || query.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/search?q=${encodeURIComponent(query)}&limit=10`
      );
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching stocks:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleAddStock = (_, stock) => {
    if (!stock) return;
    setSelectedStocks((prev) => {
      const exists = prev.some((item) => item.symbol === stock.symbol);
      if (exists) {
        return prev;
      }
      return [...prev, stock];
    });
    setSearchInput("");
    setSearchResults([]);
  };

  const handleRemoveStock = (symbol) => {
    setSelectedStocks((prev) => prev.filter((stock) => stock.symbol !== symbol));
  };

  const transformedChartData = useMemo(() => {
    if (!chartData || !chartData.length) return [];

    const dateMap = new Map();
    chartData.forEach(({ symbol, prices }) => {
      prices.forEach(({ date, price }) => {
        if (!dateMap.has(date)) {
          dateMap.set(date, { date });
        }
        dateMap.get(date)[symbol] = price;
      });
    });

    return Array.from(dateMap.values()).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [chartData]);

  useEffect(() => {
    let ignore = false;

    const fetchSeries = async () => {
      if (!selectedStocks.length || !hasValidDate) {
        if (!ignore) {
          setChartData([]);
          setLastRequestSignature(null);
        }
        return;
      }

      const payload = {
        symbols: selectedStocks.map((stock) => stock.symbol),
        startDate: startDate.format("YYYY-MM-DD"),
      };
      const payloadSignature = JSON.stringify(payload);

      if (lastRequestSignature === payloadSignature && chartData.length) {
        return;
      }

      setLoadingSeries(true);
      setSeriesError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/historical-series`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorPayload = await response.json();
          throw new Error(
            errorPayload?.detail || "Failed to fetch historical prices."
          );
        }

        const data = await response.json();
        if (data.success) {
          if (!ignore) {
            setChartData(data.series || []);
            setLastRequestSignature(payloadSignature);
          }
        } else {
          throw new Error("Failed to fetch historical prices.");
        }
      } catch (error) {
        console.error("Error fetching historical series:", error);
        if (!ignore) {
          setSeriesError(error.message || "Failed to load historical prices.");
          setChartData([]);
          setLastRequestSignature(null);
        }
      } finally {
        if (!ignore) {
          setLoadingSeries(false);
        }
      }
    };

    fetchSeries();
    return () => {
      ignore = true;
    };
  }, [
    selectedStocks,
    startDateRaw,
    hasValidDate,
    chartData.length,
    lastRequestSignature,
  ]);

  const SelectedStocksList = () => {
    if (!selectedStocks.length) return null;

    return (
      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
        {selectedStocks.map((stock, index) => (
          <Chip
            key={stock.symbol}
            label={stock.symbol}
            onDelete={() => handleRemoveStock(stock.symbol)}
            deleteIcon={<X size={16} />}
            sx={{
              bgcolor: `${CHART_COLORS[index % CHART_COLORS.length]}20`,
              color: CHART_COLORS[index % CHART_COLORS.length],
              fontWeight: 600,
            }}
          />
        ))}
      </Stack>
    );
  };

  const ChartContainer = () => {
    if (!selectedStocks.length) {
      return (
        <Box sx={styles.placeholderBox}>
          <Typography variant="body1" color="text.secondary">
            Add at least one stock to see its historical performance.
          </Typography>
        </Box>
      );
    }

    if (loadingSeries) {
      return (
        <Box sx={styles.placeholderBox}>
          <CircularProgress />
        </Box>
      );
    }

    if (seriesError) {
      return (
        <Box sx={styles.placeholderBox}>
          <Alert severity="error">{seriesError}</Alert>
        </Box>
      );
    }

    if (!transformedChartData.length) {
      return (
        <Box sx={styles.placeholderBox}>
          <Typography variant="body1" color="text.secondary">
            No historical data available for the selected parameters.
          </Typography>
        </Box>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={transformedChartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip
            formatter={(value, name) => [`${formatCurrency(value)}`, name]}
          />
          <Legend />
          {selectedStocks.map((stock, index) => (
            <Line
              key={stock.symbol}
              type="monotone"
              dataKey={stock.symbol}
              stroke={CHART_COLORS[index % CHART_COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={styles.pageContainer}>
        <Typography variant="h4" sx={styles.pageTitle}>
          Time Series Analysis
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Compare historical closing prices across multiple stocks. Select the
          companies you want to track and choose a start date to explore their
          performance over time.
        </Typography>

        <Paper sx={styles.controlsCard}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            1. Search & Add Stocks
          </Typography>
          <Autocomplete
            options={searchResults}
            loading={searchLoading}
            value={null}
            inputValue={searchInput}
            onInputChange={(_, newValue, reason) => {
              setSearchInput(newValue);
              if (reason === "input") {
                handleSearchChange(newValue);
              }
            }}
            onChange={handleAddStock}
            getOptionLabel={(option) => `${option.symbol} - ${option.name}`}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search by symbol or company name (e.g., AAPL, Apple)"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {searchLoading ? (
                        <CircularProgress color="inherit" size={18} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            noOptionsText={
              searchInput
                ? searchLoading
                  ? "Searching..."
                  : "No matching stocks"
                : "Start typing to search stocks"
            }
          />
          <SelectedStocksList />

          <Typography variant="subtitle1" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
            2. Choose Start Date
          </Typography>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={(newDate) =>
              setStartDateRaw(
                newDate && newDate.isValid()
                  ? newDate.format("YYYY-MM-DD")
                  : null
              )
            }
            disableFuture
            maxDate={dayjs()}
            slotProps={{
              textField: {
                fullWidth: true,
              },
            }}
          />
        </Paper>

        <Paper sx={styles.chartCard}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Price History
          </Typography>
          <ChartContainer />
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default TimeSeries;

const styles = {
  pageContainer: {
    minHeight: "100vh",
    px: { xs: 2, md: 4 },
    py: 4,
    maxWidth: 1200,
    margin: "0 auto",
  },
  pageTitle: {
    fontWeight: 700,
    color: "#305D9E",
    mb: 1,
  },
  controlsCard: {
    p: 3,
    borderRadius: 3,
    mb: 4,
    border: "1px solid #e5e7eb",
  },
  chartCard: {
    p: 3,
    borderRadius: 3,
    border: "1px solid #e5e7eb",
    minHeight: 420,
  },
  placeholderBox: {
    height: 400,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px dashed #d1d5db",
    borderRadius: 2,
    bgcolor: "#f9fafb",
  },
};
