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
import { X, TrendingUp, TrendingDown, Minus as MinusIcon } from "lucide-react";

import { CHART_COLORS } from "../constants/colors";
import { formatCurrency } from "../utils/mathHelpers";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { useSessionStorageState } from "../hooks/useSessionStorageState";
import { apiBaseUrl } from "../api/httpClient.js";

const API_BASE_URL = `${apiBaseUrl}/api/dataset/timeseries`;
const MAX_AVAILABLE_DATE = dayjs("2022-11-29");
const INITIAL_START_DATE = dayjs("2021-01-01");
const INITIAL_START_DATE_STRING = INITIAL_START_DATE.format("YYYY-MM-DD");

const applyAlpha = (hex, alpha) => {
  if (!hex) return `rgba(241,245,249,${alpha})`;
  const normalized = hex.replace("#", "");
  const bigint = parseInt(
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized,
    16
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const CARD_ALPHA = 0.2;
const defaultPalette = {
  light: applyAlpha("#0f172a", CARD_ALPHA),
  dark: "#0f172a",
};

const TimeSeries = () => {
  const [searchInput, setSearchInput] = useLocalStorageState(
    "time-series:search-input",
    ""
  );
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [selectedStocks, setSelectedStocks] = useLocalStorageState(
    "time-series:selected-stocks",
    []
  );
  const [startDateRaw, setStartDateRaw] = useLocalStorageState(
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

  const hasValidDate =
    startDate &&
    startDate.isValid() &&
    !startDate.isAfter(MAX_AVAILABLE_DATE);

  useEffect(() => {
    if (!startDate || !startDate.isValid()) {
      if (startDateRaw !== INITIAL_START_DATE_STRING) {
        setStartDateRaw(INITIAL_START_DATE_STRING);
      }
      return;
    }
    const maxDateString = MAX_AVAILABLE_DATE.format("YYYY-MM-DD");
    if (startDate.isAfter(MAX_AVAILABLE_DATE) && startDateRaw !== maxDateString) {
      setStartDateRaw(maxDateString);
    }
  }, [
    startDate,
    startDateRaw,
    setStartDateRaw,
    INITIAL_START_DATE_STRING,
    MAX_AVAILABLE_DATE,
  ]);

  const getAssetKey = useCallback(
    (asset) => (asset?.isin ? asset.isin : asset?.symbol),
    []
  );

  const pickNextColor = useCallback((existingStocks = []) => {
    const used = new Set(
      existingStocks
        .map((stock) => stock?.color)
        .filter((color) => color && CHART_COLORS.includes(color))
    );
    const available = CHART_COLORS.find((color) => !used.has(color));
    if (available) return available;
    const fallbackIndex = existingStocks.length % CHART_COLORS.length;
    return CHART_COLORS[fallbackIndex];
  }, []);

  // ---------- helpers (JSX-safe) ----------
  const getSymbolIndex = useCallback(
    (identifier) => {
      if (!selectedStocks.length) return 0;
      const idx = selectedStocks.findIndex(
        (s) => s.symbol === identifier || getAssetKey(s) === identifier
      );
      return idx >= 0 ? idx : 0;
    },
    [selectedStocks, getAssetKey]
  );

  const getColorForIdentifier = useCallback(
    (identifier) => {
      const match = selectedStocks.find(
        (stock) =>
          getAssetKey(stock) === identifier || stock.symbol === identifier
      );
      if (match?.color && CHART_COLORS.includes(match.color)) {
        return match.color;
      }
      const idx = getSymbolIndex(identifier);
      return CHART_COLORS[idx % CHART_COLORS.length];
    },
    [selectedStocks, getAssetKey, getSymbolIndex]
  );

  const getPaletteForSymbol = useCallback(
    (identifier) => {
      const stroke = getColorForIdentifier(identifier);
      if (!stroke) return defaultPalette;
      return {
        light: applyAlpha(stroke, CARD_ALPHA),
        dark: stroke,
      };
    },
    [getColorForIdentifier]
  );

  const chartColorForSymbol = useCallback(
    (identifier) => {
      const palette = getPaletteForSymbol(identifier);
      return palette.dark;
    },
    [getPaletteForSymbol]
  );

  const sentimentColor = (label) => {
    if (label === "Positive") return "#16a34a"; // green
    if (label === "Negative") return "#dc2626"; // red
    return "#6b7280"; // gray
  };

  const DirectionIcon = ({ dir }) => {
    if (dir === "up") return <TrendingUp size={18} />;
    if (dir === "down") return <TrendingDown size={18} />;
    return <MinusIcon size={18} />;
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

    const normalized = { ...stock };
    normalized.isin =
      typeof stock?.isin === "string" ? stock.isin.trim() : stock?.isin;
    normalized.name =
      typeof stock?.name === "string" ? stock.name.trim() : stock?.name;
    normalized.symbol =
      typeof stock?.symbol === "string"
        ? stock.symbol.trim()
        : normalized.name || normalized.isin || stock.symbol || stock.name;

    setSelectedStocks((prev) => {
      const exists = prev.some((item) => {
        const itemKey = getAssetKey(item);
        if (normalized.isin) {
          return itemKey === normalized.isin;
        }
        return item.symbol === normalized.symbol;
      });
      if (exists) return prev;
      const color = pickNextColor(prev);
      return [...prev, { ...normalized, color }];
    });
    setSearchInput("");
    setSearchResults([]);
  };

  const handleRemoveStock = (identifier) => {
    setSelectedStocks((prev) =>
      prev.filter((stock) => getAssetKey(stock) !== identifier)
    );
  };

  useEffect(() => {
    setSelectedStocks((prev) => {
      if (!prev?.length) return prev;

      const used = new Set();
      let changed = false;

      const updated = prev.map((stock, index) => {
        let color =
          stock?.color && CHART_COLORS.includes(stock.color)
            ? stock.color
            : null;
        if (color && used.has(color)) {
          color = null;
        }
        if (!color) {
          const available = CHART_COLORS.find((c) => !used.has(c));
          color =
            available ?? CHART_COLORS[index % CHART_COLORS.length];
          changed = true;
          used.add(color);
          return { ...stock, color };
        }
        used.add(color);
        return stock;
      });

      return changed ? updated : prev;
    });
  }, [setSelectedStocks]);

  // ---------- transform chart data ----------
  const transformedChartData = useMemo(() => {
    if (!chartData || !chartData.length) return [];
    const dateMap = new Map();
    chartData.forEach(({ isin, symbol, prices }) => {
      const key = isin || symbol;
      if (!key) return;
      (prices || []).forEach(({ date, price }) => {
        if (!date) return;
        if (!dateMap.has(date)) dateMap.set(date, { date });
        dateMap.get(date)[key] = price;
      });
    });
    return Array.from(dateMap.values()).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [chartData]);

  const sharpeSummaries = useMemo(() => {
    if (!chartData?.length) return {};

    const summaries = {};
    const annualizationFactor = Math.sqrt(252);
    const halfPi = Math.PI / 2;

    chartData.forEach((series) => {
      const { prices = [], symbol, isin } = series || {};
      if (!prices.length) return;

      const sorted = [...prices].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      const returns = [];
      for (let i = 1; i < sorted.length; i += 1) {
        const prev = Number(sorted[i - 1].price);
        const curr = Number(sorted[i].price);
        if (!Number.isFinite(prev) || !Number.isFinite(curr) || prev <= 0) {
          continue;
        }
        const ret = curr / prev - 1;
        if (Number.isFinite(ret)) returns.push(ret);
      }

      const startPrice = Number(sorted[0].price);
      const endPrice = Number(sorted[sorted.length - 1].price);
      const overallReturn =
        Number.isFinite(startPrice) && startPrice > 0 && Number.isFinite(endPrice)
          ? endPrice / startPrice - 1
          : 0;

      let scaledScore = 0;
      if (returns.length > 1) {
        const mean =
          returns.reduce((acc, value) => acc + value, 0) / returns.length;
        const variance =
          returns.length > 1
            ? returns.reduce(
                (acc, value) => acc + (value - mean) * (value - mean),
                0
              ) /
              (returns.length - 1)
            : 0;
        const stdDev = Math.sqrt(Math.max(variance, 0));

        if (stdDev > 0) {
          const rawSharpe = (mean / stdDev) * annualizationFactor;
          const normalized = Math.atan(rawSharpe) / halfPi;
          scaledScore = Number.isFinite(normalized) ? normalized : 0;
        } else {
          if (overallReturn > 0) scaledScore = 1;
          else if (overallReturn < 0) scaledScore = -1;
          else scaledScore = 0;
        }
      } else {
        if (overallReturn > 0) scaledScore = 1;
        else if (overallReturn < 0) scaledScore = -1;
        else scaledScore = 0;
      }

      const clamped = Math.max(-1, Math.min(1, scaledScore));
      const rounded = Number.isFinite(clamped) ? Number(clamped.toFixed(4)) : 0;

      const label =
        rounded > 0 ? "Positive" : rounded < 0 ? "Negative" : "Neutral";
      const direction = rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";

      const entry = {
        summary_label: label,
        direction,
        score: rounded,
      };

      const keySymbol = symbol || isin;
      if (keySymbol) summaries[keySymbol] = entry;
      if (symbol && symbol !== keySymbol) summaries[symbol] = entry;
      if (isin && isin !== keySymbol) summaries[isin] = entry;
    });

    return summaries;
  }, [chartData]);

  // ---------- fetch price series ----------
  useEffect(() => {
    let ignore = false;

    const fetchSeries = async () => {
      setSeriesError(null);

      if (!selectedStocks.length || !hasValidDate) {
        if (!ignore) {
          setChartData([]);
          setLastRequestSignature(null);
        }
        return;
      }

      const validAssets = selectedStocks.filter((stock) => stock.isin);
      if (!validAssets.length) {
        if (!ignore) {
          setChartData([]);
          setLastRequestSignature(null);
          setSeriesError(
            "Selected assets are missing dataset identifiers. Please re-add them from the search."
          );
        }
        return;
      }

      const payload = {
        isins: validAssets.map((stock) => stock.isin),
        startDate: startDate.format("YYYY-MM-DD"),
        endDate: MAX_AVAILABLE_DATE.format("YYYY-MM-DD"),
      };
      const payloadSignature = JSON.stringify(payload);

      if (lastRequestSignature === payloadSignature && chartData.length) {
        return;
      }

      setLoadingSeries(true);
      try {
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
        const series = Array.isArray(data.series) ? data.series : [];
        const normalizedSeries = series.map((item) => {
          const matched = validAssets.find((stock) => stock.isin === item.isin);
          return {
            ...item,
            isin: item.isin || matched?.isin,
            symbol: matched?.symbol || item.symbol || item.isin,
            name: matched?.name || item.name,
            prices: item.prices || [],
          };
        });
        if (!ignore) {
          setChartData(normalizedSeries);
          setLastRequestSignature(payloadSignature);
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


  // ---------- sub-components ----------
  const SelectedStocksList = () => {
    return (
      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
        {selectedStocks.map((stock, index) => {
          const identifier = getAssetKey(stock) || stock.symbol;
          const palette = getPaletteForSymbol(identifier);
          return (
            <Chip
              key={identifier}
              label={stock.symbol}
              onDelete={() => handleRemoveStock(identifier)}
              deleteIcon={<X size={16} />}
              sx={{
                bgcolor: "transparent",
                color: palette.dark,
                fontWeight: 600,
              }}
            />
          );
        })}
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
            position={{ y: 0 }}
            wrapperStyle={{ pointerEvents: "none" }}
            contentStyle={{
              borderRadius: 8,
              borderColor: "#e5e7eb",
              boxShadow: "0px 8px 16px rgba(15, 23, 42, 0.12)",
            }}
          />
          <Legend />
          {selectedStocks.map((stock, index) => {
            const dataKey = getAssetKey(stock) || stock.symbol;
            return (
              <Line
                key={dataKey}
                type="monotone"
                dataKey={dataKey}
                name={stock.symbol}
                stroke={chartColorForSymbol(dataKey)}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const SentimentCard = ({ stock, identifier, data }) => {
    const palette = getPaletteForSymbol(identifier);
    const stripe = palette.dark;
    const cardBg = palette.light;
    const badgeColor = sentimentColor(data.summary_label);
    const scoreValue = Number.isFinite(data?.score) ? data.score : 0;
    const name =
      typeof stock?.name === "string" && stock.name.trim()
        ? stock.name.trim()
        : null;

    return (
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          minWidth: 0,
          borderRadius: 2,
          overflow: "hidden",
          transition: "box-shadow 0.2s ease",
          "&:hover": { boxShadow: "0px 6px 20px rgba(0,0,0,0.08)" },
          display: "flex",
          flexDirection: "column",
          height: "100%",
          bgcolor: cardBg,
          color: palette.dark,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", p: 2, gap: 1 }}>
          <Box sx={{ width: 8, height: 28, borderRadius: 2, bgcolor: stripe }} />
          <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontWeight: 800,
                letterSpacing: 0.5,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={stock?.symbol || identifier}
            >
              {stock?.symbol || identifier}
            </Typography>
            {name && (
              <Typography
                sx={{
                  fontSize: 12,
                  color: "#475569",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={name}
              >
                {name}
              </Typography>
            )}
          </Box>
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
              whiteSpace: "nowrap",
            }}
          >
            <DirectionIcon dir={data.direction} />
            {data.summary_label}
          </Box>
        </Box>

        <Box
          sx={{
            px: 2,
            pb: 2,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            width: "100%",
            minWidth: 0,
          }}
        >
          <Typography
            sx={{
              color: palette.dark,
              fontSize: 12,
              mb: 0.5,
              fontWeight: 600,
            }}
          >
            Sentiment Score:
          </Typography>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: 32,
              lineHeight: 1.1,
              color: palette.dark,
            }}
          >
            {scoreValue.toFixed(2)}
          </Typography>
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
            getOptionLabel={(option) => {
              if (!option) return "";
              const symbol =
                (typeof option.symbol === "string" && option.symbol.trim()) ||
                (typeof option.name === "string" && option.name.trim()) ||
                option.isin ||
                "";
              const name =
                typeof option.name === "string" && option.name.trim()
                  ? option.name.trim()
                  : "";
              const namePart =
                name && name !== symbol ? ` - ${name}` : "";
              const isinPart = option.isin ? ` (${option.isin})` : "";
              return `${symbol}${namePart}${isinPart}`.trim();
            }}
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
            maxDate={MAX_AVAILABLE_DATE}
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

          {selectedStocks.length > 0 && (
            <Grid
              container
              spacing={3}
              sx={{ alignItems: "stretch", width: "100%", mx: 0 }}
            >
              {selectedStocks.map((stock) => {
                const identifier = getAssetKey(stock) || stock.symbol;
                const data =
                  sharpeSummaries[identifier] ||
                  sharpeSummaries[stock.symbol] || {
                    summary_label: "Neutral",
                    direction: "flat",
                    score: 0,
                  };
                return (
                  <Grid
                    item
                    xs={12}
                    md={6}
                    key={stock.symbol}
                    sx={{ display: "flex", minWidth: 0 }}
                  >
                    <SentimentCard
                      stock={stock}
                      identifier={identifier}
                      data={data}
                    />
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
    bgcolor: "#f5f6fa",
  },
  chartCard: {
    p: 3,
    borderRadius: 3,
    border: "1px solid #e5e7eb",
    minHeight: 420,
    bgcolor: "#f5f6fa",
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



