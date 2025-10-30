import { Grid } from "@mui/material";
import { TrendingUp, DollarSign, BarChart3, Activity } from "lucide-react";
import StatCard from "../StatCard";
import { formatCurrency, formatPercentage } from "../../utils/mathHelpers";

const StatsSection = ({ totalValue, totalPL, totalReturn, sharpeRatio }) => {
  return (
    <Grid container spacing={3} sx={styles.container}>
      <Grid item xs={12} md={3} sx={styles.cardGrid}>
        <StatCard
          title="Total Portfolio Value"
          value={formatCurrency(totalValue)}
          icon={DollarSign}
          trend={totalReturn}
        />
      </Grid>

      <Grid item xs={12} md={3} sx={styles.cardGrid}>
        <StatCard
          title="Today's P&L"
          value={formatCurrency(totalPL)}
          icon={TrendingUp}
          trend={totalPL >= 0 ? 2.1 : -2.1}
        />
      </Grid>

      <Grid item xs={12} md={3} sx={styles.cardGrid}>
        <StatCard
          title="Total Return"
          value={formatPercentage(totalReturn, totalReturn >= 0)}
          icon={BarChart3}
          trend={totalReturn}
        />
      </Grid>

      <Grid item xs={12} md={3} sx={styles.cardGrid}>
        <StatCard
          title="Sharpe Ratio"
          value={sharpeRatio.toFixed(2)}
          icon={Activity}
          trend={sharpeRatio >= 0 ? 1 : -1}
        />
      </Grid>
    </Grid>
  );
};

export default StatsSection;

const styles = {
  cardGrid: {
    minWidth: 220,
    maxWidth: 220,
    height: 140,
  },
  container: {
    mb: 6,
  },
};
