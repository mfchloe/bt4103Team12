import { Card, CardContent, CardHeader, Typography, Box } from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface DonutChartProps {
  title: string;
  data: Array<{ label: string; value: number }>;
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
  height?: number; // <- new
  onSelect?: (label: string) => void;
}

export const DonutChart = ({
  title,
  data,
  colors = ["#1976d2", "#42a5f5", "#90caf9", "#0d47a1", "#ff9800", "#f44336"],
  innerRadius = 60,
  outerRadius = 90,
  height = 280, // default
  onSelect,
}: DonutChartProps) => {
  const chartData = (data || []).map((d, idx) => ({
    name: d.label,
    value: d.value,
    fill: colors[idx % colors.length],
  }));

  return (
    <Card sx={{ transition: "all 0.3s", "&:hover": { boxShadow: 3 } }}>
      <CardHeader
        title={
          <Typography variant="h6" fontWeight={600}>
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
                style={{
                  cursor: onSelect ? "pointer" : "default",
                  outline: "none",
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};
