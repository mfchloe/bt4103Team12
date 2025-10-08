import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, Card, CardContent, Chip, Divider, Button, ToggleButton, ToggleButtonGroup, TextField, Slider, FormGroup, FormControlLabel, Checkbox, Select, MenuItem, InputLabel, Grid } from "@mui/material";
import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import StatCard from "../components/StatCard";
import { MdGroups, MdInsights, MdAttachMoney, MdTrendingUp } from "react-icons/md";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const useApi = (path, body) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!path) return; // guard
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body || {}),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!ignore) setData(json);
      } catch (e) {
        if (!ignore) setError(e);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    run();
    return () => {
      ignore = true;
    };
  }, [path, JSON.stringify(body)]);

  return { data, loading, error };
};

const FilterSidebar = ({ filters, setFilters, onReset }) => {
  const update = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const toggleFromSet = (key, val) => {
    setFilters((f) => {
      const next = new Set(f[key] || []);
      next.has(val) ? next.delete(val) : next.add(val);
      return { ...f, [key]: Array.from(next) };
    });
  };

  return (
    <Card sx={{ p: 2, position: "sticky", top: 16 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        🎯 Analyze by Customer Profile
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        Customer Type
      </Typography>
      <FormGroup row sx={{ mb: 2 }}>
        {[
          ["Mass", "Mass"],
          ["Premium", "Premium"],
        ].map(([value, label]) => (
          <FormControlLabel
            key={value}
            control={
              <Checkbox
                checked={(filters.customer_type || []).includes(value)}
                onChange={() => toggleFromSet("customer_type", value)}
              />
            }
            label={label}
          />
        ))}
      </FormGroup>

      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        Investor Type
      </Typography>
      <FormGroup sx={{ mb: 2 }}>
        {["Buy-and-Hold", "Moderate Trader", "Active Trader"].map((v) => (
          <FormControlLabel
            key={v}
            control={
              <Checkbox
                checked={(filters.investor_type || []).includes(v)}
                onChange={() => toggleFromSet("investor_type", v)}
              />
            }
            label={v}
          />
        ))}
      </FormGroup>

      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        Risk Level
      </Typography>
      <FormGroup sx={{ mb: 2 }}>
        {["Conservative", "Balanced", "Aggressive", "Income"].map((v) => (
          <FormControlLabel
            key={v}
            control={
              <Checkbox
                checked={(filters.risk_level || []).includes(v)}
                onChange={() => toggleFromSet("risk_level", v)}
              />
            }
            label={v}
          />
        ))}
      </FormGroup>

      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        Investment Capacity (€)
      </Typography>
      <Box sx={{ px: 1 }}>
        <Slider
          value={[filters.investment_capacity?.minimum ?? 0, filters.investment_capacity?.maximum ?? 300000]}
          step={1000}
          min={0}
          max={300000}
          onChange={(_, v) =>
            setFilters((f) => ({
              ...f,
              investment_capacity: { minimum: v[0], maximum: v[1] },
            }))
          }
          sx={{ mb: 2 }}
        />
      </Box>

      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        Sector
      </Typography>
      <Select
        value={(filters.sectors && filters.sectors[0]) || ""}
        displayEmpty
        fullWidth
        onChange={(e) =>
          setFilters((f) => ({ ...f, sectors: e.target.value ? [e.target.value] : [] }))
        }
        sx={{ mb: 2 }}
      >
        <MenuItem value="">All</MenuItem>
        {["Technology", "Finance", "Healthcare", "Energy", "Utilities"].map((s) => (
          <MenuItem key={s} value={s}>
            {s}
          </MenuItem>
        ))}
      </Select>

      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        Search
      </Typography>
      <TextField
        value={filters.search_query || ""}
        onChange={(e) => update("search_query", e.target.value)}
        placeholder="Search customers/assets"
        size="small"
        fullWidth
      />

      <Divider sx={{ my: 2 }} />
      <Button variant="outlined" color="secondary" fullWidth onClick={onReset}>
        Reset Filters
      </Button>
    </Card>
  );
};

const donutColors = ["#305D9E", "#54A6FF", "#9BD0FF", "#15428E"];

const InvestorTypeDonut = ({ data, onSelect }) => {
  const items = (data || []).map((d, idx) => ({ name: d.label, value: d.value, fill: donutColors[idx % donutColors.length] }));
  return (
    <Card>
      <CardContent>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>Investor Type Breakdown</Typography>
        <Box sx={{ height: 220 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie dataKey="value" data={items} outerRadius={80} onClick={(d) => onSelect?.(d?.name)}>
                {items.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

const HistogramCard = ({ title, bins }) => {
  const data = (bins || []).map((b) => ({
    name: `${Math.round(b.bin_start)}-${Math.round(b.bin_end)}`,
    count: b.count,
  }));
  return (
    <Card>
      <CardContent>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>{title}</Typography>
        <Box sx={{ height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#305D9E" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

const CategoryBarCard = ({ title, rows }) => {
  const data = (rows || []).map((r) => ({ name: r.label, value: r.value }));
  return (
    <Card>
      <CardContent>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>{title}</Typography>
        <Box sx={{ height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={60} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#54A6FF" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

const TopAssetsTable = ({ rows, onSelectAsset }) => {
  return (
    <Card>
      <CardContent>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>Top Assets for Cohort</Typography>
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
          <Box component="thead" sx={{ '& th': { textAlign: 'left', borderBottom: '1px solid #eee', p: 1 } }}>
            <Box component="tr">
              <Box component="th">Asset</Box>
              <Box component="th">Adoption</Box>
              <Box component="th">Lift</Box>
              <Box component="th">Momentum</Box>
            </Box>
          </Box>
          <Box component="tbody" sx={{ '& td': { borderBottom: '1px solid #f1f5f9', p: 1 } }}>
            {(rows || []).map((r) => (
              <Box component="tr" key={r.asset} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#f9fafb' } }} onClick={() => onSelectAsset?.(r.asset)}>
                <Box component="td">{r.asset}</Box>
                <Box component="td">{(r.adoption_rate * 100).toFixed(1)}%</Box>
                <Box component="td">{r.lift ? r.lift.toFixed(2) + '×' : '-'}</Box>
                <Box component="td">{r.momentum_slope !== null && r.momentum_slope !== undefined ? (r.momentum_slope * 100).toFixed(1) + '%' : '-'}</Box>
              </Box>
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const WhyPanel = ({ asset, data }) => {
  if (!asset) return null;
  const d = data || {};
  return (
    <Card>
      <CardContent>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>Why {asset}?</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="body2">Cohort adoption: {d.adoption_rate != null ? `${(d.adoption_rate * 100).toFixed(1)}%` : '-'}</Typography>
          <Typography variant="body2">Lift vs population: {d.lift != null ? `${d.lift.toFixed(2)}×` : '-'}</Typography>
          <Typography variant="body2">Recent momentum: {d.recent_momentum != null ? `${(d.recent_momentum * 100).toFixed(1)}%` : '-'}</Typography>
          <Typography variant="body2">Similar customers: {d.similar_customer_count ?? '-'}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

const FARDashboard = () => {
  const [filters, setFilters] = useState({
    customer_type: ["Mass", "Premium"],
    investor_type: [],
    risk_level: ["Conservative", "Balanced", "Aggressive"],
    sectors: [],
    investment_capacity: { minimum: 0, maximum: 300000 },
    date_range: { start: null, end: null },
    search_query: "",
  });
  const [selectedAsset, setSelectedAsset] = useState(null);

  const body = useMemo(() => ({ filters }), [filters]);

  const { data: metrics } = useApi("/api/far/metrics", body);
  const { data: topAssets } = useApi("/api/far/top-assets", { ...body, top_n: 15 });
  const { data: sectorPrefs } = useApi("/api/far/category-breakdown", { ...body, column: "preferred_sector", top_n: 15 });
  const { data: investorBreakdown } = useApi("/api/far/investor-type-breakdown", body);
  const { data: activityHist } = useApi("/api/far/histogram", { ...body, column: "trading_activity_ratio", bins: 30 });
  const { data: explain } = useApi(selectedAsset ? "/api/far/explain" : null, { ...body, asset: selectedAsset });

  const investorTypeData = useMemo(() => {
    return investorBreakdown?.rows || [];
  }, [investorBreakdown]);

  const resetFilters = () => {
    setFilters({
      customer_type: ["Mass", "Premium"],
      investor_type: [],
      risk_level: ["Conservative", "Balanced", "Aggressive"],
      sectors: [],
      investment_capacity: { minimum: 0, maximum: 300000 },
      date_range: { start: null, end: null },
      search_query: "",
    });
    setSelectedAsset(null);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
        Customer Investment Behavior Dashboard
      </Typography>

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Customers" value={metrics?.customers ?? "-"} icon={MdGroups} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Avg Portfolio" value={metrics?.avg_portfolio_value ? `€${Math.round(metrics.avg_portfolio_value).toLocaleString()}` : "-"} icon={MdAttachMoney} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Median Holding Days" value={metrics?.median_holding_days ?? "-"} icon={MdInsights} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Avg Tx/Month" value={metrics?.avg_transactions_per_month ?? "-"} icon={MdTrendingUp} />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Sidebar */}
        <Grid item xs={12} md={3}>
          <FilterSidebar filters={filters} setFilters={setFilters} onReset={resetFilters} />
        </Grid>

        {/* Main content */}
        <Grid item xs={12} md={9}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <InvestorTypeDonut
                data={investorTypeData}
                onSelect={(name) => setFilters((f) => ({ ...f, investor_type: [name] }))}
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <ActivitySeriesChart rows={activitySeries?.rows} />
            </Grid>

            <Grid item xs={12}>
              <TopAssetsTable rows={topAssets?.rows || []} onSelectAsset={setSelectedAsset} />
            </Grid>

            <Grid item xs={12}>
              <WhyPanel asset={selectedAsset} data={explain} />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FARDashboard;
