import React from "react";

export default function ChartCard({ title, children, compact = false }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 4px 18px rgba(0,0,0,0.06)",
        padding: compact ? 12 : 16,
        minHeight: compact ? 240 : 320, // ↓ shorter cards in compact mode
      }}
    >
      <h4 style={{ margin: 0, marginBottom: compact ? 8 : 12 }}>{title}</h4>
      {children}
    </div>
  );
}
