"use client";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SimulationResult, STRATEGIES } from "./types";
export const money = (n: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
export default function ComparisonChart({
  results,
  real,
}: {
  results: SimulationResult[];
  real: boolean;
}) {
  const rows = results[0]?.journal ?? [];
  const cadence = Math.max(1, Math.floor(rows.length / 160));
  const data = rows.flatMap((r, i) =>
    i % cadence === 0 || i === rows.length - 1
      ? [
          {
            date: r.date,
            ...Object.fromEntries(
              results.map((s) => [
                s.strategy,
                real ? s.journal[i].realNetWorth : s.journal[i].netWorth,
              ]),
            ),
          },
        ]
      : [],
  );
  return (
    <div
      className="fh-chart"
      role="img"
      aria-label="Nettogesamtvermögen der ausgewählten Strategien im Zeitverlauf. Exakte Endwerte stehen in der Vergleichstabelle."
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 15, right: 14, bottom: 5, left: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 5"
            vertical={false}
            stroke="#e2e8f0"
          />
          <XAxis
            dataKey="date"
            minTickGap={65}
            tickFormatter={(d) => d.slice(0, 7)}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#64748b" }}
          />
          <YAxis
            width={70}
            tickFormatter={(v) =>
              Math.abs(v) >= 1e6
                ? `${(v / 1e6).toFixed(1)} Mio.`
                : `${Math.round(v / 1000)} Tsd.`
            }
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#64748b" }}
          />
          <Tooltip
            formatter={(value: number) => money(value)}
            labelFormatter={(v) => String(v)}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 15 }} />
          {results.map((r) => (
            <Line
              key={r.strategy}
              type="linear"
              dataKey={r.strategy}
              name={STRATEGIES.find((s) => s.id === r.strategy)!.name}
              stroke={STRATEGIES.find((s) => s.id === r.strategy)!.color}
              strokeWidth={2.3}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
