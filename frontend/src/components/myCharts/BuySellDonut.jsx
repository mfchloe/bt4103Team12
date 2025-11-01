import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { GREEN, RED } from "../../constants/colors";

export default function BuySellDonut({ counts: { buy, sell } }) {
  const data = [
    { name: "Buy", value: buy },
    { name: "Sell", value: sell },
  ];
  const COLORS = [GREEN, RED];

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <PieChart margin={{ top: 8, right: 8, bottom: 8, lefteft: 8 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="45%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={1.5}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend layout="vertical" align="right" verticalAlign="middle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
