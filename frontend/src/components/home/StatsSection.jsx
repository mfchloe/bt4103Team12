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
        />
      </Grid>

      <Grid item xs={12} md={3} sx={styles.cardGrid}>
        <StatCard
          title="Profit and Loss"
          value={formatCurrency(totalPL)}
          icon={TrendingUp}
        />
      </Grid>

      <Grid item xs={12} md={3} sx={styles.cardGrid}>
        <StatCard
          title="Total Return"
          value={formatPercentage(totalReturn, totalReturn >= 0)}
          icon={BarChart3}
        />
      </Grid>

      <Grid item xs={12} md={3} sx={styles.cardGrid}>
        <StatCard
          title="Sharpe Ratio"
          value={sharpeRatio.toFixed(2)}
          icon={Activity}
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
