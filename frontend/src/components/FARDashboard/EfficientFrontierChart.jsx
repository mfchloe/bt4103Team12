import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Divider,
  Stack,
} from "@mui/material";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const LOW_COLOR = [239, 68, 68]; // Tailwind red-500
const HIGH_COLOR = [29, 78, 216]; // Tailwind blue-600

const interpolateColor = (value, min, max) => {
  if (!Number.isFinite(value)) {
    return "rgba(156, 163, 175, 0.7)"; // gray fallback
  }
  if (max === min) {
    const midR = Math.round((LOW_COLOR[0] + HIGH_COLOR[0]) / 2);
    const midG = Math.round((LOW_COLOR[1] + HIGH_COLOR[1]) / 2);
    const midB = Math.round((LOW_COLOR[2] + HIGH_COLOR[2]) / 2);
    return `rgb(${midR}, ${midG}, ${midB})`;
  }
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const r = Math.round(LOW_COLOR[0] + t * (HIGH_COLOR[0] - LOW_COLOR[0]));
  const g = Math.round(LOW_COLOR[1] + t * (HIGH_COLOR[1] - LOW_COLOR[1]));
  const b = Math.round(LOW_COLOR[2] + t * (HIGH_COLOR[2] - LOW_COLOR[2]));
  return `rgb(${r}, ${g}, ${b})`;
};

const percentFormatter = (value) =>
  Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : "--";
export const EfficientFrontierChart = ({
  title = "Efficient Frontier",
  data = [],
  height = 360,
}) => {
  const points = Array.isArray(data) ? data : [];
  const sharpeValues = points
    .map((point) => point?.sharpe)
    .filter((value) => Number.isFinite(value));

  const minSharpe = sharpeValues.length
    ? Math.min(...sharpeValues)
    : 0;
  const maxSharpe = sharpeValues.length
    ? Math.max(...sharpeValues)
    : 0;

  const legendStops = [
    { label: minSharpe, position: "Top" },
    { label: (minSharpe + maxSharpe) / 2, position: "Mid" },
    { label: maxSharpe, position: "Bottom" },
  ];

  const formatSharpe = (value) =>
    Number.isFinite(value) ? value.toFixed(2) : "0.00";

  const legendGradient = `linear-gradient(180deg, ${interpolateColor(
    maxSharpe,
    minSharpe,
    maxSharpe
  )} 0%, ${interpolateColor((minSharpe + maxSharpe) / 2, minSharpe, maxSharpe)} 50%, ${interpolateColor(
    minSharpe,
    minSharpe,
    maxSharpe
  )} 100%)`;

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload[0] || !payload[0].payload) return null;
    const p = payload[0].payload;
    const company = p.name || p.symbol || p.isin;
    const ret = percentFormatter(p.return_daily);
    const vol = percentFormatter(p.volatility);
    const sharpeVal = Number.isFinite(p.return_daily) && Number.isFinite(p.volatility) && p.volatility
      ? (p.return_daily / p.volatility).toFixed(2)
      : "0.00";

    return (
      <div style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "10px 12px",
        boxShadow: "0px 8px 16px rgba(15, 23, 42, 0.12)",
        color: "#0f172a",
        maxWidth: 260,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Company: {company}</div>
        <div style={{ marginBottom: 2 }}>Return: {ret}</div>
        <div style={{ marginBottom: 2 }}>Volatility: {vol}</div>
        <div>Sharpe: {sharpeVal}</div>
      </div>
    );
  };  return (
    <Card sx={{ transition: "all 0.3s", "&:hover": { boxShadow: 3 } }}>
      <CardHeader
        title={
          <Typography fontSize={16} fontWeight={600}>
            {title}
          </Typography>
        }
      />
      <CardContent>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 3,
          }}
        >
          <Box sx={{ flex: 1, minHeight: height }}>
            {points.length === 0 ? (
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "text.secondary",
                }}
              >
                <Typography variant="body2">
                  No assets match the current filters.
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="volatility"
                    type="number"
                    name="Volatility"
                    tickFormatter={percentFormatter}
                    label={{
                      value: "Daily Volatility",
                      position: "bottom",
                      offset: 0,
                      style: { fill: "#475569" },
                    }}
                    tick={{ fill: "#475569", fontSize: 12 }}
                  />
                  <YAxis
                    dataKey="return_daily"
                    type="number"
                    name="Return"
                    tickFormatter={percentFormatter}
                    label={{
                      value: "Daily Return",
                      angle: -90,
                      position: "left",
                      offset: 10,
                      style: { fill: "#475569" },
                    }}
                    tick={{ fill: "#475569", fontSize: 12 }}
                  />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<CustomTooltip />} />
                  <Scatter
                    name="Assets"
                    data={points.map((point) => ({
                      ...point,
                      name: point?.name || point?.symbol || point?.isin,
                    }))}
                  >
                    {points.map((point, index) => (
                      <Cell
                        key={`cell-${point?.isin}-${index}`}
                        fill={interpolateColor(point?.sharpe, minSharpe, maxSharpe)}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </Box>

          <Box
            sx={{
              width: { xs: "100%", md: 90 },
              display: "flex",
              flexDirection: "column",
              gap: 1.2,
              alignSelf: { xs: "stretch", md: "flex-start" },
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
              Sharpe Ratio Scale
            </Typography>
            <Box
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "stretch",
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  minHeight: 120,
                  borderRadius: 2,
                  background: legendGradient,
                }}
              />
              <Stack
                spacing={1}
                justifyContent="space-between"
                sx={{ minHeight: 120 }}
              >
                {legendStops.map((stop) => (
                  <Typography
                    key={stop.position}
                    variant="caption"
                    color="text.secondary"
                  >
                    {formatSharpe(stop.label)}
                  </Typography>
                ))}
              </Stack>
            </Box>
            <Divider sx={{ my: 0.5 }} />
            <Typography variant="caption" color="text.secondary">
              Blue = higher Sharpe (better risk-adjusted returns). Red = lower Sharpe.
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default EfficientFrontierChart;

















