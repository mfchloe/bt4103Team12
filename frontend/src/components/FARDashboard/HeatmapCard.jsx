import {
  Card,
  CardContent,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  ReferenceArea,
  Cell,
} from "recharts";
import { CHART_COLORS } from "../../constants/colors";

const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined || isNaN(num)) return "-";
  return Number(num.toFixed(decimals)).toLocaleString();
};

const HeatmapCard = ({
  title,
  data = [],
  xAxis = "avg_risk_score",
  yAxis = "avg_return_pct",
  tooltip: tooltipText,
  dropdown, // optional { value, onChange, options, label }
}) => {
  const chartData = data
    .map((item) => ({
      category:
        item.label ||
        item.category ||
        item.preferred_asset_category ||
        "Unknown",
      risk: parseFloat(item[xAxis] || item.avg_risk_score || 0),
      return: parseFloat(item[yAxis] || item.avg_return_pct || 0),
      count: parseInt(item.count || item.value || 100),
    }))
    .filter((item) => !isNaN(item.risk) && !isNaN(item.return));

  if (chartData.length === 0) {
    return (
      <Card sx={{ height: "100%" }}>
        <CardContent
          sx={{
            height: 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography color="text.secondary">No data available</Typography>
        </CardContent>
      </Card>
    );
  }

  const riskValues = chartData.map((d) => d.risk);
  const returnValues = chartData.map((d) => d.return);
  const countValues = chartData.map((d) => d.count);

  const riskDomain = [
    Math.max(0, Math.min(...riskValues) - 0.3),
    Math.max(...riskValues) + 0.3,
  ];
  const returnDomain = [
    Math.min(...returnValues) - 1,
    Math.max(...returnValues) + 1,
  ];
  const countDomain = [Math.min(...countValues), Math.max(...countValues)];

  const midRisk = (riskDomain[0] + riskDomain[1]) / 2;
  const midReturn = (returnDomain[0] + returnDomain[1]) / 2;

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Box sx={{ mb: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography fontSize={15} fontWeight={600} gutterBottom>
            {title}
          </Typography>
          {tooltipText && (
            <Typography fontSize={11} color="text.secondary">
              {tooltipText}
            </Typography>
          )}

          {/* Smaller dropdown */}
          {dropdown && (
            <FormControl
              sx={{
                maxWidth: 200,
                "& .MuiInputBase-root": {
                  height: 32,
                  fontSize: 12,
                  padding: "0 8px",
                },
              }}
            >
              <InputLabel sx={{ fontSize: 12 }}>
                {dropdown.label || "Select"}
              </InputLabel>
              <Select
                value={dropdown.value}
                label={dropdown.label || "Select"}
                onChange={(e) => dropdown.onChange(e.target.value)}
                size="small"
                sx={{ fontSize: 12 }}
              >
                {dropdown.options.map((opt) => (
                  <MenuItem
                    key={opt.value}
                    value={opt.value}
                    sx={{ fontSize: 12 }}
                  >
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

            {/* Quadrants */}
            <ReferenceArea
              x1={riskDomain[0]}
              x2={midRisk}
              y1={midReturn}
              y2={returnDomain[1]}
              fill="#10b981"
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={midRisk}
              x2={riskDomain[1]}
              y1={returnDomain[0]}
              y2={midReturn}
              fill="#ef4444"
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={midRisk}
              x2={riskDomain[1]}
              y1={midReturn}
              y2={returnDomain[1]}
              fill="#f59e0b"
              fillOpacity={0.08}
            />
            <ReferenceArea
              x1={riskDomain[0]}
              x2={midRisk}
              y1={returnDomain[0]}
              y2={midReturn}
              fill="#3b82f6"
              fillOpacity={0.08}
            />

            <XAxis
              type="number"
              dataKey="risk"
              name="Risk Score"
              domain={riskDomain}
              label={{
                value: "Average Risk Score",
                position: "bottom",
                offset: 40,
                style: { fontSize: 13, fill: "#6b7280" },
              }}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickFormatter={(value) => formatNumber(value, 2)}
            />
            <YAxis
              type="number"
              dataKey="return"
              name="Return %"
              domain={returnDomain}
              label={{
                value: "Average Return (%)",
                angle: -90,
                position: "left",
                offset: 40,
                style: { fontSize: 13, fill: "#6b7280" },
              }}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickFormatter={(value) => formatNumber(value, 2)}
            />
            <ZAxis
              type="number"
              dataKey="count"
              range={[100, 1000]}
              domain={countDomain}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload?.length) {
                  const d = payload[0].payload;
                  return (
                    <Box
                      sx={{
                        p: 1,
                        background: "white",
                        borderRadius: 1,
                        boxShadow: 2,
                      }}
                    >
                      <Typography fontWeight={600} fontSize={12}>
                        {d.category}
                      </Typography>
                      <Typography fontSize={11}>
                        Risk: {formatNumber(d.risk)}
                      </Typography>
                      <Typography fontSize={11}>
                        Return: {formatNumber(d.return)}%
                      </Typography>
                      <Typography fontSize={11}>
                        Count: {formatNumber(d.count, 0)}
                      </Typography>
                    </Box>
                  );
                }
                return null;
              }}
            />

            <Scatter name="Asset Categories" data={chartData}>
              {chartData.map((entry, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  fillOpacity={0.9}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        <Box
          sx={{
            mt: 2,
            display: "flex",
            gap: 3,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <LegendItem color="#10b981" text="Low Risk, High Return (Ideal)" />
          <LegendItem color="#ef4444" text="High Risk, Low Return (Avoid)" />
          <LegendItem color="#f59e0b" text="High Risk, High Return" />
          <LegendItem color="#3b82f6" text="Low Risk, Low Return" />
        </Box>
      </CardContent>
    </Card>
  );
};

const LegendItem = ({ color, text }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
    <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: color }} />
    <Typography variant="caption" color="text.secondary">
      {text}
    </Typography>
  </Box>
);

export default HeatmapCard;
