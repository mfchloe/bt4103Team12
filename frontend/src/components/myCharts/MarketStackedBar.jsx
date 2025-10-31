import React from "react";
import {
  BarChart as ReBarChart, Bar, XAxis, YAxis,
  Tooltip, Legend, CartesianGrid, ResponsiveContainer
} from "recharts";

export default function MarketStackedBar({ data }) {
  // expects: [{ marketID, Buy, Sell }]
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <ReBarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="marketID" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="Buy"  stackId="a" fill="#15803d" barSize={22} />
          <Bar dataKey="Sell" stackId="a" fill="#b91c1c" barSize={22} />
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
}