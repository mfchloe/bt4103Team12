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
  Grid,
  Link as MuiLink,
  Tooltip as MuiTooltip,
  IconButton,
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
import {
  X,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus as MinusIcon,
} from "lucide-react";

import { CHART_COLORS } from "../constants/colors";
import { formatCurrency } from "../utils/mathHelpers";
import { useSessionStorageState } from "../hooks/useSessionStorageState";
import { apiBaseUrl } from "../api/httpClient.js";

<<<<<<< HEAD
const API_BASE_URL = "http://localhost:8000/api/yfinance";
const SENTIMENT_API = "http://localhost:8000/api/sentiment/news-sentiment";
=======
const API_BASE_URL = `${apiBaseUrl}/api/yfinance`;
>>>>>>> a7384e1471eeebdb885c1284a4db18e076cdd6af
const INITIAL_START_DATE = dayjs().subtract(6, "month");
const INITIAL_START_DATE_STRING = INITIAL_START_DATE.format("YYYY-MM-DD");

const TimeSeries = () => {
<<<<<<< HEAD
  // search
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // selections & date
  const [selectedStocks, setSelectedStocks] = useState([]);
  const [startDate, setStartDate] = useState(INITIAL_START_DATE);

  // prices
  const [chartData, setChartData] = useState([]);
=======
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
>>>>>>> a7384e1471eeebdb885c1284a4db18e076cdd6af
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [seriesError, setSeriesError] = useState(null);

  // sentiments
  const [sentiments, setSentiments] = useState({});
  const [sentLoading, setSentLoading] = useState(false);
  const [sentError, setSentError] = useState(null);

  const hasValidDate = startDate && startDate.isValid();

  // ---------- helpers (JSX-safe) ----------
  const colorForSymbol = useCallback(
    (symbol) => {
      if (!selectedStocks.length) return "#999999";
      const idx = selectedStocks.findIndex((s) => s.symbol === symbol);
      return CHART_COLORS[idx % CHART_COLORS.length];
    },
    [selectedStocks]
  );

  const sentimentColor = (label) => {
    if (label === "Positive") return "#16a34a"; // green
    if (label === "Negative") return "#dc2626"; // red
    return "#6b7280"; // gray
  };

  const scoreColor = (score100) => {
    if (score100 > 30) return "#16a34a";
    if (score100 < -30) return "#dc2626";
    return "#6b7280";
  };

  const DirectionIcon = ({ dir }) => {
    if (dir === "up") return <TrendingUp size={18} />;
    if (dir === "down") return <TrendingDown size={18} />;
    return <MinusIcon size={18} />;
  };

  const formatPubDate = (iso) => {
    if (!iso) return "";
    try {
      return dayjs(iso).format("YYYY-MM-DD");
    } catch {
      return "";
    }
  };

  // ---------- search ----------
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
      // FIX: your backend doesn't return {success}; just use results array
      const data = await response.json();
      setSearchResults(Array.isArray(data.results) ? data.results : []);
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
      if (exists) return prev;
      return [...prev, stock];
    });
    setSearchInput("");
    setSearchResults([]);
  };

  const handleRemoveStock = (symbol) => {
    setSelectedStocks((prev) =>
      prev.filter((stock) => stock.symbol !== symbol)
    );
  };

  // ---------- transform chart data ----------
  const transformedChartData = useMemo(() => {
    if (!chartData || !chartData.length) return [];
    const dateMap = new Map();
    chartData.forEach(({ symbol, prices }) => {
      (prices || []).forEach(({ date, price }) => {
        if (!dateMap.has(date)) dateMap.set(date, { date });
        dateMap.get(date)[symbol] = price;
      });
    });
    return Array.from(dateMap.values()).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [chartData]);

  // ---------- fetch price series ----------
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
<<<<<<< HEAD
        const payload = {
          symbols: selectedStocks.map((stock) => stock.symbol),
          startDate: startDate.format("YYYY-MM-DD"),
        };
=======
>>>>>>> a7384e1471eeebdb885c1284a4db18e076cdd6af
        const response = await fetch(`${API_BASE_URL}/historical-series`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(
            errorPayload?.detail || "Failed to fetch historical prices."
          );
        }
        const data = await response.json();
<<<<<<< HEAD
        // FIX: no {success} in backend response
        setChartData(Array.isArray(data.series) ? data.series : []);
=======
        if (data.success) {
          if (!ignore) {
            setChartData(data.series || []);
            setLastRequestSignature(payloadSignature);
          }
        } else {
          throw new Error("Failed to fetch historical prices.");
        }
>>>>>>> a7384e1471eeebdb885c1284a4db18e076cdd6af
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

  // ---------- fetch sentiments ----------
  useEffect(() => {
    const fetchSentiments = async () => {
      if (!selectedStocks.length) {
        setSentiments({});
        return;
      }
      setSentLoading(true);
      setSentError(null);
      try {
        const payload = {
          symbols: selectedStocks.map((s) => s.symbol),
          max_headlines_per_symbol: 5,
        };
        const resp = await fetch(SENTIMENT_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err?.detail || "Failed to fetch sentiments");
        }
        const data = await resp.json();
        setSentiments(data.sentiments || {});
      } catch (e) {
        console.error(e);
        setSentError(e.message || "Failed to load sentiments.");
        setSentiments({});
      } finally {
        setSentLoading(false);
      }
    };
    fetchSentiments();
  }, [selectedStocks]);

  // ---------- sub-components ----------
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

  const SentimentCard = ({ sym, data }) => {
    const stripe = colorForSymbol(sym);
    const badgeColor = sentimentColor(data.summary_label);
    const picked = data.picked_headline;

    return (
      <Paper
        elevation={0}
        sx={{
          border: "1px solid #e5e7eb",
          borderRadius: 2,
          overflow: "hidden",
          transition: "box-shadow 0.2s ease",
          "&:hover": { boxShadow: "0px 6px 20px rgba(0,0,0,0.08)" },
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", p: 2, gap: 1 }}>
          <Box
            sx={{ width: 8, height: 28, borderRadius: 2, bgcolor: stripe }}
          />
          <Typography sx={{ fontWeight: 800, letterSpacing: 0.5 }}>
            {sym}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              px: 1,
              py: 0.5,
              borderRadius: 999,
              bgcolor: `${badgeColor}1A`,
              color: badgeColor,
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            <DirectionIcon dir={data.direction} />
            {data.summary_label}
          </Box>
        </Box>

        {/* Content */}
        <Box
          sx={{
            px: 2,
            pb: 2,
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography sx={{ color: "#6b7280", fontSize: 12, mb: 0.5 }}>
            Sentiment Score:
          </Typography>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: 28,
              lineHeight: 1.1,
              color: scoreColor(data.summary_score100),
              mb: 1.5,
              minHeight: "2.5em",
            }}
          >
            {data.summary_score100}
          </Typography>

          {picked ? (
            <>
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 600,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  mb: 1,
                  minHeight: "2.8em",
                  flex: 1,
                }}
                title={picked.title}
              >
                {picked.title}
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  color: "#6b7280",
                  fontSize: 12,
                }}
              >
                <span>{picked.source || "—"}</span>
                <span>•</span>
                <span>{formatPubDate(picked.published_at)}</span>
                <Box sx={{ flex: 1 }} />
                {picked.url && (
                  <MuiTooltip title="Read more">
                    <IconButton
                      size="small"
                      component={MuiLink}
                      href={picked.url}
                      target="_blank"
                      rel="noopener"
                      aria-label="Read more"
                    >
                      <ExternalLink size={16} />
                    </IconButton>
                  </MuiTooltip>
                )}
              </Box>
            </>
          ) : (
            <Typography sx={{ color: "#9ca3af", fontStyle: "italic" }}>
              No recent headlines found.
            </Typography>
          )}
        </Box>
      </Paper>
    );
  };

  // ---------- render ----------
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={styles.pageContainer}>
        <Typography variant="h4" sx={styles.pageTitle}>
          Time Series Analysis
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Compare historical closing prices and scan recent news sentiment at a
          glance.
        </Typography>

        {/* Controls */}
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
              if (reason === "input") handleSearchChange(newValue);
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

          <Typography
            variant="subtitle1"
            sx={{ mt: 4, mb: 2, fontWeight: 600 }}
          >
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
            slotProps={{ textField: { fullWidth: true } }}
          />
        </Paper>

        {/* Chart - Full Width */}
        <Paper sx={styles.chartCard}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Price History
          </Typography>
          <ChartContainer />
        </Paper>

        {/* Sentiment - 2 Column Grid */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Sentiment
          </Typography>

          {!selectedStocks.length && (
            <Box sx={styles.placeholderBox}>
              <Typography variant="body1" color="text.secondary">
                Add stocks to view sentiment cards.
              </Typography>
            </Box>
          )}

          {sentError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {sentError}
            </Alert>
          )}

          {sentLoading && (
            <Box sx={styles.placeholderBox}>
              <CircularProgress />
            </Box>
          )}

          {!sentLoading && !sentError && selectedStocks.length > 0 && (
            <Grid container spacing={3}>
              {selectedStocks.map((s) => {
                const data = sentiments?.[s.symbol] || {
                  summary_label: "Neutral",
                  summary_score100: 0,
                  direction: "flat",
                  picked_headline: null,
                  headlines: [],
                };
                return (
                  <Grid
                    item
                    xs={12}
                    md={6}
                    key={s.symbol}
                    sx={{ display: "flex" }}
                  >
                    <SentimentCard sym={s.symbol} data={data} />
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
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
