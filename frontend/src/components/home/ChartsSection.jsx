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
const PortfolioPieChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={(entry) => `${entry.name} (${entry.percentage}%)`}
        outerRadius={90}
        innerRadius={50}
        dataKey="value"
        fontSize={10}
      >
        {data.map((entry, index) => (
          <Cell key={index} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
    </PieChart>
  </ResponsiveContainer>
);

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
          <Cell key={index} fill={entry.return >= 0 ? "#16A085" : "#E74C3C"} />
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
