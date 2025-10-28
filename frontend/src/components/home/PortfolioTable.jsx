import { Trash2 } from "lucide-react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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

const TableHeader = () => (
  <TableHead>
    <TableRow>
      {TABLE_HEADERS.map((header) => (
        <TableCell
          key={header.label}
          align={header.align}
          sx={styles.tableHeaderCell}
        >
          {header.label}
        </TableCell>
      ))}
    </TableRow>
  </TableHead>
);

const StockRow = ({ stock, onRemove }) => {
  const { totalValue, pl, returnPercent, isPositive } =
    calculateStockStats(stock);
  const plColor = isPositive ? POSITIVE_COLOR : NEGATIVE_COLOR;
  const canRemove = !stock.isSynthetic;
  const lastSeenPrice =
    stock.lastSeenPrice !== undefined && stock.lastSeenPrice !== null
      ? stock.lastSeenPrice
      : stock.buyPrice;
  const lastSeenDate = stock.lastSeenDate || stock.buyDate;

  return (
    <TableRow sx={styles.tableRow}>
      <TableCell sx={styles.symbolCell}>
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
          <IconButton onClick={() => onRemove(stock.id)} sx={styles.deleteButton}>
            <Trash2 size={18} />
          </IconButton>
        ) : (
          <Typography sx={styles.syntheticBadge}>Auto</Typography>
        )}
      </TableCell>
    </TableRow>
  );
};

const PortfolioTable = ({ portfolio, onRemove, onAddStock }) => {
  const filteredPortfolio = portfolio.filter(
    (stock) => Number(stock.shares) > 0
  );

  if (filteredPortfolio.length === 0) {
    return <EmptyPortfolio onAddStock={onAddStock} />;
  }

  return (
    <TableContainer component={Paper} sx={styles.tableContainer}>
      <Table>
        <TableHeader />
        <TableBody>
          {filteredPortfolio.map((stock) => (
            <StockRow key={stock.id} stock={stock} onRemove={onRemove} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PortfolioTable;

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
  tableContainer: {
    borderRadius: 3,
    boxShadow: 1,
  },
  tableHeaderCell: {
    fontWeight: "bold",
  },
  tableRow: {
    "&:hover": { bgcolor: "#f9fafb" },
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
