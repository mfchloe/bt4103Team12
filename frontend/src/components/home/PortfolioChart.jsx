import React, { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { formatCurrency } from "../../utils/mathHelpers";
import { DonutChart } from "../FARDashboard/DonutChart";
const PortfolioChart = ({ portfolio }) => {
  // Transform portfolio into { label, value } for DonutChart
  const chartData = useMemo(() => {
    if (!portfolio) return [];

    return portfolio
      .filter((stock) => stock.currentPrice != null && Number(stock.shares) > 0)
      .map((stock) => ({
        label: stock.symbol,
        value: Number(stock.shares) * Number(stock.currentPrice || 0),
      }))
      .filter((item) => Number.isFinite(item.value) && item.value > 0);
  }, [portfolio]);

  if (!chartData.length) {
    return (
      <Typography sx={{ color: "#6b7280", textAlign: "center", py: 4 }}>
        Add stocks with a known current price to display allocation.
      </Typography>
    );
  }

  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Box>
      <Typography
        variant="h6"
        sx={{ fontWeight: 600, mb: 2, color: "#305D9E" }}
      >
        Portfolio Allocation
      </Typography>
      <DonutChart
        title=""
        data={chartData}
        innerRadius={60}
        outerRadius={110}
        height={300}
      />
      <Box sx={{ mt: 2 }}>
        {chartData.map((entry, idx) => {
          const percentage = totalValue
            ? ((entry.value / totalValue) * 100).toFixed(1)
            : "0.0";
          return (
            <Box
              key={entry.label}
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography sx={{ fontWeight: 600 }}>{entry.label}</Typography>
              <Typography>
                {formatCurrency(entry.value)} ({percentage}%)
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default PortfolioChart;
