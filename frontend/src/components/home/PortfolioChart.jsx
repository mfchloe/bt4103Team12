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
  outerRadius: 100,
  cx: "50%",
  cy: "50%",
};

const transformPortfolioToChartData = (portfolio) => {
  return portfolio.map((stock) => ({
    name: stock.symbol,
    value: stock.shares * stock.currentPrice,
  }));
};

const calculatePercentage = (value, total) => {
  return ((value / total) * 100).toFixed(1);
};

const renderCustomLabel = (entry, chartData) => {
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const percentage = calculatePercentage(entry.value, total);
  return `${entry.name}: ${percentage}%`;
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

  return (
    <Box sx={styles.container}>
      <Typography variant="h6" sx={styles.title}>
        Portfolio Allocation
      </Typography>
      <ResponsiveContainer width="100%" height={CHART_CONFIG.height}>
        <PieChart>
          <Pie
            data={chartData}
            cx={CHART_CONFIG.cx}
            cy={CHART_CONFIG.cy}
            labelLine={false}
            label={(entry) => renderCustomLabel(entry, chartData)}
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
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default PortfolioChart;

const styles = {
  container: {
    // add any container styles here if needed
  },
  title: {
    fontWeight: "semibold",
    mb: 2,
    color: "#305D9E",
  },
  toolTipContainer: {
    bgcolor: "white",
    p: 1.5,
    border: "1px solid #e5e7eb",
    borderRadius: 1,
  },
};
