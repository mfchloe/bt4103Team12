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
import { formatCurrency } from "../../utils/mathHelpers";

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
    <Paper sx={{ p: 1.5, borderRadius: 2 }}>
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
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        gap: 3,
        alignItems: { xs: "stretch", md: "center" },
      }}
    >
      <Box sx={{ flex: "1 1 280px", minWidth: 260, height: 280 }}>
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
              formatter={(value, name) => {
                const percent = totalValue
                  ? ((value / totalValue) * 100).toFixed(1)
                  : "0.0";
                return [`${formatCurrency(value)} (${percent}%)`, name];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>
      <Box
        sx={{
          flex: "1 1 220px",
          minWidth: { xs: "100%", md: 220 },
          maxHeight: 280,
          overflowY: "auto",
          bgcolor: "#f9fafb",
          borderRadius: 2,
          border: "1px solid #e5e7eb",
          p: 2,
        }}
      >
        {chartData.map((entry, index) => (
          <Box
            key={entry.name}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              mb: index === chartData.length - 1 ? 0 : 1.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: entry.color,
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{ fontWeight: 600, color: "#111827", fontSize: 11 }}
              >
                {entry.name}
              </Typography>
            </Box>
            <Typography
              sx={{
                color: "#4b5563",
                textAlign: "right",
                whiteSpace: "nowrap",
                fontSize: 10.5,
              }}
            >
              {entry.percentage}% | {formatCurrency(entry.value)}
            </Typography>
          </Box>
        ))}
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
  // Allocation
  const allocationData = portfolio.map((s) => ({
    name: s.symbol,
    value: s.shares * s.currentPrice,
    percentage: 0,
  }));
  const totalValue = allocationData.reduce((sum, i) => sum + i.value, 0);
  allocationData.forEach(
    (i) => (i.percentage = ((i.value / totalValue) * 100).toFixed(1))
  );

  // P&L
  const plData = portfolio
    .map((s) => ({
      name: s.symbol,
      pl: (s.currentPrice - s.buyPrice) * s.shares,
      plPercent: (((s.currentPrice - s.buyPrice) / s.buyPrice) * 100).toFixed(
        2
      ),
    }))
    .sort((a, b) => b.pl - a.pl);

  // Return %
  const returnData = portfolio
    .map((s) => ({
      name: s.symbol,
      return: parseFloat(
        (((s.currentPrice - s.buyPrice) / s.buyPrice) * 100).toFixed(2)
      ),
    }))
    .sort((a, b) => b.return - a.return);

  return (
    <Box sx={{ p: 3, mb: 6 }}>
      {/* Side by Side: Pie + P&L */}
      <Grid container spacing={4} justifyContent="center">
        <Grid item xs={{ xs: 12, md: 6 }} sx={{ minWidth: 400 }}>
          <Typography fontSize={16} fontWeight={600} mb={2}>
            Portfolio Allocation
          </Typography>
          <PortfolioPieChart data={allocationData} />
        </Grid>

        <Grid item xs={{ xs: 12, md: 6 }} sx={{ minWidth: 400 }}>
          <Typography ontSize={16} fontWeight={600} mb={2}>
            Profit & Loss by Stock
          </Typography>
          <PLBarChart data={plData} />
        </Grid>
      </Grid>

      {/* Full width: Returns */}
      <Box mt={4}>
        <Typography ontSize={16} fontWeight={600} mb={2}>
          Returns by Stock (%)
        </Typography>
        <ReturnBarChart data={returnData} />
      </Box>
    </Box>
  );
};

export default ChartsSection;
