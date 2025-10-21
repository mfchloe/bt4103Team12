import { useEffect, useState } from "react";
import { Box, Typography, Paper, Stack, TextField } from "@mui/material";
import TransactionsTable from "../components/home/TransactionsTable";

// Helper
const USE_MOCK = true;

const MOCK = [
  { id: "7590224", side: "Buy", dt: "2020-03-27", symbol: "APPL", company: "Apple Inc.", shares: 5000, price: 2.2, total: 11000 },
  { id: "7652627", side: "Sell", dt: "2020-05-07", symbol: "JPM", company: "JPMorgan Chase & Co.", shares: 5000, price: 2.54, total: 12700 },
  { id: "11874149", side: "Sell", dt: "2022-07-04", symbol: "CRM", company: "Salesforce, Inc.", shares: 100, price: 1.24, total: 124 },
  { id: "11874153", side: "Sell", dt: "2021-06-24", symbol: "MCD", company: "McDonald’s Corporation", shares: 150, price: 0.448, total: 67.2 },
];

async function fetchMyTransactions({ token, searchQuery = "", limit = 200, offset = 0 } = {}) {
  if (USE_MOCK) {
    const s = searchQuery.trim().toUpperCase();
    const all = MOCK.filter(r =>
      !s || r.symbol.toUpperCase().includes(s) || r.company.toUpperCase().includes(s)
    );
    return { items: all.slice(offset, offset + limit), total: all.length, limit, offset };
  }
  const params = new URLSearchParams({ searchQuery, limit: String(limit), offset: String(offset) });
  const base = import.meta.env.VITE_API_BASE;
  const res = await fetch(`${base}/api/transactions/mine?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Transactions Page
export default function Transactions() {
  const token = localStorage.getItem("token") || undefined;

  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState({ items: [], total: 0, limit: 50, offset: 0 });
  const [loading, setLoading] = useState(false);

  // fetch (mock data for now, to do backend later)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchMyTransactions({ token, searchQuery, limit: 200, offset: 0 });
        if (!cancelled) setData(res);
      } catch (e) {
        console.error(e);
        if (!cancelled) setData({ items: [], total: 0, limit: 50, offset: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [searchQuery, token]);

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
        />
      </Box>

      <Paper elevation={0} sx={{ border: "1px solid #eee", borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
            Loading…
          </Box>
        ) : (
          <TransactionsTable rows={data.items} />
        )}
      </Paper>
    </Box>
  );
}