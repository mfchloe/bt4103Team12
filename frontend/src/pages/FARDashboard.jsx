import { useEffect, useMemo, useRef, useState } from "react";
import { Container, Box, Typography, Tabs, Tab, Paper } from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import PieChartIcon from "@mui/icons-material/PieChart";

import StatCard from "../components/StatCard";
import { FilterChartsPanel } from "../components/FARDashboard/FilterChartsPanel";
import { useApi } from "../hooks/useApi";

import TradingBehaviorTab from "../components/FARDashboard/tabs/TradingBehaviorTab";
import AssetIndustryTab from "../components/FARDashboard/tabs/AssetIndustryTab";

const createDefaultFilters = () => ({
  customer_type: [],
  risk_level: [],
  sectors: [],
  investmentCapacity: { minimum: 0, maximum: 300000 },
  date_range: { start: null, end: null },
  asset_category: [],
  search_query: "",
});

export default function FARDashboard() {
  const [filters, setFilters] = useState(createDefaultFilters());
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const hasHydratedFilters = useRef(false);

  useEffect(() => {
    if (hasHydratedFilters.current) return;
    hasHydratedFilters.current = true;
    setFilters((prev) => ({ ...createDefaultFilters(), ...prev }));
  }, []);

  const convertRangeToCategorical = (min, max) => {
    const categories = [];
    if (min < 30000) categories.push("CAP_LT30K");
    if (min < 80000 && max >= 30000) categories.push("CAP_30K_80K");
    if (min < 300000 && max >= 80000) categories.push("CAP_80K_300K");
    if (max >= 300000) categories.push("CAP_GT300K");
    return categories;
  };

  const backendFilters = useMemo(() => {
    const { investmentCapacity, ...otherFilters } = filters;
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

    const cleanedFilters = {};
    Object.entries(otherFilters).forEach(([key, value]) => {
      if (key === "date_range" && (value.start || value.end)) {
        cleanedFilters[key] = value;
      } else if (Array.isArray(value) && value.length > 0) {
        cleanedFilters[key] = value;
      } else if (value !== null && value !== undefined && value !== "") {
        cleanedFilters[key] = value;
      }
    });
    if (investment_capacity?.length)
      cleanedFilters.investment_capacity = investment_capacity;
    return cleanedFilters;
  }, [filters]);

  const body = useMemo(() => ({ filters: backendFilters }), [backendFilters]);

  // API calls
  const { data: customerTypeData } = useApi("/api/far/category-breakdown", {
    filters: {},
    column: "customerType",
  });

  const { data: riskLevelData } = useApi("/api/far/category-breakdown", {
    filters: {},
    column: "riskLevel",
  });

  const { data: metrics } = useApi("/api/far/metrics", body);
  const { data: topAssets } = useApi("/api/far/top-assets", {
    ...body,
    top_n: 15,
  });
  const { data: industryPrefs } = useApi("/api/far/category-breakdown", {
    ...body,
    column: "preferred_industry",
    top_n: 7,
  });
  const { data: investorBreakdown } = useApi(
    "/api/far/investor-type-breakdown",
    body
  );
  const { data: activityHist } = useApi("/api/far/histogram", {
    ...body,
    column: "trading_activity_ratio",
    bins: 30,
  });
  const { data: activitySeries } = useApi("/api/far/activity-series", body);
  const { data: assetCategoryData } = useApi("/api/far/category-breakdown", {
    ...body,
    column: "preferred_asset_category",
  });
  const { data: assetSubcategories } = useApi("/api/far/category-breakdown", {
    ...body,
    column: "preferred_subcategory",
  });
  const { data: portfolioDiversification } = useApi("/api/far/histogram", {
    ...body,
    column: "current_diversification_score",
    bins: 20,
  });
  const { data: investmentVsTransactions } = useApi("/api/far/scatter-sample", {
    ...body,
    limit: 500,
  });

  const investorTypeData = useMemo(
    () => investorBreakdown?.rows || [],
    [investorBreakdown]
  );

  const resetFilters = () => {
    setFilters({
      ...createDefaultFilters(),
      customer_type: ["Mass", "Premium"],
      risk_level: ["Conservative", "Balanced", "Aggressive"],
    });
    setSelectedAsset(null);
  };

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

        <Box sx={{ display: "flex", gap: 3, mt: 3 }}>
          {/* Sidebar Filters */}
          <Box sx={{ width: 300, flexShrink: 0 }}>
            <FilterChartsPanel
              filters={filters}
              setFilters={setFilters}
              resetFilters={resetFilters}
              data={{
                customerType: customerTypeData?.rows,
                riskLevels: riskLevelData?.rows,
              }}
            />
          </Box>

          {/* Main Dashboard Content */}
          <Box sx={{ flex: 1 }}>
            <Box
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  borderRadius: 3,
                  px: 1,
                  py: 0.5,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Tabs
                  value={activeTab}
                  onChange={(_, val) => setActiveTab(val)}
                  variant="scrollable"
                  scrollButtons="auto"
                  TabIndicatorProps={{
                    style: { display: "none" },
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    minHeight: "unset",
                  }}
                >
                  {["Trading Behavior", "Asset & Industry"].map((label, i) => (
                    <Tab
                      key={label}
                      label={label}
                      sx={styles.tabStyle(activeTab, i)}
                    />
                  ))}
                </Tabs>
              </Paper>
            </Box>

            <Box sx={{ mt: 3 }}>
              {activeTab === 0 && (
                <TradingBehaviorTab
                  investorTypeData={investorTypeData}
                  activityHist={activityHist}
                  activitySeries={activitySeries}
                  investmentVsTransactions={investmentVsTransactions}
                  portfolioDiversification={portfolioDiversification}
                />
              )}
              {activeTab === 1 && (
                <AssetIndustryTab
                  assetSubcategories={assetSubcategories}
                  assetCategoryData={assetCategoryData}
                  industryPrefs={industryPrefs}
                  topAssets={topAssets}
                  setSelectedAsset={setSelectedAsset}
                />
              )}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

const styles = {
  tabStyle: (activeTab, i) => ({
    textTransform: "none",
    fontWeight: 600,
    borderRadius: "999px",
    mx: 0.5,
    px: 2.5,
    py: 0.9,
    minHeight: "unset",
    lineHeight: 1.3,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: activeTab === i ? "#fff" : "#305D9E",
    bgcolor: activeTab === i ? "#305D9E" : "transparent",
    transition: "all 0.3s ease",
    "&:hover": {
      bgcolor: activeTab === i ? "#2B4F8C" : "#E2EFF4",
    },
    "&.Mui-selected": {
      color: "#fff",
    },
  }),
};
