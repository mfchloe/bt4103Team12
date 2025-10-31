import { useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Typography,
  Slider,
  Alert,
  Paper,
} from "@mui/material";

const INVESTOR_TYPES = [
  {
    value: "active_trader",
    label: "Active Trader",
    description: "Frequent trading, short-term positions",
  },
  {
    value: "moderate_trader",
    label: "Moderate Trader",
    description: "Occasional trades, medium-term holds",
  },
  {
    value: "buy_and_hold",
    label: "Buy & Hold",
    description: "Long-term investments, minimal trading",
  },
];

const CUSTOMER_TYPES = [
  {
    value: "mass",
    label: "Mass User",
    description: "Standard investment approach",
  },
  {
    value: "premium",
    label: "Premium User",
    description: "Focus on higher-value stocks",
  },
];

const RISK_LEVELS = [
  {
    value: "income",
    label: "Income",
    description: "Focus on steady returns and dividends",
    color: "#4caf50",
  },
  {
    value: "conservative",
    label: "Conservative",
    description: "Lower risk, capital preservation",
    color: "#8bc34a",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Mix of growth and stability",
    color: "#ff9800",
  },
  {
    value: "aggressive",
    label: "Aggressive",
    description: "Higher risk, growth-focused",
    color: "#f44336",
  },
];

const CAPACITY = [
  { value: "CAP_LT30K", label: "< $30k", description: "Getting started" },
  {
    value: "CAP_30K_80K",
    label: "$30k – $80k",
    description: "Building wealth",
  },
  {
    value: "CAP_80K_300K",
    label: "$80k – $300k",
    description: "Growing portfolio",
  },
  {
    value: "CAP_GT300K",
    label: "≥ $300k",
    description: "Established investor",
  },
];

export default function UserProfileDialog({ open, onClose, onSave, initial }) {
  const [investorType, setInvestorType] = useState(initial?.investorType || "");
  const [customerType, setCustomerType] = useState(initial?.customerType || "");
  const [riskLevel, setRiskLevel] = useState(initial?.riskLevel || "");
  const [divScore, setDivScore] = useState(
    typeof initial?.diversificationScore === "number"
      ? initial.diversificationScore
      : 0.5
  );
  const [capacity, setCapacity] = useState(initial?.investmentCapacity || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isValid = useMemo(
    () =>
      investorType &&
      customerType &&
      riskLevel &&
      capacity &&
      typeof divScore === "number" &&
      divScore >= 0 &&
      divScore <= 1,
    [investorType, customerType, riskLevel, capacity, divScore]
  );

  const handleSave = async () => {
    if (!isValid) return;
    try {
      setSaving(true);
      setError(null);
      await onSave({
        investorType,
        customerType,
        riskLevel,
        diversificationScore: Number(divScore),
        investmentCapacity: capacity,
      });
      onClose();
    } catch (e) {
      setError(e?.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        <Typography variant="h5" fontWeight={600}>
          Complete Your Investor Profile
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
          Help us personalize your experience with recommendations tailored to
          your goals. You can update this anytime in settings.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "grid", gap: 3 }}>
          {/* Trading Style Section */}
          <Paper
            elevation={0}
            sx={{ p: 2.5, bgcolor: "grey.50", borderRadius: 2 }}
          >
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Trading Style
            </Typography>

            <FormControl fullWidth>
              <InputLabel id="investorType-label">
                How often do you trade?
              </InputLabel>
              <Select
                labelId="investorType-label"
                label="How often do you trade?"
                value={investorType}
                onChange={(e) => setInvestorType(e.target.value)}
              >
                {INVESTOR_TYPES.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    <Box>
                      <Typography variant="body1">{opt.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {opt.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>

          {/* Risk & Strategy Section */}
          <Paper
            elevation={0}
            sx={{ p: 2.5, bgcolor: "grey.50", borderRadius: 2 }}
          >
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Risk & Strategy
            </Typography>

            <Box sx={{ display: "grid", gap: 2.5 }}>
              <FormControl fullWidth>
                <InputLabel id="riskLevel-label">
                  What's your risk tolerance?
                </InputLabel>
                <Select
                  labelId="riskLevel-label"
                  label="What's your risk tolerance?"
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value)}
                >
                  {RISK_LEVELS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          width: "100%",
                        }}
                      >
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            bgcolor: opt.color,
                            flexShrink: 0,
                          }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1">{opt.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {opt.description}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box>
                <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
                  Portfolio diversification preference
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 1.5 }}
                >
                  Would you prefer to concentrate in fewer investments or spread
                  across many?
                </Typography>
                <Slider
                  value={divScore}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(_, v) => setDivScore(v)}
                  marks={[
                    { value: 0, label: "Focused" },
                    { value: 0.5, label: "Balanced" },
                    { value: 1, label: "Diversified" },
                  ]}
                  sx={{
                    mx: "auto",
                    "& .MuiSlider-markLabel": {
                      fontSize: "0.7rem",
                      color: "text.secondary",
                    },
                  }}
                />
              </Box>
            </Box>
          </Paper>

          {/* Account & Capacity Section */}
          <Paper
            elevation={0}
            sx={{ p: 2.5, bgcolor: "grey.50", borderRadius: 2 }}
          >
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Account Details
            </Typography>

            <Box sx={{ display: "grid", gap: 2.5 }}>
              <FormControl fullWidth>
                <InputLabel id="capacity-label">Investment capacity</InputLabel>
                <Select
                  labelId="capacity-label"
                  label="Investment capacity"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                >
                  {CAPACITY.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      <Box>
                        <Typography variant="body1">{opt.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {opt.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="customerType-label">
                  How do you see yourself?
                </InputLabel>
                <Select
                  labelId="customerType-label"
                  label="How do you see yourself?"
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value)}
                >
                  {CUSTOMER_TYPES.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      <Box>
                        <Typography variant="body1">{opt.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {opt.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 3 }}>
        <Button onClick={onClose} disabled={saving} size="large">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!isValid || saving}
          variant="contained"
          size="large"
        >
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
