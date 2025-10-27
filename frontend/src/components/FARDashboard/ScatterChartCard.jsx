import { Card, CardContent, CardHeader, Typography, Box } from "@mui/material";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const ScatterChartCard = ({ title, data = [], height = 300 }) => {
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
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="portfolio_value"
                type="number"
                name="Investment (€)"
                tickFormatter={(val) => `€${val.toLocaleString()}`}
              />
              <YAxis
                dataKey="avg_transactions_per_month"
                type="number"
                name="Avg Transactions"
              />
              <Scatter name="Customer" data={data} fill="#8884d8" />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                formatter={(value, name) => {
                  if (name === "Investment (€)")
                    return `€${value.toLocaleString()}`;
                  return value;
                }}
                labelFormatter={(label) =>
                  `Investment: €${label?.toLocaleString()}`
                }
              />
            </ScatterChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};
