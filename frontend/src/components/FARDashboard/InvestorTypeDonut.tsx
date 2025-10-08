import { Card, CardContent, CardHeader, Typography, Box } from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = ["#1976d2", "#42a5f5", "#90caf9", "#0d47a1"];

interface InvestorTypeDonutProps {
  data: Array<{ label: string; value: number }>;
  onSelect?: (name: string) => void;
}

export const InvestorTypeDonut = ({
  data,
  onSelect,
}: InvestorTypeDonutProps) => {
  const chartData = (data || []).map((d, idx) => ({
    name: d.label,
    value: d.value,
    fill: COLORS[idx % COLORS.length],
  }));

  return (
    <Card
      sx={{
        height: "100%",
        transition: "all 0.3s",
        "&:hover": {
          boxShadow: 3,
        },
      }}
    >
      <CardHeader
        title={
          <Typography variant="h6" fontWeight={600}>
            Investor Type Breakdown
          </Typography>
        }
      />
      <CardContent>
        <Box sx={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                onClick={(d) => onSelect?.(d?.name)}
                style={{ cursor: "pointer", outline: "none" }}
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
