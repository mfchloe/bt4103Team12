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

import { CHART_COLORS } from "../../constants/colors";

export const ScatterChartCard = ({ title, data = [], height = 300 }) => {
  // Get unique clusters from data
  const clusters = [
    ...new Set(data.map((d) => d.cluster).filter((c) => c !== undefined)),
  ];

  // Map each cluster to a color
  const clusterColorMap = clusters.reduce((acc, cluster, i) => {
    acc[cluster] = CHART_COLORS[i % CHART_COLORS.length];
    return acc;
  }, {});

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
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="portfolio_value"
                type="number"
                name="Diversification Score"
                tickFormatter={(val) => val.toFixed(2)}
              />
              <YAxis
                dataKey="avg_transactions_per_month"
                type="number"
                name="Concentration"
              />
              {clusters.length > 0 ? (
                clusters.map((cluster) => (
                  <Scatter
                    key={cluster}
                    name={`Cluster ${cluster}`}
                    data={data.filter((d) => d.cluster === cluster)}
                    fill={clusterColorMap[cluster]}
                  />
                ))
              ) : (
                // Fallback if no cluster field
                <Scatter name="Customer" data={data} fill="#8884d8" />
              )}
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                formatter={(value, name) => value}
                labelFormatter={(label) =>
                  `Diversification: ${label?.toFixed(2)}`
                }
              />
            </ScatterChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};
