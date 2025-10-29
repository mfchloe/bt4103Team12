import { Box, Stack } from "@mui/material";
import { DonutChart } from "../DonutChart";
import { HistogramCard } from "../HistogramCard";
import { ActivityLineChart } from "../ActivityLineChart";
import { ScatterChartCard } from "../ScatterChartCard";

export default function TradingBehaviorTab({
  investorTypeData,
  activityHist,
  activitySeries,
  investmentVsTransactions,
  portfolioDiversification,
}) {
  return (
    <Stack spacing={3}>
      <DonutChart title="Investor Type Breakdown" data={investorTypeData} />
      <HistogramCard
        title="Trading Activity Distribution"
        bins={activityHist?.bins || []}
      />
      <ActivityLineChart
        title="Customer Activity over Time"
        rows={activitySeries?.rows}
      />
      <HistogramCard
        title="Portfolio Diversification"
        bins={portfolioDiversification?.bins || []}
      />
      {/* <ScatterChartCard
        title="Investment vs Avg Transactions"
        data={investmentVsTransactions?.rows || []}
      /> */}
    </Stack>
  );
}
