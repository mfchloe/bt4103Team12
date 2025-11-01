import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { useAuth } from "../../context/AuthContext.jsx";
import { apiBaseUrl } from "../../api/httpClient.js";

import ChartCard from "../myCharts/ChartCard.jsx";
import BuySellDonut from "../myCharts/BuySellDonut.jsx";
import CashflowLine from "../myCharts/CashflowLine.jsx";
import TopSymbolsBar from "../myCharts/TopSymbolsBar.jsx";
import { GREEN, RED } from "../../constants/colors.js";

const MIN_TX = 5; // threshold: Min transactions to unlock My Charts feature

function yyyymm(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function topN(rows, labelKey, valueFn, n = 5) {
  const acc = rows.reduce((m, r) => {
    const k = r[labelKey] || r.ISIN;
    if (!k) return m;
    m.set(k, (m.get(k) || 0) + (valueFn(r) || 0));
    return m;
  }, new Map());
  return Array.from(acc, ([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

export default function MyCharts() {
  const { isFirebaseUser, isFarCustomer, farCustomerSession } = useAuth();
  const [tx, setTx] = useState([]);
  const [assetsMap, setAssetsMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [assetErr, setAssetErr] = useState(null);

  // toggles
  const [flowMetric, setFlowMetric] = useState("spend"); // toggle between spend/net
  const [topMetric, setTopMetric] = useState("value"); // toggle between value/shares

  // Load FAR transactions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isFarCustomer || !farCustomerSession?.customerId) {
        if (!cancelled) {
          setTx([]);
          setLoading(false);
        }
        return;
      }
      try {
        setLoading(true);
        const res = await fetch(
          `${apiBaseUrl}/api/far/transactions/${farCustomerSession.customerId}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const items = Array.isArray(json.items) ? json.items : [];

        // Normalize fields
        const normalized = items.map((t) => ({
          ...t,
          transactionType: t.transactionType ?? t.buy_sell ?? t.category ?? "",
          marketID: t.marketID ?? t.market ?? t.exchange ?? "UNKNOWN",
          timestamp: t.timestamp ?? t.date ?? t.trade_date ?? "",
          totalValue: Number(
            t.totalValue ??
              t.total ??
              t.amount ??
              (t.price && t.shares ? t.price * t.shares : 0)
          ),
          units: Number(t.units ?? t.shares ?? 0),
          ISIN: t.ISIN,
        }));

        if (!cancelled) setTx(normalized);
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setTx([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isFarCustomer, farCustomerSession]);

  // Load assets CSV (data for charts)
  useEffect(() => {
    let cancelled = false;
    Papa.parse("/asset_information.csv", {
      download: true,
      header: true,
      complete: (res) => {
        if (cancelled) return;
        const map = new Map(
          (res.data || [])
            .filter((r) => r.ISIN)
            .map((r) => [String(r.ISIN).trim(), r])
        );
        setAssetsMap(map);
      },
      error: (err) => {
        if (!cancelled) setAssetErr(err);
      },
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fill rows with asset info
  const rows = useMemo(() => {
    if (!tx.length) return [];
    return tx.map((t) => {
      const a = t.ISIN ? assetsMap.get(String(t.ISIN).trim()) || {} : {};
      return {
        ...t,
        assetCategory: a.assetCategory || null,
        assetSubCategory: a.assetSubCategory || null,
        marketID: t.marketID || a.marketID || "UNKNOWN",
        assetShortName: a.assetShortName || a.assetName || t.stock || t.ISIN,
      };
    });
  }, [tx, assetsMap]);

  // UI gates
  if (!isFarCustomer && isFirebaseUser)
    return (
      <p style={{ padding: "2rem" }}>
        You don’t have any past transactions yet.
      </p>
    );
  if (loading) return <p style={{ padding: "2rem" }}>Loading charts...</p>;
  if (!rows.length)
    return (
      <p style={{ padding: "2rem" }}>No transactions found for your account.</p>
    );

  // Derived datasets
  const buys = rows.filter(
    (r) => String(r.transactionType).toLowerCase() === "buy"
  );
  const sells = rows.filter(
    (r) => String(r.transactionType).toLowerCase() === "sell"
  );
  const buyValue = buys.reduce((s, r) => s + (r.totalValue || 0), 0);
  const sellValue = sells.reduce((s, r) => s + (r.totalValue || 0), 0);

  // Monthly aggregates (guard invalid dates)
  const monthlyAgg = rows.reduce((m, r) => {
    const bucket = yyyymm(r.timestamp);
    if (!bucket) return m;
    const v = r.totalValue || 0;
    const isBuy = String(r.transactionType).toLowerCase() === "buy";
    const cur = m.get(bucket) || { buy: 0, sell: 0 };
    if (isBuy) cur.buy += v;
    else cur.sell += v;
    m.set(bucket, cur);
    return m;
  }, new Map());

  const monthlySpendSeries = Array.from(monthlyAgg.entries())
    .map(([month, { buy }]) => ({ month, value: buy }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const monthlyNetSeries = Array.from(monthlyAgg.entries())
    .map(([month, { buy, sell }]) => ({ month, value: buy - sell }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Top-5 datasets (now one-liners via topN)
  const topByValue = topN(buys, "assetShortName", (r) => r.totalValue);
  const topByShares = topN(buys, "assetShortName", (r) => r.units);

  const flowSeries =
    flowMetric === "net" ? monthlyNetSeries : monthlySpendSeries;
  const flowTitle =
    flowMetric === "net"
      ? "Net Investment Amount ($)"
      : "Investment Spending ($)";
  const flowLabel = flowMetric === "net" ? "Buy - Sell ($)" : "Buy ($)";

  const topData = topMetric === "shares" ? topByShares : topByValue;
  const topAxisLabel =
    topMetric === "shares" ? "Number of Shares" : "Amount Spent ($)";
  const topValueFormat =
    topMetric === "shares"
      ? (v) => `${Math.round(v).toLocaleString()}`
      : (v) => `$${Math.round(v).toLocaleString()}`;

  return (
    <div>
      {assetErr && (
        <p style={{ color: "#a00" }}>Failed to load Asset metadata.</p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
          gap: 12,
          marginTop: 12,
        }}
      >
        {/* Monthly Investment Spend/Net */}
        <ChartCard title={flowTitle} compact>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button
              onClick={() => setFlowMetric("spend")}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: flowMetric === "spend" ? "#e5e7eb" : "#fff",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Spend ($)
            </button>
            <button
              onClick={() => setFlowMetric("net")}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: flowMetric === "net" ? "#e5e7eb" : "#fff",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Net ($)
            </button>
          </div>
          <CashflowLine series={flowSeries} label={flowLabel} />
        </ChartCard>

        {/* Top 5 stocks with metric toggle */}
        <ChartCard title="My Top 5 Stocks" compact>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button
              onClick={() => setTopMetric("value")}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: topMetric === "value" ? "#e5e7eb" : "#fff",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Value ($)
            </button>
            <button
              onClick={() => setTopMetric("shares")}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: topMetric === "shares" ? "#e5e7eb" : "#fff",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Shares
            </button>
          </div>

          <TopSymbolsBar
            data={topData}
            axisLabel={topAxisLabel}
            valueFormatter={topValueFormat}
          />
        </ChartCard>

        {/* Buy/Sell split */}
        <ChartCard title="Buy vs Sell Counts" compact>
          <BuySellDonut counts={{ buy: buys.length, sell: sells.length }} />
        </ChartCard>

        <ChartCard title="Buy vs Sell Amount ($)" compact>
          <TopSymbolsBar
            data={[
              { label: "Buy", value: Math.round(buyValue) },
              { label: "Sell", value: Math.round(sellValue) },
            ]}
            barColor={GREEN}
            altColor={RED}
            axisLabel="Total Amount ($)"
          />
        </ChartCard>
      </div>
    </div>
  );
}
