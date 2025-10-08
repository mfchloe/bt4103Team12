import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
  TablePagination,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

interface Asset {
  asset: string;
  adoption_rate: number;
  lift?: number;
  momentum_slope?: number;
}

interface TopAssetsTableProps {
  rows?: Asset[];
  onSelectAsset?: (asset: string) => void;
  rowsPerPageOptions?: number[];
}

export const TopAssetsTable = ({
  rows = [],
  onSelectAsset,
  rowsPerPageOptions = [5, 10, 25],
}: TopAssetsTableProps) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // reset to first page
  };

  // slice rows for current page
  const paginatedRows = rows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Card>
      <CardHeader
        title={
          <Typography variant="h6" fontWeight={600}>
            Top Assets for Cohort
          </Typography>
        }
      />
      <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Asset
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Adoption
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Lift
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Momentum
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRows.map((row) => (
                <TableRow
                  key={row.asset}
                  sx={{
                    cursor: "pointer",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                  onClick={() => onSelectAsset?.(row.asset)}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {row.asset}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${(row.adoption_rate * 100).toFixed(1)}%`}
                      size="small"
                      sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
                    />
                  </TableCell>
                  <TableCell>
                    {row.lift ? (
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {row.lift.toFixed(2)}×
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.momentum_slope != null ? (
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        {row.momentum_slope >= 0 ? (
                          <TrendingUpIcon
                            sx={{ fontSize: 16, color: "success.main" }}
                          />
                        ) : (
                          <TrendingDownIcon
                            sx={{ fontSize: 16, color: "error.main" }}
                          />
                        )}
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: "monospace" }}
                        >
                          {(row.momentum_slope * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={rows.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={rowsPerPageOptions}
        />
      </CardContent>
    </Card>
  );
};
