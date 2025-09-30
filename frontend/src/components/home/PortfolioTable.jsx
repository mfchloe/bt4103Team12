import React from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

const PortfolioTable = () => (
  <Box sx={styles.portfolioContainer}>
    <TableContainer component={Paper} sx={styles.portfolioTable}>
      <Table>
        <TableHead>
          <TableRow>
            {["Stock", "Units", "Actions"].map((header) => (
              <TableCell key={header} align="center" sx={styles.tableHeader}>
                {header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {[...Array(5)].map((_, index) => (
            <TableRow key={index}>
              <TableCell align="center" sx={styles.tableCell}>
                --
              </TableCell>
              <TableCell align="center" sx={styles.tableCell}>
                --
              </TableCell>
              <TableCell align="center" sx={styles.tableCell}>
                --
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
);

export default PortfolioTable;

const styles = {
  portfolioContainer: {
    bgcolor: "#305D9E",
    borderRadius: "16px",
    p: 3,
    mb: 4,
    boxShadow: 3,
  },
  portfolioTable: {
    borderRadius: "12px",
    overflow: "hidden",
  },
  tableHeader: {
    bgcolor: "#305D9E",
    color: "white",
    fontWeight: "bold",
    fontSize: "1rem",
  },
  tableCell: {
    color: "#6b7280",
    height: 56,
  },
};
