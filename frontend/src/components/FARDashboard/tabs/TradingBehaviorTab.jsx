import { Box, Stack } from "@mui/material";
import { DonutChart } from "../DonutChart";
import { HistogramCard } from "../HistogramCard";
import { ActivityLineChart } from "../ActivityLineChart";
import { CategoryBarCard } from "../CategoryBarCard";
import { ScatterChartCard } from "../ScatterChartCard";

export default function TradingBehaviorTab({
  investorTypeData,
  activityHist,
  activitySeries,
  investmentVsTransactions,
  portfolioDiversification,
  investmentCapacityData,
  explorationHist,
  diversificationScatter,
}) {
  return (
    <Stack spacing={3}>
      {/* Top Row: Investor Type + Investment Capacity */}
      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: 300 }}>
          <DonutChart title="Investor Type Breakdown" data={investorTypeData} />
        </Box>
        {investmentCapacityData?.length > 0 && (
          <Box sx={{ flex: 1, minWidth: 300 }}>
            <CategoryBarCard
              title="Investment Capacity"
              rows={investmentCapacityData}
              onSelect={(label) => console.log("Selected:", label)}
              selected={[]}
            />
          </Box>
        )}
      </Box>

      {/* Other Charts */}
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
      {explorationHist?.bins?.length > 0 && (
        <HistogramCard
          title="Exploration Score Distribution"
          bins={explorationHist.bins}
        />
      )}
      <ScatterChartCard
        title="Diversification vs Concentration"
        data={
          diversificationScatter?.rows?.map((row) => ({
            portfolio_value: row.current_diversification_score,
            avg_transactions_per_month: row.current_portfolio_concentration,
            cluster: row.investor_type, // optional for coloring
          })) || []
        }
      />

      {/* <ScatterChartCard
        title="Investment vs Avg Transactions"
        data={investmentVsTransactions?.rows || []}
      /> */}
    </Stack>
  );
}
