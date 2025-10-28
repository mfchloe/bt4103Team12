import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableSortLabel,
  Typography,
} from "@mui/material";
import { useMemo, useState, useCallback } from "react";

const HEADERS = [
  { id: "date", label: "Date" },
  { id: "stock", label: "Stock" },
  { id: "category", label: "Type" },
  { id: "buy_sell", label: "Buy/Sell" },
  { id: "shares", label: "Shares", numeric: true },
  { id: "price", label: "Price per unit ($)", numeric: true },
  { id: "total", label: "Total ($)", numeric: true },
];

const getComparator = (order, orderBy) => {
  return (a, b) => {
    const valueA = a[orderBy];
    const valueB = b[orderBy];

    if (valueA == null && valueB == null) return 0;
    if (valueA == null) return order === "asc" ? -1 : 1;
    if (valueB == null) return order === "asc" ? 1 : -1;

    if (typeof valueA === "number" && typeof valueB === "number") {
      return order === "asc" ? valueA - valueB : valueB - valueA;
    }

    return order === "asc"
      ? String(valueA).localeCompare(String(valueB))
      : String(valueB).localeCompare(String(valueA));
  };
};

export default function TransactionsTable({ rows }) {
  const [orderBy, setOrderBy] = useState("date");
  const [order, setOrder] = useState("desc");

  const handleSort = useCallback(
    (property) => {
      const isAsc = orderBy === property && order === "asc";
      setOrder(isAsc ? "desc" : "asc");
      setOrderBy(property);
    },
    [order, orderBy]
  );

  const sortedRows = useMemo(() => {
    if (!rows?.length) return [];
    const comparator = getComparator(order, orderBy);
    return [...rows].sort(comparator);
  }, [rows, order, orderBy]);

  return (
    <Table size="small">
      <TableHead sx={{ background: "#f7f7f8" }}>
        <TableRow>
          {HEADERS.map((header) => (
            <TableCell
              key={header.id}
              align={header.numeric ? "right" : "left"}
              sortDirection={orderBy === header.id ? order : false}
            >
              <TableSortLabel
                active={orderBy === header.id}
                direction={orderBy === header.id ? order : "asc"}
                onClick={() => handleSort(header.id)}
              >
                {header.label}
              </TableSortLabel>
            </TableCell>
          ))}
        </TableRow>
      </TableHead>

      <TableBody>
        {sortedRows.map((t) => (
          <TableRow key={t.id} hover>
            <TableCell>{t.date}</TableCell>
            <TableCell>
              <Typography sx={{ fontWeight: 600, lineHeight: 1 }}>
                {t.stock}
              </Typography>
            </TableCell>
            <TableCell>{t.category}</TableCell>
            <TableCell>{t.buy_sell}</TableCell>
            <TableCell align="right">
              {t.shares != null ? t.shares.toLocaleString() : "-"}
            </TableCell>
            <TableCell align="right">
              {t.price != null
                ? t.price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "-"}
            </TableCell>
            <TableCell align="right">
              {t.total != null
                ? t.total.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "-"}
            </TableCell>
          </TableRow>
        ))}

        {sortedRows.length === 0 && (
          <TableRow>
            <TableCell colSpan={HEADERS.length} align="center" sx={{ py: 6, color: "text.secondary" }}>
              You have no transactions.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
