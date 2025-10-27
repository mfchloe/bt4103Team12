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
} from "@mui/material";

const INVESTOR_TYPES = ["active_trader", "moderate_trader", "buy_and_hold"];
const CUSTOMER_TYPES = ["mass", "premium"];
const RISK_LEVELS = ["income", "balanced", "conservative", "aggressive"];
const CAPACITY = ["CAP_LT30K", "CAP_30K_80K", "CAP_80K_300K", "CAP_GT300K"];

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
      maxWidth="sm"
    >
      <DialogTitle>Complete your investor profile</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
          We’ll use this once to personalize recommendations. You can change it
          later in settings.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "grid", gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="investorType-label">Investor Type</InputLabel>
            <Select
              labelId="investorType-label"
              label="Investor Type"
              value={investorType}
              onChange={(e) => setInvestorType(e.target.value)}
            >
              {INVESTOR_TYPES.map((v) => (
                <MenuItem key={v} value={v}>
                  {v}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="customerType-label">Customer Type</InputLabel>
            <Select
              labelId="customerType-label"
              label="Customer Type"
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value)}
            >
              {CUSTOMER_TYPES.map((v) => (
                <MenuItem key={v} value={v}>
                  {v}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="riskLevel-label">Risk Level</InputLabel>
            <Select
              labelId="riskLevel-label"
              label="Risk Level"
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
            >
              {RISK_LEVELS.map((v) => (
                <MenuItem key={v} value={v}>
                  {v}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box>
            <Typography gutterBottom>
              Diversification Score: {divScore.toFixed(2)}
            </Typography>
            <Slider
              value={divScore}
              min={0}
              max={1}
              step={0.01}
              onChange={(_, v) => setDivScore(v)}
              valueLabelDisplay="auto"
            />
          </Box>

          <FormControl fullWidth>
            <InputLabel id="capacity-label">Investment Capacity</InputLabel>
            <Select
              labelId="capacity-label"
              label="Investment Capacity"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            >
              {CAPACITY.map((v) => (
                <MenuItem key={v} value={v}>
                  {v}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!isValid || saving}
          variant="contained"
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
