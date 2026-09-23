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
import { PriceDay, SimulationResult } from "./types";
import { money } from "./ComparisonChart";

export function MarketChart({
  path,
  result,
}: {
  path: PriceDay[];
  result?: SimulationResult;
}) {
  // Keep extrema and critical days when reducing large daily series for display.
  const stride = Math.max(1, Math.ceil(path.length / 300));
  const keep = new Set<number>([0, path.length - 1]);
  for (let i = 0; i < path.length; i += stride) {
    const end = Math.min(path.length, i + stride);
    let min = i,
      max = i;
    for (let j = i; j < end; j++) {
      if (path[j].low < path[min].low) min = j;
      if (path[j].high > path[max].high) max = j;
      if (
        result?.journal[j].event.includes("Liquidation") ||
        (result?.journal[j].boughtBtc ?? 0) > 0
      )
        keep.add(j);
    }
    keep.add(i);
    keep.add(min);
    keep.add(max);
  }
  const rows = [...keep]
    .filter((i) => i >= 0 && i < path.length)
    .sort((a, b) => a - b)
    .map((i) => ({
      date: Date.parse(path[i].date + "T00:00:00Z"),
      close: path[i].close,
      low: path[i].low,
      threshold: result?.journal[i].liquidationPrice,
      buy: result?.journal[i].buyThreshold,
      purchase: result?.journal[i].purchasePrice,
    }));
  return (
    <div
      className="fh-market-chart"
      role="img"
      aria-label="Bitcoin-Kurs, Tagestiefs und gegebenenfalls Liquidations- oder Kaufgrenze im Zeitverlauf"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={rows}
          margin={{ top: 12, right: 20, bottom: 8, left: 10 }}
        >
          <CartesianGrid vertical={false} stroke="#e2e5e9" />
          <XAxis
            dataKey="date"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            minTickGap={70}
            tickFormatter={(d) => new Date(d).toISOString().slice(0, 7)}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            width={80}
            tickFormatter={(v) => money(v)}
            tick={{ fontSize: 11 }}
            domain={[0, "auto"]}
          />
          <Tooltip
            formatter={(v: number) => money(v)}
            labelFormatter={(v) =>
              new Date(Number(v)).toISOString().slice(0, 10)
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            dataKey="close"
            name="BTC-Schlusskurs"
            stroke="#3575ac"
            dot={false}
            strokeWidth={1.6}
            isAnimationActive={false}
          />
          <Line
            dataKey="low"
            name="Tagestief"
            stroke="#aab7c4"
            dot={false}
            strokeWidth={1}
            isAnimationActive={false}
          />
          {result &&
            (result.strategy === "loan" || result.strategy === "credit") && (
              <Line
                dataKey="threshold"
                name="Liquidationskurs"
                stroke="#bf3944"
                dot={false}
                strokeWidth={2}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
          {result &&
            (result.strategy === "ath-dca" || result.strategy === "ma-dca") && (
              <Line
                dataKey="buy"
                name="Kaufschwelle (Vortag)"
                stroke="#6b8540"
                dot={false}
                strokeDasharray="4 3"
                isAnimationActive={false}
              />
            )}
          {result && (
            <Line
              dataKey="purchase"
              name="Käufe"
              stroke="transparent"
              dot={{ r: 3, fill: "#e87919", stroke: "#e87919" }}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
