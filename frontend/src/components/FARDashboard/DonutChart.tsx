import { Card, CardContent, CardHeader, Typography, Box } from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

import { CHART_COLORS } from "../../constants/colors";

interface DonutChartProps {
  title: string;
  data: Array<{ label: string; value: number }>;
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
  height?: number;
  onSelect?: (label: string) => void;
  selected?: string[];
  showLegend?: boolean;
}

export const DonutChart = ({
  title,
  data,
  colors = CHART_COLORS,
  innerRadius = 60,
  outerRadius = 90,
  height = 280,
  onSelect,
  selected = [],
  showLegend = true,
}: DonutChartProps) => {
  const total = (data || []).reduce((acc, d) => acc + d.value, 0);
  const chartData = (data || []).map((d, idx) => ({
    name: d.label,
    value: d.value,
    fill: colors[idx % colors.length],
  }));

  // --- Custom tooltip with percentage ---
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0];
      const percent = ((value / total) * 100).toFixed(1);
      return (
        <Box
          sx={{
            backgroundColor: "white",
            p: 1,
            border: "1px solid #ccc",
            borderRadius: 1,
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            {name}
          </Typography>
          <Typography variant="body2">Value: {value}</Typography>
          <Typography variant="body2">Percent: {percent}%</Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Card sx={{ transition: "all 0.3s", "&:hover": { boxShadow: 3 } }}>
      <CardHeader
        title={
          <Typography fontSize={16} fontWeight={600}>
            {title}
          </Typography>
        }
      />
      <CardContent>
        <Box sx={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={2}
                onClick={(d) => onSelect?.(d?.name)}
                style={{ cursor: onSelect ? "pointer" : "default" }}
              >
                {chartData.map((entry, index) => {
                  const isSelected = selected.includes(entry.name);
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.fill}
                      stroke={isSelected ? "#000" : "none"}
                      strokeWidth={isSelected ? 3 : 0}
                      opacity={selected.length > 0 && !isSelected ? 0.4 : 1}
                    />
                  );
                })}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              {showLegend && (
                <Legend
                  verticalAlign="bottom"
                  layout="vertical"
                  align="center"
                  iconType="circle"
                  wrapperStyle={{
                    fontSize: 12,
                    lineHeight: "16px",
                    marginTop: 12,
                    maxHeight: 80,
                    overflowY: "auto",
                    textOverflow: "ellipsis",
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                  }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};
