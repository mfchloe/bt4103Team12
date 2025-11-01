import { useEffect, useState, useMemo } from "react";
import { Box, Typography, Paper, TextField } from "@mui/material";
import TransactionsTable from "../components/home/TransactionsTable";
import { useAuth } from "../context/AuthContext.jsx";
import { apiBaseUrl } from "../api/httpClient";
import MyCharts from "../components/transactions/myCharts.jsx";
export default function Transactions() {
  const { isFirebaseUser, isFarCustomer, farCustomerSession } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isFarCustomer || !farCustomerSession?.customerId) {
      setAllRows([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/far/transactions/${farCustomerSession.customerId}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setAllRows(Array.isArray(json.items) ? json.items : []);
      } catch (err) {
        console.error("Failed to load transactions", err);
        if (!cancelled) setAllRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isFarCustomer, farCustomerSession]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return allRows;

    return allRows.filter(
      (r) =>
        (r.stock && r.stock.toLowerCase().includes(query)) ||
        (r.category && r.category.toLowerCase().includes(query)) ||
        (r.buy_sell && r.buy_sell.toLowerCase().includes(query))
    );
  }, [allRows, searchQuery]);

  const showEmptyState =
    (isFirebaseUser && !isFarCustomer) ||
    (isFarCustomer && !loading && filteredRows.length === 0);

  const MIN_TX = 5; // same threshold as MyCharts

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, color: "#305D9E" }}>
          My Transactions
        </Typography>

        <TextField
          variant="outlined"
          placeholder="Search"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            width: 320,
            "& .MuiOutlinedInput-root": {
              borderRadius: "12px",
              backgroundColor: "#fff",
            },
          }}
          disabled={isFirebaseUser && !isFarCustomer}
        />
      </Box>

      <Paper
        elevation={0}
        sx={{ border: "1px solid #eee", borderRadius: 2, mb: 4 }}
      >
        {loading ? (
          <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
            Loading…
          </Box>
        ) : showEmptyState ? (
          <Box sx={{ p: 6, textAlign: "center", color: "text.secondary" }}>
            You don't have any transactions yet.
          </Box>
        ) : (
          <TransactionsTable rows={filteredRows} />
        )}
      </Paper>

      {/* Render charts if enough transactions */}
      {filteredRows.length >= MIN_TX && <MyCharts />}
    </Box>
  );
}
