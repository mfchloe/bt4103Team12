export const INVESTOR_TYPES = [
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

export const CUSTOMER_TYPES = [
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

export const RISK_LEVELS = [
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

export const CAPACITY = [
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
