// src/modules/price-data/services/PriceSource/providers/binance.ts
import type { PriceProvider, NormalizedPricePoint, DailyOHLC } from '../types'

const BINANCE_BASE = 'https://api.binance.com'

/**
 * Parse a Binance Klines response (array of 12-element arrays) into DailyOHLC[].
 * Coerces string-typed numerics (Binance returns prices as strings).
 * Pure function — no fetching.
 */
export function parseKlinesResponse(klines: unknown[]): DailyOHLC[] {
  if (!Array.isArray(klines)) {
    throw new Error('binance: klines response is not an array')
  }
  return klines.map((row) => {
    if (!Array.isArray(row) || row.length < 6) {
      throw new Error('binance: malformed kline row (expected 12-tuple)')
    }
    const [openTime, open, high, low, close, volume] = row as [number, string, string, string, string, string]
    return {
      date: new Date(openTime).toISOString().slice(0, 10),
      openTime,
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      volume: parseFloat(volume),
    }
  })
}

const KLINES_LIMIT = 1000  // Binance silently caps spot klines at 1000 even when limit=1500 is requested
const ONE_DAY_MS = 86_400_000

/**
 * Paginate Binance Klines (interval=1d) for [from, to] inclusive.
 * Pagination terminates when a page returns fewer rows than KLINES_LIMIT.
 * The fetch impl is injected so tests can mock it; defaults to globalThis.fetch.
 */
export async function fetchHistoricalKlines(
  from: Date,
  to: Date,
  fetchImpl: typeof fetch = fetch,
): Promise<DailyOHLC[]> {
  const all: DailyOHLC[] = []
  let cursor = from.getTime()
  const endMs = to.getTime()

  while (cursor <= endMs) {
    const url =
      `${BINANCE_BASE}/api/v3/klines?symbol=BTCUSDT&interval=1d` +
      `&startTime=${cursor}&endTime=${endMs}&limit=${KLINES_LIMIT}`
    const res = await fetchImpl(url)
    if (!res.ok) throw new Error(`binance klines: HTTP ${res.status} ${res.statusText}`)
    const json = (await res.json()) as unknown[]
    const page = parseKlinesResponse(json)
    if (page.length === 0) break
    all.push(...page)
    if (page.length < KLINES_LIMIT) break
    cursor = page[page.length - 1].openTime + ONE_DAY_MS
  }
  return all
}

export const binance: PriceProvider = {
  name: 'binance',
  async fetchCurrent(): Promise<NormalizedPricePoint> {
    const res = await fetch(`${BINANCE_BASE}/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=1`)
    if (!res.ok) throw new Error(`binance: HTTP ${res.status} ${res.statusText}`)
    const json = (await res.json()) as unknown
    const parsed = parseKlinesResponse(json as unknown[])
    if (parsed.length === 0) throw new Error('binance: empty klines response')
    const k = parsed[0]
    const now = new Date()
    return {
      date: k.date,
      timestamp: k.openTime,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume,
      source: 'binance',
      fetchedAt: now,
    }
  },
}
