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
} from "@mui/material";
import {
  calculateStockStats,
  formatCurrency,
  formatPercentage,
} from "../../utils/mathHelpers";

const POSITIVE_COLOR = "#16a34a";
const NEGATIVE_COLOR = "#dc2626";

const TABLE_HEADERS = [
  { label: "Symbol", align: "left" },
  { label: "Name", align: "left" },
  { label: "Shares", align: "right" },
  { label: "Buy Price", align: "right" },
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

  return (
    <TableRow sx={styles.tableRow}>
      <TableCell sx={styles.symbolCell}>{stock.symbol}</TableCell>
      <TableCell>{stock.name}</TableCell>
      <TableCell align="right">{stock.shares}</TableCell>
      <TableCell align="right">{formatCurrency(stock.buyPrice)}</TableCell>
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
        <IconButton onClick={() => onRemove(stock.id)} sx={styles.deleteButton}>
          <Trash2 size={18} />
        </IconButton>
      </TableCell>
    </TableRow>
  );
};

const PortfolioTable = ({ portfolio, onRemove, onAddStock }) => {
  if (portfolio.length === 0) {
    return <EmptyPortfolio onAddStock={onAddStock} />;
  }

  return (
    <TableContainer component={Paper} sx={styles.tableContainer}>
      <Table>
        <TableHeader />
        <TableBody>
          {portfolio.map((stock) => (
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
};
