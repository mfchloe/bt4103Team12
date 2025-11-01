import {
  Box,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
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
  riskReturnByCategory,
  groupBy, // NEW PROP
  onChangeGroupBy, // NEW PROP
}) {
  return (
    <Stack spacing={3}>
      {/* Group-By Dropdown */}
      <Box sx={{ maxWidth: 250 }}>
        <FormControl fullWidth>
          <InputLabel>Group By</InputLabel>
          <Select
            value={groupBy}
            label="Group By"
            onChange={(e) => onChangeGroupBy(e.target.value)}
          >
            <MenuItem value="assetCategory">Asset Category</MenuItem>
            <MenuItem value="assetSubCategory">Asset Subcategory</MenuItem>
            <MenuItem value="sector">Sector</MenuItem>
            <MenuItem value="industry">Industry</MenuItem>
          </Select>
        </FormControl>
      </Box>

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

      {/* Risk-Return Heatmap */}
      <HeatmapCard
        title="Risk-Return Profile"
        data={riskReturnByCategory?.rows || []}
        xAxis="avg_risk_score"
        yAxis="avg_return_pct"
        tooltip="Shows why we recommend specific categories based on risk tolerance. Bubble size represents number of customers."
        dropdown={{
          label: "Group By",
          value: groupBy,
          onChange: onChangeGroupBy,
          options: [
            { value: "assetCategory", label: "Asset Category" },
            { value: "assetSubCategory", label: "Asset Subcategory" },
            { value: "sector", label: "Sector" },
            { value: "industry", label: "Industry" },
          ],
        }}
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
