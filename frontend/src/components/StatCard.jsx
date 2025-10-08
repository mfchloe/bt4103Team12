import React from "react";
import { Card, CardContent, Box, Typography, Chip } from "@mui/material";
import { formatPercentage } from "../utils/mathHelpers";

const StatCard = ({ title, value, icon: Icon, trend, decimals = 2 }) => {
  // format number if it's numeric
  const formattedValue =
    typeof value === "number"
      ? Number.isInteger(value)
        ? value.toLocaleString() // no decimals for whole numbers
        : value.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: decimals, // round only if decimal
          })
      : value;

  return (
    <Card elevation={0} sx={styles.statCard}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={styles.iconContainer}>
          <Box sx={styles.iconWrapper}>
            <Icon size={20} color="#305D9E" />
          </Box>
        </Box>

        <Typography sx={styles.statTitle}>{title}</Typography>

        <Box sx={styles.valueRow}>
          <Typography sx={styles.statValue}>{formattedValue}</Typography>
          {trend !== undefined && (
            <Chip
              label={formatPercentage(trend, trend >= 0)}
              size="small"
              sx={styles.trendChip(trend)}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;

const styles = {
  statCard: {
    borderRadius: "16px",
    background: "linear-gradient(180deg, #fff, #f9fafb)",
    border: "1px solid #e5e7eb",
    transition: "all 0.3s ease",
    "&:hover": {
      boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
      transform: "translateY(-2px)",
    },
  },
  iconContainer: {
    display: "flex",
    justifyContent: "flex-end",
    mb: 1,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    backgroundColor: "#e0e7ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statTitle: {
    color: "#6b7280",
    fontWeight: 500,
    fontSize: "0.9rem",
    mb: 1,
  },
  valueRow: {
    display: "flex",
    alignItems: "center",
    gap: 1,
  },
  statValue: {
    fontWeight: "bold",
    fontSize: "1.5rem",
    color: "#111827",
  },
  trendChip: (trend) => ({
    fontSize: "0.75rem",
    fontWeight: "bold",
    backgroundColor: trend > 0 ? "#dcfce7" : "#fee2e2",
    color: trend > 0 ? "#10b981" : "#ef4444",
  }),
};
