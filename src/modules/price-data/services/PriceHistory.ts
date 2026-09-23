import { fetchHistoricalKlines } from "./PriceSource/providers/binance";
import type { NormalizedPricePoint } from "./PriceSource/types";

/** BTC/USDT exchange candles, used as a USD proxy (disclosed in methodology). */
export async function fetchHistoricalWithOHLC(
  from: string,
  to: string,
  fetchImpl: typeof fetch = fetch,
): Promise<NormalizedPricePoint[]> {
  const boundedFetch: typeof fetch = (url, options) =>
    fetchImpl(url, { ...options, signal: AbortSignal.timeout(15000) });
  const rows = await fetchHistoricalKlines(
    new Date(`${from}T00:00:00Z`),
    new Date(`${to}T23:59:59.999Z`),
    boundedFetch,
  );
  const fetchedAt = new Date();
  return rows.map((r) => ({
    date: r.date,
    timestamp: r.openTime,
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
    volume: r.volume,
    source: "binance",
    fetchedAt,
  }));
}
