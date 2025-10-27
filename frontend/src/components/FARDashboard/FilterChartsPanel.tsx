import { Box, Typography, Paper, Stack, Chip, Slider } from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import { DonutChart } from "./DonutChart";
import { CategoryBarCard } from "./CategoryBarCard";

interface FilterChartsPanelProps {
  filters: any;
  setFilters: (filters: any) => void;
  resetFilters: () => void;
  data: {
    customerType?: any[];
    riskLevels?: any[];
    investorType?: any[];
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

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        width: "100%",
        height: "auto",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2.5,
          bgcolor: "primary.main",
          color: "white",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <FilterListIcon />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              Filter Dashboard
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Click charts to filter data
            </Typography>
          </Box>
          {activeFiltersCount > 0 && (
            <Chip
              label={`${activeFiltersCount} active`}
              size="small"
              sx={{
                bgcolor: "white",
                color: "primary.main",
                fontWeight: 600,
              }}
            />
          )}
        </Stack>
      </Box>

      {/* Horizontal Filters */}
      <Box
        sx={{
          display: "flex",
          gap: 3,
          flexWrap: "wrap", // Wrap on smaller screens
          p: 2.5,
          bgcolor: "primary.main",
        }}
      >
        {/* Customer Type */}
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <DonutChart
            title="Customer Type"
            data={data.customerType || []}
            onSelect={(val) => toggleFilterValue("customer_type", val)}
            selected={filters.customer_type}
          />
        </Box>

        {/* Risk Level */}
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <CategoryBarCard
            title="Risk Level"
            rows={data.riskLevels || []}
            onSelect={(val) => toggleFilterValue("risk_level", val)}
            selected={filters.risk_level}
          />
        </Box>

        {/* Investment Capacity */}
        <Box sx={{ flex: 1, minWidth: 250 }}>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            gutterBottom
            color="white"
          >
            Investment Capacity (€)
          </Typography>
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
            sx={{
              color: "white", // <-- makes the track, thumb, and labels white
              "& .MuiSlider-thumb": {
                borderColor: "white",
              },
              "& .MuiSlider-valueLabel": {
                color: "white",
                bgcolor: "primary.main", // optional, background of label
              },
            }}
          />

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
            <Typography variant="caption" color="white">
              €{(filters.investmentCapacity?.minimum ?? 0).toLocaleString()}
            </Typography>
            <Typography variant="caption" color="white">
              €
              {(filters.investmentCapacity?.maximum ?? 300000).toLocaleString()}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};
