import { Box, Stack } from "@mui/material";
import { DonutChart } from "../DonutChart";
import { CategoryBarCard } from "../CategoryBarCard";
import { TopAssetsTable } from "../TopAssetsTable";
import { StackedBarChartCard } from "../StackedBarChartCard";
export default function AssetIndustryTab({
  assetSubcategories,
  assetCategoryData,
  industryPrefs,
  topAssets,
  setSelectedAsset,
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

      <TopAssetsTable
        rows={topAssets?.rows || []}
        onSelectAsset={setSelectedAsset}
      />
    </Stack>
  );
}
