import { Card, CardContent, CardHeader, Typography, Box } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

interface CategoryBarCardProps {
  title: string;
  rows?: Array<{ label: string; value: number }>;
  onSelect?: (label: string) => void; // make clickable
  selected?: string[]; // new
}

export const CategoryBarCard = ({ title, rows, onSelect, selected = [] }: CategoryBarCardProps) => {
  const data = (rows || []).map((r) => ({ name: r.label, value: r.value }));

  return (
    <Card sx={{ transition: "all 0.3s", "&:hover": { boxShadow: 3 } }}>
      <CardHeader
        title={<Typography variant="h6" fontWeight={600}>{title}</Typography>}
      />
      <CardContent>
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} height={60} tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar
                dataKey="value"
                radius={[4, 4, 0, 0]}
                onClick={(d) => onSelect?.(d?.name ?? "")}

              >
                {data.map((entry) => {
                  const isSelected = selected.includes(entry.name);
                  return (
                    <Cell
                      key={entry.name}
                      fill={isSelected ? "#1976d2" : "#90caf9"} // selected vs default
                      cursor={onSelect ? "pointer" : "default"}
                      opacity={selected.length > 0 && !isSelected ? 0.4 : 1}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};
