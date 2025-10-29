import { Card, CardContent, CardHeader, Typography, Box } from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ActivityLineChartProps {
  title: string;
  rows?: Array<{
    period: string | number;
    buy_volume: number;
    unique_buyers: number;
  }>;
}

export const ActivityLineChart = ({ title, rows }: ActivityLineChartProps) => {
  if (!rows || !rows.length) {
    return (
      <Card
        sx={{
          transition: "all 0.3s",
          "&:hover": { boxShadow: 3 },
        }}
      >
        <CardHeader
          title={
            <Typography variant="h6" fontWeight={600}>
              {title}
            </Typography>
          }
        />
        <CardContent>
          <Typography>No activity data</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        transition: "all 0.3s",
        "&:hover": { boxShadow: 3 },
      }}
    >
      <CardHeader
        title={
          <Typography fontSize={16} fontWeight={600}>
            {title}
          </Typography>
        }
      />
      <CardContent>
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="buy_volume"
                name="Buy Volume"
                stroke="#8884d8"
              />
              <Line
                type="monotone"
                dataKey="unique_buyers"
                name="Unique Buyers"
                stroke="#82ca9d"
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ActivityLineChart;
