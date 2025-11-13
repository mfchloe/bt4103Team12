import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  Slider,
  Divider,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import ShieldIcon from "@mui/icons-material/Shield";
import EuroIcon from "@mui/icons-material/Euro";
import TuneIcon from "@mui/icons-material/Tune";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { DonutChart } from "./DonutChart";
import { CategoryBarCard } from "./CategoryBarCard";

// to present the actual cluster names instead of numbers
const clusterMap: Record<number, string> = {
  0: "Whales",
  1: "Cores",
  2: "Browsers",
};

interface FilterChartsPanelProps {
  filters: any;
  setFilters: (filters: any) => void;
  resetFilters: () => void;
  data: {
    customerType?: { label: string; value: number }[];
    riskLevels?: any[];
    clusterCounts?: Record<string, number>;
  };
}

export const FilterChartsPanel = ({
  filters,
  setFilters,
  resetFilters,
  data,
}: FilterChartsPanelProps) => {
  const toggleFilterValue = (key: string, value: string) => {
    setFilters((prev: any) => {
      const current = prev[key] || [];
      const updated = current.includes(value)
        ? current.filter((v: string) => v !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  const activeFiltersCount = Object.values(filters).filter(
    (val: any) => Array.isArray(val) && val.length > 0
  ).length;

  const hasClusterSelection = filters.cluster?.length > 0;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        width: "100%",
        p: 3,
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{
          mb: 3,
          borderBottom: "1px solid",
          borderColor: "divider",
          pb: 1.5,
        }}
      >
        <FilterListIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={600}>
            Filter Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click on charts or adjust sliders to refine your view.
          </Typography>
        </Box>
        {activeFiltersCount > 0 && (
          <Chip
            label={`${activeFiltersCount} active`}
            size="small"
            color="primary"
            sx={{ fontWeight: 600 }}
          />
        )}
      </Stack>

      {/* CLUSTER FILTER */}
      {data.clusterCounts && (
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <GroupWorkIcon fontSize="small" color="action" />
            <Typography variant="subtitle1" fontWeight={600}>
              Step 1: Select Clusters
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Start by selecting one or more clusters. The remaining filters below
            will update based on your cluster choices.
          </Typography>

          <DonutChart
            title=""
            data={Object.entries(data.clusterCounts).map(([key, value]) => ({
              label: clusterMap[Number(key)] ?? key, // display mapped label
              value: Number(value),
            }))}
            onSelect={(label) => {
              // convert back to numeric key for internal filter state
              const clusterKey = Object.entries(clusterMap).find(
                ([, v]) => v === label
              )?.[0];
              if (clusterKey !== undefined) {
                toggleFilterValue("cluster", clusterKey);
              }
            }}
            selected={
              filters.cluster?.map(
                (c: string | number) => clusterMap[Number(c)]
              ) ?? []
            }
          />

          {/* Instructional hint */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="center"
            spacing={1}
            sx={{ mt: 3, mb: 1, opacity: hasClusterSelection ? 1 : 0.7 }}
          >
            <ArrowDownwardIcon
              sx={{
                fontSize: 22,
                color: hasClusterSelection ? "primary.main" : "text.disabled",
              }}
            />
            <Typography
              variant="body2"
              color={hasClusterSelection ? "text.primary" : "text.disabled"}
              fontWeight={500}
            >
              {hasClusterSelection
                ? "Now refining other filters by selected clusters"
                : "Other filters below will be refined by cluster selection"}
            </Typography>
          </Stack>

          <Divider sx={{ mt: 2 }} />
        </Box>
      )}

      {/* OTHER FILTERS */}
      <Box>
        {/* Customer Type */}
        {data.customerType && (
          <Box sx={{ mb: 4 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 1 }}
            >
              <PeopleAltIcon fontSize="small" color="action" />
              <Typography variant="subtitle1" fontWeight={600}>
                Filter by Customer Type
              </Typography>
            </Stack>
            <DonutChart
              title=""
              data={data.customerType}
              onSelect={(val) => toggleFilterValue("customer_type", val)}
              selected={filters.customer_type}
            />
          </Box>
        )}

        {/* Risk Level */}
        {data.riskLevels && (
          <Box sx={{ mb: 4 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 1 }}
            >
              <ShieldIcon fontSize="small" color="action" />
              <Typography variant="subtitle1" fontWeight={600}>
                Risk Level
              </Typography>
            </Stack>
            <CategoryBarCard
              title=""
              rows={data.riskLevels}
              onSelect={(val) => toggleFilterValue("risk_level", val)}
              selected={filters.risk_level}
            />
          </Box>
        )}

        {/* Investment Capacity */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <EuroIcon fontSize="small" color="action" />
            <Typography variant="subtitle1" fontWeight={600}>
              Set Investment Capacity (€)
            </Typography>
          </Stack>
          <Slider
            value={[
              filters.investmentCapacity?.minimum ?? 0,
              filters.investmentCapacity?.maximum ?? 300000,
            ]}
            min={0}
            max={300000}
            step={1000}
            onChange={(_, v) =>
              setFilters((f: any) => ({
                ...f,
                investmentCapacity: {
                  minimum: (v as number[])[0],
                  maximum: (v as number[])[1],
                },
              }))
            }
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `€${value.toLocaleString()}`}
          />
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              €{(filters.investmentCapacity?.minimum ?? 0).toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              €
              {(filters.investmentCapacity?.maximum ?? 300000).toLocaleString()}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};
