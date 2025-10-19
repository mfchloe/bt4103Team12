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
import { DonutChart } from "../components/FARDashboard/DonutChart";
import { HistogramCard } from "../components/FARDashboard/HistogramCard";
import { CategoryBarCard } from "../components/FARDashboard/CategoryBarCard";
import { TopAssetsTable } from "../components/FARDashboard/TopAssetsTable";
import { ActivityLineChart } from "../components/FARDashboard/ActivityLineChart";
import { useApi } from "../hooks/useApi";

const FARDashboard = () => {
  const [filters, setFilters] = useState({
    customer_type: [],
    investor_type: [],
    risk_level: [],
    sectors: [],
    investmentCapacity: { minimum: 0, maximum: 300000 },
    date_range: { start: null, end: null },
    search_query: "",
  });
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Convert slider range to categorical investment capacity values
  // Convert slider range to categorical investment capacity values
  const convertRangeToCategorical = (min, max) => {
    const categories = [];

    // CAP_LT30K: < 30,000
    if (min < 30000) {
      categories.push("CAP_LT30K");
    }

    // CAP_30K_80K: 30,000 - 80,000
    if (min < 80000 && max >= 30000) {
      categories.push("CAP_30K_80K");
    }

    // CAP_80K_300K: 80,000 - 300,000
    if (min < 300000 && max >= 80000) {
      categories.push("CAP_80K_300K");
    }

    // CAP_GT300K: > 300,000
    if (max >= 300000) {
      categories.push("CAP_GT300K");
    }

    return categories;
  };

  // Prepare filters with converted investment capacity
  const backendFilters = useMemo(() => {
    const { investmentCapacity, ...otherFilters } = filters;

    // Only add investment_capacity if the range is not the default (0-300000)
    const isDefaultRange =
      investmentCapacity?.minimum === 0 &&
      investmentCapacity?.maximum === 300000;

    const investment_capacity =
      investmentCapacity && !isDefaultRange
        ? convertRangeToCategorical(
            investmentCapacity.minimum,
            investmentCapacity.maximum
          )
        : undefined;

    // Clean up the filters - remove empty arrays and null date ranges
    const cleanedFilters = {};

    for (const [key, value] of Object.entries(otherFilters)) {
      if (key === "date_range") {
        // Only include date_range if start or end is set
        if (value && (value.start || value.end)) {
          cleanedFilters[key] = value;
        }
      } else if (Array.isArray(value)) {
        // Only include arrays that have items
        if (value.length > 0) {
          cleanedFilters[key] = value;
        }
      } else if (value !== null && value !== undefined && value !== "") {
        cleanedFilters[key] = value;
      }
    }

    if (investment_capacity && investment_capacity.length > 0) {
      cleanedFilters.investment_capacity = investment_capacity;
    }

    // Debug: Log the filters being sent
    console.log("Backend filters:", cleanedFilters);

    return cleanedFilters;
  }, [filters]);
  // const body = useMemo(() => ({ filters }), [filters]);
  const body = useMemo(() => ({ filters: backendFilters }), [backendFilters]);

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
  // Activity over time
  const { data: activitySeries } = useApi("/api/far/activity-series", body);
  const { data: assetCategoryData } = useApi("/api/far/category-breakdown", {
    ...body,
    column: "preferred_asset_category",
  });
  console.log(assetCategoryData);

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
      investmentCapacity: { minimum: 0, maximum: 300000 },
      date_range: { start: null, end: null },
      search_query: "",
    });
    setSelectedAsset(null);
  };

  // Helper to safely format numbers
  const safeNumber = (num, decimals = 2) =>
    typeof num === "number" && !isNaN(num) ? num.toFixed(decimals) : "-";

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
            value={safeNumber(metrics?.avg_transactions_per_week)}
            icon={ShowChartIcon}
          />

          <StatCard
            title="Avg Trading Activity Ratio"
            value={safeNumber(metrics?.avg_trading_activity_ratio)}
            icon={PieChartIcon}
          />

          <StatCard
            title="Total Industries Bought"
            value={metrics?.total_industries_bought ?? "-"}
            icon={TrendingUpIcon}
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
              <DonutChart
                title="Investor Type Breakdown"
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
              <ActivityLineChart
                title="Customer Activity over Time"
                rows={activitySeries?.rows}
              />
            </Box>
            <DonutChart
              title="Asset Category Breakdown"
              data={assetCategoryData?.rows ?? []}
              colors={["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]}
              onSelect={(category) =>
                setFilters((f) => ({ ...f, asset_category: [category] }))
              }
              height={280}
            />

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
