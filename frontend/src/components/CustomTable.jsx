import { useState } from "react";
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
  TableFooter,
  TablePagination,
} from "@mui/material";

const POSITIVE_COLOR = "#16a34a";
const NEGATIVE_COLOR = "#dc2626";

const CustomTable = ({
  headers,
  data,
  renderRow,
  rowsPerPageOptions = [5, 10, 25],
  sx = {},
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0]);

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedData = data.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <TableContainer component={Paper} sx={styles.tableContainer}>
      <Table>
        <TableHead>
          <TableRow>
            {headers.map((header) => (
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
        <TableBody>
          {paginatedData.map((row, idx) => renderRow(row, idx))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TablePagination
              rowsPerPageOptions={rowsPerPageOptions}
              count={data.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                "& .MuiTablePagination-toolbar": { justifyContent: "flex-end" },
              }}
            />
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
  );
};
export default CustomTable;

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
