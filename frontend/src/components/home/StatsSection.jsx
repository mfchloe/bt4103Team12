import { Grid } from "@mui/material";
import { TrendingUp, DollarSign, BarChart3, Activity } from "lucide-react";
import StatCard from "../StatCard";
import { formatCurrency, formatPercentage } from "../../utils/mathHelpers";

const StatsSection = ({ totalValue, totalPL, totalReturn, sharpeRatio }) => {
  return (
    <Grid container spacing={3} mb={6}>
      <Grid item xs={12} md={3}>
        <StatCard
          title="Total Portfolio Value"
          value={formatCurrency(totalValue)}
          icon={DollarSign}
          trend={totalReturn.toFixed(2)}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <StatCard
          title="Today's P&L"
          value={formatCurrency(totalPL)}
          icon={TrendingUp}
          trend={(totalPL >= 0 ? 2.1 : -2.1).toFixed(2)}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <StatCard
          title="Total Return"
          value={formatPercentage(totalReturn, totalReturn >= 0)}
          icon={BarChart3}
          trend={totalReturn.toFixed(2)}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <StatCard
          title="Sharpe Ratio"
          value={sharpeRatio.toFixed(2)}
          icon={Activity} // Use any icon representing risk/metrics
          trend={(sharpeRatio >= 0 ? 1 : -1).toFixed(2)}
        />
      </Grid>
    </Grid>
  );
};

export default StatsSection;
