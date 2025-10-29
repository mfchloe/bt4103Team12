import { Card, CardContent, CardHeader, Typography, Box } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
// import { CHART_COLORS } from "../../constants/colors";
interface Row {
  label: string;
  value: number;
  cluster: number;
}

interface StackedBarChartCardProps {
  title: string;
  rows: Row[];
  clusterColors?: Record<number, string>;
  height?: number;
  onSelect?: (label: string) => void; // optional click
  selected?: string[]; // optional selected labels
}

export const StackedBarChartCard = ({
  title,
  rows,
  clusterColors = { 1: "#1976d2", 2: "#dc004e", 3: "#ffa000" },
  height = 280,
  onSelect,
  selected = [],
}: StackedBarChartCardProps) => {
  // Group by label
  const grouped: Record<string, Record<number, number>> = {};
  rows.forEach((r) => {
    if (!grouped[r.label]) grouped[r.label] = {};
    grouped[r.label][r.cluster] = r.value;
  });

  // Transform into chart-friendly array
  const chartData = Object.entries(grouped).map(([label, clusters]) => ({
    label,
    ...clusters,
  }));

  // Unique clusters
  const clusterKeys = Array.from(new Set(rows.map((r) => r.cluster))).sort();

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
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="label"
                angle={-35}
                textAnchor="end"
                interval={0}
                height={60}
                tick={{ fontSize: 11 }}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend
                verticalAlign="middle"
                align="right"
                layout="vertical"
                wrapperStyle={{ fontSize: 10 }}
              />

              {clusterKeys.map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="a"
                  fill={clusterColors[key]}
                  name={`Cluster ${key}`}
                  onClick={(d) => onSelect?.(d?.label ?? "")}
                >
                  {chartData.map((entry) => {
                    const isSelected = selected.includes(entry.label);
                    return (
                      <Cell
                        key={entry.label + key}
                        opacity={selected.length > 0 && !isSelected ? 0.4 : 1}
                        cursor={onSelect ? "pointer" : "default"}
                      />
                    );
                  })}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};
