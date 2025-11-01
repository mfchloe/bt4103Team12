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
import { DARK_BLUE, LIGHT_BLUE } from "../constants/colors";
const createDefaultFilters = () => ({
  customer_type: [],
  risk_level: [],
  sectors: [],
  investmentCapacity: { minimum: 0, maximum: 300000 },
  date_range: { start: null, end: null },
  asset_category: [],
  search_query: "",
  cluster: [],
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

    // convert cluster to numbers if present
    const normalizedFilters = {
      ...otherFilters,
      cluster: otherFilters.cluster?.map((c) => Number(c)),
    };

    console.log("Before cleaning - normalizedFilters:", normalizedFilters);

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
    Object.entries(normalizedFilters).forEach(([key, value]) => {
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
  }, [filters]); // In FARDashboard.tsx, update the API calls section:
  const body = useMemo(() => ({ filters: backendFilters }), [backendFilters]);

  // API calls
  // Customer Type and Risk Level charts - only affected by cluster
  const clusterOnlyFilters = useMemo(() => {
    if (!filters.cluster || filters.cluster.length === 0) return {};
    return { cluster: filters.cluster };
  }, [filters.cluster]);

  const filtersWithoutCluster = useMemo(() => {
    const { cluster, ...rest } = backendFilters;
    return rest;
  }, [backendFilters]);

  // Customer Type chart (only cluster affects it)
  const { data: customerTypeData } = useApi("/api/far/category-breakdown", {
    filters: clusterOnlyFilters,
    column: "customerType",
  });

  // Risk Level chart (only cluster affects it)
  const { data: riskLevelData } = useApi("/api/far/category-breakdown", {
    filters: clusterOnlyFilters,
    column: "riskLevel",
  });

  // All other charts - affected by ALL filters including cluster
  const { data: metrics } = useApi("/api/far/metrics", body);
  const { data: topAssets } = useApi("/api/far/top-assets", {
    ...body,
    top_n: 15,
  });
  const { data: industryPrefs } = useApi("/api/far/category-breakdown", {
    ...body,
    column: "preferred_industry",
    top_n: 7,
    include_clusters: true,
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
  const { data: investmentCapacityData } = useApi(
    "/api/far/category-breakdown",
    {
      ...body,
      column: "investmentCapacity", // <- your new column
    }
  );

  const { data: explorationHist } = useApi("/api/far/histogram", {
    ...body, // your existing filters
    column: "exploration_score",
    bins: 30, // number of bins for histogram
  });

  const { data: diversificationScatter } = useApi("/api/far/scatter-sample", {
    ...body, // your existing filters
    x_column: "current_diversification_score",
    y_column: "current_portfolio_concentration",
    color_by: "cluster", // or "riskLevel"
    limit: 500, // sample size
  });

  const { data: efficientFrontier } = useApi(
    "/api/far/efficient-frontier",
    body
  );

  // Risk-Return Matrix data
  const { data: riskReturnByCategory } = useApi("/api/far/risk-return-matrix", {
    ...body,
    group_by: "preferred_asset_category",
  });

  console.log("Risk-Return Data:", riskReturnByCategory);

  const combinedInvestmentCapacity = useMemo(() => {
    if (!investmentCapacityData?.rows) return [];

    const grouped = {};

    investmentCapacityData.rows.forEach((row) => {
      const key = row.label.replace("Predicted_", "");
      if (!grouped[key]) grouped[key] = 0;
      grouped[key] += row.value;
    });

    // Convert to array for chart
    return Object.entries(grouped).map(([label, value]) => ({ label, value }));
  }, [investmentCapacityData]);

  console.log("Industry Prefs:", industryPrefs);
  // Cluster data - affected by ALL filters
  const { data: clusterData } = useApi("/api/far/cluster-breakdown", {
    filters: filtersWithoutCluster,
  });

  const clusterCounts = useMemo(() => clusterData || {}, [clusterData]);
  const clusterMetrics = useMemo(
    () => clusterData?.metrics || {},
    [clusterData]
  );

  const investorTypeData = useMemo(
    () => investorBreakdown?.rows || [],
    [investorBreakdown]
  );
  useEffect(() => {
    if (clusterData?.rows) {
      console.log(
        "clusterData rows and types:",
        clusterData.rows.map((r) => ({
          value: r.value,
          type: typeof r.value,
        }))
      );
    }
  }, [clusterData]);

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
    <Box sx={{ minHeight: "100vh", py: 3 }}>
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
                clusterCounts: clusterCounts,
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
              <Box sx={styles.tabContainer}>
                <Tabs
                  value={activeTab}
                  onChange={(_, val) => setActiveTab(val)}
                  variant="scrollable"
                  scrollButtons="auto"
                  TabIndicatorProps={{ style: { display: "none" } }}
                >
                  {["Trading Behavior", "Asset & Industry"].map((label, i) => (
                    <Tab
                      key={label}
                      label={label}
                      sx={styles.tabStyle(activeTab, i)}
                    />
                  ))}
                </Tabs>
              </Box>
            </Box>

            <Box sx={{ mt: 3 }}>
              {activeTab === 0 && (
                <TradingBehaviorTab
                  investorTypeData={investorTypeData}
                  activityHist={activityHist}
                  activitySeries={activitySeries}
                  investmentVsTransactions={investmentVsTransactions}
                  portfolioDiversification={portfolioDiversification}
                  investmentCapacityData={combinedInvestmentCapacity}
                  explorationHist={explorationHist}
                  diversificationScatter={diversificationScatter}
                />
              )}
              {activeTab === 1 && (
                <AssetIndustryTab
                  assetSubcategories={assetSubcategories}
                  assetCategoryData={assetCategoryData}
                  industryPrefs={industryPrefs}
                  topAssets={topAssets}
                  setSelectedAsset={setSelectedAsset}
                  efficientFrontier={efficientFrontier}
                  riskReturnByCategory={riskReturnByCategory}
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
  tabContainer: {
    display: "inline-flex",
    backgroundColor: "#f9f9f9", // soft neutral background
    borderRadius: "999px", // pill shape
    padding: "4px", // inner padding around tabs
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)", // subtle shadow for depth
  },
  tabStyle: (activeTab, i) => ({
    textTransform: "none",
    fontWeight: activeTab === i ? 700 : 500,
    fontSize: "0.95rem",
    borderRadius: "999px", // pill shape
    px: 3,
    py: 1,
    minHeight: "unset",
    lineHeight: 1.4,
    margin: "0 2px",
    transition: "all 0.25s ease",
    color: activeTab === i ? DARK_BLUE : "rgba(0,0,0,0.6)",
    "&:hover": {
      color: DARK_BLUE,
      backgroundColor:
        activeTab === i ? "rgba(0, 70, 180, 0.15)" : "rgba(0,0,0,0.04)",
    },
  }),
};
