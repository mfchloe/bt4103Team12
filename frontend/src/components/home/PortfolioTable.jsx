import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Box,
  TableCell,
  TableRow,
  IconButton,
  Typography,
  Tooltip,
} from "@mui/material";
import {
  calculateStockStats,
  formatCurrency,
  formatPercentage,
  formatDate,
} from "../../utils/mathHelpers";
import CustomTable from "../CustomTable";

const POSITIVE_COLOR = "#16a34a";
const NEGATIVE_COLOR = "#dc2626";

const TABLE_HEADERS = [
  { label: "Symbol", align: "left" },
  { label: "Shares", align: "right" },
  { label: "Last Seen Price", align: "right" },
  { label: "Last Seen Date", align: "right" },
  { label: "Current Price", align: "right" },
  { label: "Total Value", align: "right" },
  { label: "P&L", align: "right" },
  { label: "Return %", align: "right" },
  { label: "Action", align: "right" },
];

// ---------------- EmptyPortfolio ----------------
const EmptyPortfolio = ({ onAddStock }) => (
  <Box sx={styles.emptyPortfolioContainer}>
    <Typography sx={{ color: "#9ca3af", fontSize: "14px", mb: 1 }}>
      Your portfolio is empty
    </Typography>
    <Typography onClick={onAddStock} sx={styles.addFirstStockButton}>
      Add your first stock
    </Typography>
  </Box>
);

// ---------------- StockRow ----------------
const StockRow = ({ stock, onRemove }) => {
  const { totalValue, pl, returnPercent, isPositive } =
    calculateStockStats(stock);
  const plColor = isPositive ? POSITIVE_COLOR : NEGATIVE_COLOR;
  const canRemove = !stock.isSynthetic;
  const lastSeenPrice = stock.lastSeenPrice ?? stock.buyPrice;
  const lastSeenDate = stock.lastSeenDate ?? stock.buyDate;

  return (
    <TableRow
      sx={{
        ...styles.tableRow,
        bgcolor: stock.isNew ? "#e6f4ea" : "inherit", // light green background if new
      }}
    >
      <TableCell sx={styles.symbolCell}>
        {stock.isNew && (
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#16a34a",
              marginRight: 6,
            }}
          />
        )}
        <Tooltip title={stock.name || stock.symbol} arrow disableInteractive>
          <span>{stock.symbol}</span>
        </Tooltip>
      </TableCell>
      <TableCell align="right">{stock.shares}</TableCell>
      <TableCell align="right">{formatCurrency(lastSeenPrice)}</TableCell>
      <TableCell align="right">{formatDate(lastSeenDate)}</TableCell>
      <TableCell align="right">{formatCurrency(stock.currentPrice)}</TableCell>
      <TableCell align="right">{formatCurrency(totalValue)}</TableCell>
      <TableCell align="right" sx={{ ...styles.plCell, color: plColor }}>
        {isPositive ? "+" : ""}
        {formatCurrency(pl)}
      </TableCell>
      <TableCell align="right" sx={{ ...styles.plCell, color: plColor }}>
        {formatPercentage(returnPercent, isPositive)}
      </TableCell>
      <TableCell align="right">
        {canRemove ? (
          <IconButton
            onClick={() => onRemove(stock.id)}
            sx={styles.deleteButton}
          >
            <Trash2 size={18} />
          </IconButton>
        ) : (
          <Typography sx={styles.syntheticBadge}>Auto</Typography>
        )}
      </TableCell>
    </TableRow>
  );
};

// ---------------- PortfolioTable using CustomTable ----------------
const PortfolioTable = ({ portfolio, onRemove, onAddStock }) => {
  const filteredPortfolio = portfolio.filter(
    (stock) => Number(stock.shares) > 0
  );

  if (filteredPortfolio.length === 0) {
    return <EmptyPortfolio onAddStock={onAddStock} />;
  }

  return (
    <CustomTable
      headers={TABLE_HEADERS}
      data={filteredPortfolio}
      renderRow={(stock) => (
        <StockRow key={stock.id} stock={stock} onRemove={onRemove} />
      )}
      sx={styles.tableContainer}
    />
  );
};

export default PortfolioTable;

// ---------------- Styles ----------------
const styles = {
  emptyPortfolioContainer: {
    bgcolor: "white",
    borderRadius: 3,
    p: 6,
    boxShadow: 1,
    textAlign: "center",
  },
  addFirstStockButton: {
    color: "#1a1a1a",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-block",
    "&:hover": {
      color: "#305D9E",
      textDecoration: "underline",
    },
  },

  symbolCell: {
    fontWeight: "medium",
  },
  plCell: {
    fontWeight: "medium",
  },
  deleteButton: {
    color: NEGATIVE_COLOR,
    "&:hover": { bgcolor: "#fee2e2" },
  },
  syntheticBadge: {
    color: "#6b7280",
    fontSize: "12px",
    fontWeight: 600,
  },
};
