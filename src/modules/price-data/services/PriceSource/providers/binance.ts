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

const KLINES_LIMIT = 1500
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
    const res = await fetch(`${BINANCE_BASE}/api/v3/ticker/price?symbol=BTCUSDT`)
    if (!res.ok) throw new Error(`binance: HTTP ${res.status} ${res.statusText}`)
    const json = (await res.json()) as { symbol?: string; price?: string }
    if (typeof json.price !== 'string') throw new Error('binance: malformed response (price missing)')
    const close = parseFloat(json.price)
    const now = new Date()
    return {
      date: now.toISOString().slice(0, 10),
      timestamp: now.getTime(),
      close, high: close, low: close, open: close,
      volume: null,
      source: 'binance',
      fetchedAt: now,
    }
  },
}
