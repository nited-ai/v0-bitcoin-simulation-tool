import { describe, it, expect } from 'vitest'
import { parseKlinesResponse } from '../binance'

describe('parseKlinesResponse', () => {
  // Binance kline = [openTime, open, high, low, close, volume, closeTime, ...]
  const sampleKline = [
    1502928000000,             // openTime: 2017-08-17T00:00:00Z (ms)
    '4261.48000000',           // open
    '4485.39000000',           // high
    '4200.74000000',           // low
    '4285.08000000',           // close
    '795.15014300',            // volume
    1503014399999,             // closeTime
    '3454770.0',               // quoteAssetVolume
    3427,                      // trades
    '616.24230400',            // takerBuyBase
    '2678216.4',               // takerBuyQuote
    '0',                       // ignore
  ]

  it('parses a single kline tuple into DailyOHLC with UTC date', () => {
    const [row] = parseKlinesResponse([sampleKline])
    expect(row.date).toBe('2017-08-17')
    expect(row.openTime).toBe(1502928000000)
    expect(row.open).toBeCloseTo(4261.48, 2)
    expect(row.high).toBeCloseTo(4485.39, 2)
    expect(row.low).toBeCloseTo(4200.74, 2)
    expect(row.close).toBeCloseTo(4285.08, 2)
    expect(row.volume).toBeCloseTo(795.15, 2)
  })

  it('coerces string-typed numerics to numbers', () => {
    const [row] = parseKlinesResponse([sampleKline])
    expect(typeof row.open).toBe('number')
    expect(typeof row.high).toBe('number')
    expect(typeof row.low).toBe('number')
    expect(typeof row.close).toBe('number')
    expect(typeof row.volume).toBe('number')
  })

  it('returns empty array for empty input', () => {
    expect(parseKlinesResponse([])).toEqual([])
  })

  it('throws on malformed kline (fewer than 6 fields)', () => {
    const malformed = [[1502928000000, '4261.48']] as unknown as number[][]
    expect(() => parseKlinesResponse(malformed)).toThrow(/malformed/i)
  })

  it('throws on non-array root', () => {
    expect(() => parseKlinesResponse({} as unknown as number[][])).toThrow(/array/i)
  })

  it('parses multiple klines preserving order', () => {
    const k1 = [...sampleKline]
    const k2 = [...sampleKline]
    k2[0] = 1503014400000  // 2017-08-18
    const result = parseKlinesResponse([k1, k2])
    expect(result).toHaveLength(2)
    expect(result[0].date).toBe('2017-08-17')
    expect(result[1].date).toBe('2017-08-18')
  })
})

import { fetchHistoricalKlines } from '../binance'

describe('fetchHistoricalKlines', () => {
  // Build a stub Binance kline tuple
  const k = (openTimeMs: number, close: number) => [
    openTimeMs, String(close), String(close + 100), String(close - 100),
    String(close), '1000', openTimeMs + 86_399_999,
    '0', 0, '0', '0', '0',
  ]

  function makeFetch(pages: unknown[][]) {
    let call = 0
    return async (_url: string) => {
      const body = pages[call] ?? []
      call++
      return {
        ok: true,
        async json() { return body },
      } as Response
    }
  }

  it('returns parsed klines for a single page', async () => {
    const page = [k(1502928000000, 4285)]  // 2017-08-17
    const f = makeFetch([page])
    const result = await fetchHistoricalKlines(
      new Date('2017-08-17T00:00:00Z'),
      new Date('2017-08-17T23:59:59Z'),
      f as typeof fetch,
    )
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2017-08-17')
  })

  it('paginates across multiple pages', async () => {
    // Page 1: 1500 rows (full)
    const page1 = Array.from({ length: 1500 }, (_, i) => k(1502928000000 + i * 86_400_000, 1000 + i))
    // Page 2: 50 rows (partial → terminate)
    const page2Start = 1502928000000 + 1500 * 86_400_000
    const page2 = Array.from({ length: 50 }, (_, i) => k(page2Start + i * 86_400_000, 2500 + i))
    const f = makeFetch([page1, page2])
    const result = await fetchHistoricalKlines(
      new Date('2017-08-17T00:00:00Z'),
      new Date('2024-01-01T00:00:00Z'),
      f as typeof fetch,
    )
    expect(result).toHaveLength(1550)
    // Order preserved
    expect(result[0].close).toBeCloseTo(1000, 2)
    expect(result[1499].close).toBeCloseTo(2499, 2)
    expect(result[1549].close).toBeCloseTo(2549, 2)
  })

  it('terminates on empty response', async () => {
    const f = makeFetch([[]])
    const result = await fetchHistoricalKlines(
      new Date('2017-08-17T00:00:00Z'),
      new Date('2017-08-18T00:00:00Z'),
      f as typeof fetch,
    )
    expect(result).toEqual([])
  })

  it('throws on non-OK HTTP response', async () => {
    const f = (async () => ({ ok: false, status: 429, statusText: 'Too Many Requests' })) as unknown as typeof fetch
    await expect(
      fetchHistoricalKlines(
        new Date('2017-08-17T00:00:00Z'),
        new Date('2017-08-18T00:00:00Z'),
        f,
      ),
    ).rejects.toThrow(/429/)
  })

  it('uses milliseconds for startTime and endTime in URL', async () => {
    const captured: string[] = []
    const f = (async (url: string) => {
      captured.push(url)
      return { ok: true, async json() { return [] } }
    }) as unknown as typeof fetch
    await fetchHistoricalKlines(
      new Date('2017-08-17T00:00:00Z'),
      new Date('2017-08-18T00:00:00Z'),
      f,
    )
    expect(captured[0]).toContain('startTime=1502928000000')
    expect(captured[0]).toContain('endTime=1503014400000')
  })
})
