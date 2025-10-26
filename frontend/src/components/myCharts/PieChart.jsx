import React from "react";
import { PieChart as RePieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = ["#15803d", "#b91c1c"]; // Buy = green, Sell = red

export default function PieChart({ data }) {
  const chartData = [
    { name: "Buy", value: data.filter(t => t["transactionType"] === "Buy").length },
    { name: "Sell", value: data.filter(t => t["transactionType"] === "Sell").length },
  ];

  return (
    <RePieChart width={400} height={300}>
      <Pie
        data={chartData}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={80}
        label
      >
        {chartData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </RePieChart>
  );
}
