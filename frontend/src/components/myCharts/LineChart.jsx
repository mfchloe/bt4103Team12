import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export default function LineChartTotalValue({ data }) {
  if (!data || !data.length) return <p>No transaction data available.</p>;

  // Aggregate totalValue per date
  const chartData = Object.values(
    data.reduce((acc, t) => {
      if (!t.timestamp) return acc; // skip if timestamp missing

      const date = t.timestamp.split("T")[0]; // extract YYYY-MM-DD
      const value = Number(t.totalValue) || 0; // convert to number safely

      if (!acc[date]) acc[date] = { date, totalValue: 0 };
      acc[date].totalValue += value;

      return acc;
    }, {})
  ).sort((a, b) => new Date(a.date) - new Date(b.date)); // sort by date

  console.log("Aggregated chart data:", chartData);

  return (
    <div>
      <h3 style={{ textAlign: "center" }}>Total Transaction Value per day</h3>
      <LineChart width={700} height={350} data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip
          formatter={(value) => `$${Number(value).toLocaleString()}`}
        />
        <Legend />
        <Line type="monotone" dataKey="totalValue" stroke="#f59e0b" />
      </LineChart>
    </div>
  );
}


