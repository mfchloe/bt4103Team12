import React from "react";

export default function TopSymbolsBar({
  data,
  barColor = "#305D9E",
  altColor = null,
  axisLabel = "",
  valueFormatter = (v) => `$${Math.round(v).toLocaleString()}`,
  valueColWidth = 62,
}) {
  const max = Math.max(1, ...data.map(d => d.value || 0));

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {axisLabel ? <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>{axisLabel}</div> : null}

      {data.map((d, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: `120px 1fr ${valueColWidth}px`,
            gap: 6,
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {d.label}
          </div>

          <div style={{ background: "#eef2ff", height: 8, borderRadius: 999 }}>
            <div
              style={{
                width: `${(d.value / max) * 100}%`,
                height: 8,
                borderRadius: 999,
                background: altColor && i === 1 ? altColor : barColor,
              }}
            />
          </div>

          <div style={{ fontSize: 12, textAlign: "right", width: valueColWidth }}>
            {valueFormatter(d.value)}
          </div>
        </div>
      ))}
    </div>
  );
}