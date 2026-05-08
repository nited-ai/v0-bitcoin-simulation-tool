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
