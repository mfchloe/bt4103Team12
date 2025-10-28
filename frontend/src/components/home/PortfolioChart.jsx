import { Box, Typography } from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { formatCurrency } from "../../utils/mathHelpers";

import { CHART_COLORS } from "../../constants/colors";

const CHART_CONFIG = {
  height: 300,
  outerRadius: 110,
  cx: "50%",
  cy: "50%",
};

const transformPortfolioToChartData = (portfolio) => {
  return portfolio
    .filter(
      (stock) =>
        stock.currentPrice !== null &&
        stock.currentPrice !== undefined &&
        Number(stock.shares) > 0
    )
    .map((stock) => ({
      name: stock.symbol,
      value: Number(stock.shares) * Number(stock.currentPrice || 0),
    }))
    .filter((item) => Number.isFinite(item.value) && item.value > 0);
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <Box sx={styles.toolTipContainer}>
      <Typography sx={{ fontSize: "14px", fontWeight: 600 }}>
        {payload[0].name}
      </Typography>
      <Typography sx={{ fontSize: "14px", color: "#6b7280" }}>
        {formatCurrency(payload[0].value)}
      </Typography>
    </Box>
  );
};

const PortfolioChart = ({ portfolio }) => {
  if (!portfolio || portfolio.length === 0) {
    return null;
  }

  const chartData = transformPortfolioToChartData(portfolio);
  if (chartData.length === 0) {
    return (
      <Typography sx={{ color: "#6b7280", textAlign: "center", py: 4 }}>
        Add stocks with a known current price to display allocation.
      </Typography>
    );
  }

  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Box sx={styles.container}>
      <Typography variant="h6" sx={styles.title}>
        Portfolio Allocation
      </Typography>
      <Box sx={styles.chartRow}>
        <Box sx={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height={CHART_CONFIG.height}>
            <PieChart>
              <Pie
                data={chartData}
                cx={CHART_CONFIG.cx}
                cy={CHART_CONFIG.cy}
                labelLine={false}
                label={(entry) => entry.name}
                outerRadius={CHART_CONFIG.outerRadius}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </Box>

        <Box sx={styles.legendColumn}>
          {chartData.map((entry, index) => {
            const color = CHART_COLORS[index % CHART_COLORS.length];
            const percentage = totalValue
              ? ((entry.value / totalValue) * 100).toFixed(1)
              : "0.0";
            const amount = formatCurrency(entry.value);
            return (
              <Box key={`legend-${entry.name}`} sx={styles.legendItem}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    bgcolor: color,
                    mr: 1.5,
                    flexShrink: 0,
                  }}
                />
                <Typography sx={styles.legendName}>{entry.name}</Typography>
                <Box sx={styles.legendNumbers}>
                  <Typography sx={styles.legendAmount}>{amount}</Typography>
                  <Typography sx={styles.legendPercent}>{percentage}%</Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

export default PortfolioChart;

const styles = {
  container: {},
  title: {
    fontWeight: "semibold",
    mb: 2,
    color: "#305D9E",
  },
  chartRow: {
    display: "flex",
    flexDirection: { xs: "column", md: "row" },
    gap: 3,
    alignItems: { xs: "stretch", md: "center" },
  },
  chartWrapper: {
    flex: 1,
    minWidth: 0,
    height: CHART_CONFIG.height,
  },
  legendColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 1.5,
    minWidth: { xs: "100%", md: 240 },
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 1.5,
    bgcolor: "#f9fafb",
    borderRadius: 2,
    px: 1.5,
    py: 1,
  },
  legendName: {
    flex: 1,
    fontWeight: 600,
    color: "#111827",
  },
  legendNumbers: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 1.5,
    minWidth: 140,
    justifyContent: "flex-end",
  },
  legendAmount: {
    fontWeight: 600,
    color: "#1f2937",
    fontSize: 14,
  },
  legendPercent: {
    fontWeight: 600,
    color: "#1f2937",
    fontSize: 14,
  },
  toolTipContainer: {
    bgcolor: "white",
    p: 1.5,
    border: "1px solid #e5e7eb",
    borderRadius: 1,
  },
};
