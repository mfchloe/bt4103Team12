import React, { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { formatCurrency } from "../../utils/mathHelpers";
import { DonutChart } from "../FARDashboard/DonutChart";
import { CHART_COLORS } from "../../constants/colors";

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
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 3,
        }}
      >
        <Box sx={{ flex: "1 1 320px", maxWidth: { md: 360 } }}>
          <DonutChart
            title=""
            data={chartData}
            innerRadius={60}
            outerRadius={110}
            height={300}
            showLegend={false}
          />
        </Box>
        <Box
          sx={{
            flex: "1 1 220px",
            minWidth: { xs: "100%", md: 240 },
            bgcolor: "#f9fafb",
            borderRadius: 2,
            border: "1px solid #e5e7eb",
            p: 2,
            maxHeight: 300,
            overflowY: "auto",
          }}
        >
          {chartData.map((entry, idx) => {
            const percentage = totalValue
              ? ((entry.value / totalValue) * 100).toFixed(1)
              : "0.0";
            const color = CHART_COLORS[idx % CHART_COLORS.length];
            const isLast = idx === chartData.length - 1;

            return (
              <Box
                key={entry.label}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  mb: isLast ? 0 : 1.5,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor: color,
                      flexShrink: 0,
                    }}
                  />
                  <Typography sx={{ fontWeight: 600, color: "#111827" }}>
                    {entry.label}
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    color: "#4b5563",
                    textAlign: "right",
                    whiteSpace: "nowrap",
                  }}
                >
                  {percentage}% | {formatCurrency(entry.value)}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

export default PortfolioChart;
