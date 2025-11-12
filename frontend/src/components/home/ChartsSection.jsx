import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Box, Typography, Paper, Grid } from "@mui/material";
import { GREEN, RED } from "../../constants/colors";
import {
  calculateStockStats,
  formatCurrency,
} from "../../utils/mathHelpers";

const COLORS = [
  "#305D9E",
  "#2E8B8B",
  "#E67E22",
  "#9B59B6",
  "#E74C3C",
  "#16A085",
  "#F39C12",
  "#8E44AD",
];

// ---------- Tooltips ----------
const CustomPLTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  if (!data || data.pl === undefined) return null;

  return (
    <Paper sx={styles.tooltipPaper}>
      <Typography fontWeight={600}>{data.name}</Typography>
      <Typography color={data.pl >= 0 ? "success.main" : "error.main"}>
        P&L: ${Number(data.pl).toFixed(2)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Return: {data.plPercent ?? "-"}%
      </Typography>
    </Paper>
  );
};

// ---------- Charts ----------
const PortfolioPieChart = ({ data }) => {
  const chartData = data
    .filter((entry) => entry.value > 0)
    .map((entry, index) => ({
      ...entry,
      color: COLORS[index % COLORS.length],
    }));
  const totalValue = chartData.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <Box sx={styles.pieWrapper}>
      <Box sx={styles.pieBox}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={90}
              innerRadius={50}
              dataKey="value"
              fontSize={12}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => {
                const percent = totalValue
                  ? ((value / totalValue) * 100).toFixed(1)
                  : "0.0";
                return [`${formatCurrency(value)} (${percent}%)`];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>

      <Box sx={styles.legendBox}>
        <Box sx={styles.legendContent}>
          {chartData.map((entry, index) => (
            <Box
              key={entry.name}
              sx={{
                ...styles.legendItem,
                mb: index === chartData.length - 1 ? 0 : 1.5,
              }}
            >
              <Box sx={styles.legendItemTextBox}>
                <Box sx={{ ...styles.legendDot, bgcolor: entry.color }} />
                <Typography sx={styles.legendLabel}>{entry.name}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

const PLBarChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip content={<CustomPLTooltip />} />
      <Bar dataKey="pl" radius={[8, 8, 0, 0]}>
        {data.map((entry, index) => (
          <Cell key={index} fill={entry.pl >= 0 ? "#16A085" : "#E74C3C"} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

const ReturnBarChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data} layout="vertical">
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis type="number" />
      <YAxis dataKey="name" type="category" width={80} />
      <Tooltip content={<CustomPLTooltip />} />
      <Bar dataKey="return" radius={[0, 8, 8, 0]}>
        {data.map((entry, index) => (
          <Cell key={index} fill={entry.return >= 0 ? GREEN : RED} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

// ---------- Main Section ----------
const ChartsSection = ({ portfolio }) => {
  const filteredPortfolio = portfolio.filter(
    (stock) => Number(stock.shares) > 0
  );

  const portfolioWithStats = filteredPortfolio.map((stock) => ({
    stock,
    stats: calculateStockStats(stock),
  }));

  const allocationData = portfolioWithStats.map(({ stock, stats }) => ({
    name: stock.symbol,
    value: Number.isFinite(stats.totalValue) ? stats.totalValue : 0,
    percentage: 0,
  }));
  const totalValue = allocationData.reduce((sum, entry) => sum + entry.value, 0);
  allocationData.forEach((entry) => {
    entry.percentage = totalValue
      ? ((entry.value / totalValue) * 100).toFixed(1)
      : "0.0";
  });

  const plData = portfolioWithStats
    .map(({ stock, stats }) => ({
      name: stock.symbol,
      pl: stats.pl,
      plPercent: Number.isFinite(stats.returnPercent)
        ? stats.returnPercent.toFixed(2)
        : "-",
    }))
    .sort((a, b) => b.pl - a.pl);

  const returnData = portfolioWithStats
    .map(({ stock, stats }) => {
      if (!Number.isFinite(stats.returnPercent)) return null;
      return {
        name: stock.symbol,
        return: Number(stats.returnPercent.toFixed(2)),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.return - a.return);

  return (
    <Box sx={styles.container}>
      <Grid container spacing={4} justifyContent="center">
        <Grid item xs={{ xs: 12, md: 6 }} sx={{ minWidth: 400 }}>
          <Typography sx={styles.sectionTitle}>Portfolio Allocation</Typography>
          <PortfolioPieChart data={allocationData} />
        </Grid>

        <Grid item xs={{ xs: 12, md: 6 }} sx={{ minWidth: 400 }}>
          <Typography sx={styles.sectionTitle}>
            Profit & Loss by Stock
          </Typography>
          <PLBarChart data={plData} />
        </Grid>
      </Grid>

      <Box mt={4}>
        <Typography sx={styles.sectionTitle}>Returns by Stock (%)</Typography>
        <ReturnBarChart data={returnData} />
      </Box>
    </Box>
  );
};

export default ChartsSection;

// ---------- Styles ----------
const styles = {
  container: { p: 3, mb: 6 },
  sectionTitle: { fontSize: 16, fontWeight: 600, mb: 2 },
  pieWrapper: {
    display: "flex",
    flexDirection: { xs: "column", md: "row" },
    gap: 3,
    alignItems: { xs: "stretch", md: "center" },
  },
  pieBox: { flex: "1 1 280px", minWidth: 260, height: 280 },
  legendBox: {
    flex: "1 1 220px",
    minWidth: { xs: "100%" },
    maxHeight: 280,
    overflowY: "auto",
    overflowX: "hidden",
    borderRadius: 2,
    p: 2,
    direction: "rtl", // moves the scrollbar to the left
    "&::-webkit-scrollbar": {
      width: 8,
    },
    "&::-webkit-scrollbar-track": {
      background: "#f1f1f1",
      borderRadius: 8,
    },
    "&::-webkit-scrollbar-thumb": {
      background: "#cbd5f5",
      borderRadius: 8,
    },
    "&::-webkit-scrollbar-thumb:hover": {
      background: "#94a3b8",
    },
  },
  legendContent: {
    direction: "ltr",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    mb: 1.5,
  },
  legendItemTextBox: { display: "flex", alignItems: "center", gap: 1.5 },
  legendDot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  legendLabel: { fontWeight: 600, color: "#111827", fontSize: 11 },
  legendValue: {
    color: "#4b5563",
    textAlign: "right",
    whiteSpace: "nowrap",
    fontSize: 10.5,
  },
  tooltipPaper: { p: 1.5, borderRadius: 2 },
};
