import { useEffect, useMemo, useState } from "react";
import { Container, Box, Typography } from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import PieChartIcon from "@mui/icons-material/PieChart";
import StatCard from "../components/StatCard";
import { FilterSidebar } from "../components/FARDashboard/FilterSideBar";
import { InvestorTypeDonut } from "../components/FARDashboard/InvestorTypeDonut";
import { HistogramCard } from "../components/FARDashboard/HistogramCard";
import { CategoryBarCard } from "../components/FARDashboard/CategoryBarCard";
import { TopAssetsTable } from "../components/FARDashboard/TopAssetsTable";
import { ActivityLineChart } from "../components/FARDashboard/ActivityLineChart";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const useApi = (path, body) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!path) return;
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

const FARDashboard = () => {
  const [filters, setFilters] = useState({
    customer_type: [],
    investor_type: [],
    risk_level: [],
    sectors: [],
    investment_capacity: { minimum: 0, maximum: 300000 },
    date_range: { start: null, end: null },
    search_query: "",
  });
  const [selectedAsset, setSelectedAsset] = useState(null);

  const body = useMemo(() => ({ filters }), [filters]);

  // Core metrics
  const { data: metrics } = useApi("/api/far/metrics", body);
  // Top assets
  const { data: topAssets } = useApi("/api/far/top-assets", {
    ...body,
    top_n: 15,
  });
  // Industry preferences
  const { data: industryPrefs } = useApi("/api/far/category-breakdown", {
    ...body,
    column: "preferred_industry",
    top_n: 7,
  });
  // Investor type breakdown
  const { data: investorBreakdown } = useApi(
    "/api/far/investor-type-breakdown",
    body
  );
  // Trading activity histogram
  const { data: activityHist } = useApi("/api/far/histogram", {
    ...body,
    column: "trading_activity_ratio",
    bins: 30,
  });
  // // Asset explanation
  // const { data: explain } = useApi(selectedAsset ? "/api/far/explain" : null, {
  //   ...body,
  //   asset: selectedAsset,
  // });
  // Activity over time
  const { data: activitySeries } = useApi("/api/far/activity-series", body);

  const investorTypeData = useMemo(
    () => investorBreakdown?.rows || [],
    [investorBreakdown]
  );

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
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", py: 3 }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Historical Investment Behavior Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Analyze our customer profiles and investment patterns
          </Typography>
        </Box>

        {/* KPI Cards */}
        {/* KPI Cards */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(5, 1fr)",
            },
            gap: 3,
            mb: 4,
          }}
        >
          <StatCard
            title="Total Customers"
            value={metrics?.customers ?? "-"}
            icon={PeopleIcon}
          />

          <StatCard
            title="Avg Transactions/Week"
            value={metrics?.avg_transactions_per_week?.toFixed(2) ?? "-"}
            icon={ShowChartIcon}
          />

          <StatCard
            title="Avg Trading Activity Ratio"
            value={
              metrics?.avg_trading_activity_ratio !== undefined
                ? metrics.avg_trading_activity_ratio.toFixed(2)
                : "-"
            }
            icon={PieChartIcon}
          />

          <StatCard
            title="Total Industries Bought"
            value={metrics?.total_industries_bought ?? "-"}
            icon={TrendingUpIcon}
          />
          <StatCard
            title="Total Asset Categories Bought"
            value={metrics?.total_asset_categories_bought ?? "-"}
            icon={ShowChartIcon}
          />
        </Box>

        {/* Main Content Grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "320px 1fr" },
            gap: 3,
          }}
        >
          {/* Filter Sidebar */}
          <Box>
            <FilterSidebar
              filters={filters}
              setFilters={setFilters}
              onReset={resetFilters}
            />
          </Box>

          {/* Charts and Tables */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "2fr 3fr" },
                gap: 3,
              }}
            >
              <InvestorTypeDonut
                data={investorTypeData}
                onSelect={(name) =>
                  setFilters((f) => ({ ...f, investor_type: [name] }))
                }
              />
              <HistogramCard
                title="Trading Activity Distribution"
                bins={activityHist?.bins}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Customer Activity Over Time
              </Typography>
              <ActivityLineChart rows={activitySeries?.rows} />
            </Box>

            <CategoryBarCard
              title="Industry Preference"
              rows={industryPrefs?.rows}
            />
            <TopAssetsTable
              rows={topAssets?.rows || []}
              onSelectAsset={setSelectedAsset}
            />
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default FARDashboard;
