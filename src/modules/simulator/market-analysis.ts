import { PriceDay } from "./types";
export function marketMetrics(path: PriceDay[]) {
  if (path.length < 2) return null;
  let peak = path[0].close,
    drawdown = 0,
    sum = 0,
    squares = 0;
  let low = path[0].low,
    high = path[0].high,
    worstDay = 0;
  for (let i = 0; i < path.length; i++) {
    const d = path[i];
    peak = Math.max(peak, d.close);
    drawdown = Math.max(drawdown, 1 - d.close / peak);
    low = Math.min(low, d.low);
    high = Math.max(high, d.high);
    if (i) {
      const r = Math.log(d.close / path[i - 1].close);
      sum += r;
      squares += r * r;
      worstDay = Math.min(worstDay, d.close / path[i - 1].close - 1);
    }
  }
  const n = path.length - 1;
  return {
    end: path.at(-1)!.close,
    cagr: Math.expm1((sum / n) * 365.25),
    volatility: Math.sqrt(Math.max(0, squares / n - (sum / n) ** 2) * 365.25),
    drawdown,
    low,
    high,
    worstDay,
  };
}
