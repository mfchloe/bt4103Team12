import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Tabs,
  Tab,
} from "@mui/material";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Cell,
  Tooltip as RechartsTooltip,
} from "recharts";

// Color scale generator for heatmap (Blue -> White -> Red)
const getColorFromValue = (value, min, max) => {
  const normalized = (value - min) / (max - min);
  if (normalized < 0.5) {
    const ratio = normalized * 2;
    const r = Math.round(255 * ratio);
    const g = Math.round(255 * ratio);
    const b = 255;
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const ratio = (normalized - 0.5) * 2;
    const r = 255;
    const g = Math.round(255 * (1 - ratio));
    const b = Math.round(255 * (1 - ratio));
    return `rgb(${r}, ${g}, ${b})`;
  }
};

// Custom tooltip
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <Box
        sx={{
          bgcolor: "background.paper",
          p: 1.5,
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          boxShadow: 2,
        }}
      >
        <Typography variant="body2" fontWeight="bold">
          {data.rowLabel} × {data.colLabel}
        </Typography>
        <Typography variant="body2" color="primary">
          Affinity: {(data.value * 100).toFixed(1)}%
        </Typography>
        {data.count && (
          <Typography variant="caption" color="text.secondary">
            Count: {data.count}
          </Typography>
        )}
      </Box>
    );
  }
  return null;
};

const AffinityMatrixHeatmap = ({
  title = "Recommendation Affinity Matrix",
  matrix,
  defaultAttribute = null,
}) => {
  const availableAttributes = matrix ? Object.keys(matrix) : [];
  const [selectedAttr, setSelectedAttr] = useState(
    defaultAttribute || availableAttributes[0] || ""
  );

  const transformMatrixToScatter = (matrixDict) => {
    if (!matrixDict) return { data: [], min: 0, max: 1, rows: [], columns: [] };

    const rows = Object.keys(matrixDict);
    const columnsSet = new Set();
    rows.forEach((row) =>
      Object.keys(matrixDict[row] || {}).forEach((col) => columnsSet.add(col))
    );
    const columns = Array.from(columnsSet);

    const scatterData = [];
    let minValue = Infinity;
    let maxValue = -Infinity;

    rows.forEach((row, rowIdx) => {
      columns.forEach((col, colIdx) => {
        const value = matrixDict[row]?.[col] || 0;
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);

        scatterData.push({
          x: colIdx,
          y: rowIdx,
          value,
          rowLabel: row,
          colLabel: col,
        });
      });
    });

    return { data: scatterData, min: minValue, max: maxValue, rows, columns };
  };

  const currentMatrix = matrix?.[selectedAttr];
  const { data, min, max, rows, columns } =
    transformMatrixToScatter(currentMatrix);
  const cellSize = Math.max(
    30,
    Math.min(60, 500 / Math.max(rows.length, columns.length))
  );

  const formatAttributeName = (attr) =>
    attr
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .trim()
      .replace(/\b\w/g, (l) => l.toUpperCase());

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
        {availableAttributes.length > 1 && (
          <Tabs
            value={selectedAttr}
            onChange={(e, newValue) => setSelectedAttr(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              mb: 2,
              "& .MuiTab-root": { fontSize: 12, minWidth: 80 },
            }}
          >
            {availableAttributes.map((attr) => (
              <Tab key={attr} label={formatAttributeName(attr)} value={attr} />
            ))}
          </Tabs>
        )}

        {data.length > 0 ? (
          <Box sx={{ width: "100%", overflowX: "auto" }}>
            <ResponsiveContainer
              width="100%"
              height={Math.max(400, rows.length * cellSize + 100)}
            >
              <ScatterChart
                margin={{ top: 10, right: 20, bottom: 0, left: 10 }}
              >
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[-0.5, columns.length - 0.5]}
                  ticks={columns.map((_, idx) => idx)}
                  tickFormatter={(val) => columns[val] || ""}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[-0.5, rows.length - 0.5]}
                  ticks={rows.map((_, idx) => idx)}
                  tickFormatter={(val) => rows[val] || ""}
                  width={140}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <ZAxis range={[cellSize * cellSize, cellSize * cellSize]} />
                <RechartsTooltip content={<CustomTooltip />} cursor={false} />

                <Scatter data={data} shape="square">
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getColorFromValue(entry.value, min, max)}
                      stroke="#e0e0e0"
                      strokeWidth={1}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No affinity matrix data available for{" "}
              {formatAttributeName(selectedAttr)}
            </Typography>
          </Box>
        )}

        <Typography variant="caption" color="text.secondary">
          This heatmap shows how different{" "}
          <strong>{formatAttributeName(selectedAttr)}</strong> groups prefer
          various asset categories. Higher percentages indicate stronger
          preference patterns.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default AffinityMatrixHeatmap;
