import { Card, CardContent, CardHeader, Typography, Box } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface HistogramCardProps {
  title: string;
  bins?: Array<{ bin_start: number; bin_end: number; count: number }>;
}

export const HistogramCard = ({ title, bins }: HistogramCardProps) => {
  const data = (bins || []).map((b) => ({
    name: `${Math.round(b.bin_start)}-${Math.round(b.bin_end)}`,
    count: b.count,
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
          <Typography fontSize={16} fontWeight={600}>
            {title}
          </Typography>
        }
      />
      <CardContent>
        <Box sx={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#1976d2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};
