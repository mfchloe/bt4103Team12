import { Box, Stack } from "@mui/material";
import { DonutChart } from "../DonutChart";
import { CategoryBarCard } from "../CategoryBarCard";
import { TopAssetsTable } from "../TopAssetsTable";
import { StackedBarChartCard } from "../StackedBarChartCard";
import { EfficientFrontierChart } from "../EfficientFrontierChart";
import HeatmapCard from "../HeatmapCard";
export default function AssetIndustryTab({
  assetSubcategories,
  assetCategoryData,
  industryPrefs,
  topAssets,
  setSelectedAsset,
  efficientFrontier,
  riskReturnByCategory, // NEW PROP
}) {
  return (
    <Stack spacing={3}>
      {/* Category + Subcategory charts side by side */}
      <Box
        sx={{
          display: "flex",
          gap: 3,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ flex: 1, minWidth: 300 }}>
          <DonutChart
            title="Asset Category Breakdown"
            data={assetCategoryData?.rows || []}
            height={300}
          />
        </Box>
        <Box sx={{ flex: 1, minWidth: 300 }}>
          <CategoryBarCard
            title="Asset Subcategory Breakdown"
            rows={assetSubcategories?.rows || []}
          />
        </Box>
      </Box>

      <CategoryBarCard title="Industry Preference" rows={industryPrefs?.rows} />

      <StackedBarChartCard
        title="Industry Preference by Cluster"
        rows={industryPrefs?.rows || []}
      />

      {/* NEW: Risk-Return Heatmap */}
      <HeatmapCard
        title="Risk-Return Profile by Asset Category"
        data={riskReturnByCategory?.rows || []}
        xAxis="avg_risk_score"
        yAxis="avg_return_pct"
        tooltip="Shows why we recommend specific categories based on risk tolerance. Bubble size represents number of customers."
      />

      <EfficientFrontierChart
        title="Efficient Frontier (Daily Metrics)"
        data={efficientFrontier?.points || []}
      />

      <TopAssetsTable
        rows={topAssets?.rows || []}
        onSelectAsset={setSelectedAsset}
      />
    </Stack>
  );
}
