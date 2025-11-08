import React from "react";
import {
  LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend, ResponsiveContainer
} from "recharts";

export default function CashflowLine({ series, label = "value" }) {
  const data = (series || []).map(d => ({ date: `${d.month}-01`, value: d.value }));
  if (!data.length) return <p>No data.</p>;

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
          <Legend formatter={() => label} />
          <Line type="monotone" dataKey="value" stroke="#2563eb" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}