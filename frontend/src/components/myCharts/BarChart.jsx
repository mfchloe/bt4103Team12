import React from "react";
import { BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

export default function BarChart({ data }) {
  // Count occurrences of each marketID
  const chartData = Object.values(
    data.reduce((acc, curr) => {
      const key = curr.marketID;
      if (!acc[key]) acc[key] = { marketID: key, count: 0 };
      acc[key].count += 1; // just increment count
      return acc;
    }, {})
  );

  return (
    <div>
      <h3 style={{ textAlign: "center" }}>Number of Transactions per Market</h3>
      <ReBarChart width={600} height={300} data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="marketID" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" fill="#2563eb" />
      </ReBarChart>
    </div>
  );
}
