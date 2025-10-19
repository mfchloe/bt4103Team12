import {
  Card,
  CardContent,
  CardHeader,
  Box,
  Typography,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Slider,
  TextField,
  Button,
  Select,
  MenuItem,
  Divider,
  InputLabel,
  FormControl,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

interface FilterSidebarProps {
  filters: any;
  setFilters: (filters: any) => void;
  onReset: () => void;
}

export const FilterSidebar = ({
  filters,
  setFilters,
  onReset,
}: FilterSidebarProps) => {
  const toggleFromSet = (key: string, val: string) => {
    setFilters((f: any) => {
      const next = new Set(f[key] || []);
      next.has(val) ? next.delete(val) : next.add(val);
      return { ...f, [key]: Array.from(next) };
    });
  };

  return (
    <Card
      sx={{
        position: "sticky",
        top: 24,
        maxHeight: "calc(100vh - 48px)",
        overflow: "auto",
      }}
    >
      <CardHeader
        avatar={<FilterListIcon color="primary" />}
        title={
          <Typography variant="h6" fontWeight={700}>
            Filters
          </Typography>
        }
        subheader={
          <Typography variant="caption" color="text.secondary">
            Analyze by customer profile
          </Typography>
        }
        sx={{ pb: 1 }}
      />
      <CardContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Customer Type
            </Typography>
            <FormGroup>
              {["Mass", "Premium"].map((type) => (
                <FormControlLabel
                  key={type}
                  control={
                    <Checkbox
                      checked={(filters.customer_type || []).includes(type)}
                      onChange={() => toggleFromSet("customer_type", type)}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">{type}</Typography>}
                />
              ))}
            </FormGroup>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Investor Type
            </Typography>
            <FormGroup>
              {["buy_and_hold", "moderate_trader", "active_trader"].map(
                (type) => {
                  const displayLabel = type
                    .split("_")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ");

                  return (
                    <FormControlLabel
                      key={type}
                      control={
                        <Checkbox
                          checked={(filters.investor_type || []).includes(type)}
                          onChange={() => toggleFromSet("investor_type", type)}
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2">{displayLabel}</Typography>
                      }
                    />
                  );
                }
              )}
            </FormGroup>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Risk Level
            </Typography>
            <FormGroup>
              {["Conservative", "Balanced", "Aggressive", "Income"].map(
                (risk) => (
                  <FormControlLabel
                    key={risk}
                    control={
                      <Checkbox
                        checked={(filters.risk_level || []).includes(risk)}
                        onChange={() => toggleFromSet("risk_level", risk)}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">{risk}</Typography>}
                  />
                )
              )}
            </FormGroup>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Investment Capacity (€)
            </Typography>
            <Box sx={{ px: 1, pt: 2 }}>
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
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}
              >
                <Typography variant="caption" color="text.secondary">
                  €{(filters.investmentCapacity?.minimum ?? 0).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  €
                  {(
                    filters.investmentCapacity?.maximum ?? 300000
                  ).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Divider />

          <Box>
            <FormControl fullWidth size="small">
              <InputLabel>Sector</InputLabel>
              <Select
                value={(filters.sectors && filters.sectors[0]) || "all"}
                label="Sector"
                onChange={(e) =>
                  setFilters((f: any) => ({
                    ...f,
                    sectors: e.target.value === "all" ? [] : [e.target.value],
                  }))
                }
              >
                <MenuItem value="all">All Sectors</MenuItem>
                {[
                  "Technology",
                  "Finance",
                  "Healthcare",
                  "Energy",
                  "Utilities",
                ].map((sector) => (
                  <MenuItem key={sector} value={sector}>
                    {sector}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Divider />

          <Box>
            <TextField
              fullWidth
              size="small"
              label="Search"
              placeholder="Search customers/assets..."
              value={filters.search_query || ""}
              onChange={(e) =>
                setFilters((f: any) => ({ ...f, search_query: e.target.value }))
              }
            />
          </Box>

          <Button
            variant="outlined"
            fullWidth
            startIcon={<RestartAltIcon />}
            onClick={onReset}
          >
            Reset Filters
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
