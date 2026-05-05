import { describe, it, expect } from 'vitest'
import {
  adaptToHistoricalDataPoint,
  adaptManyToHistoricalDataPoints,
} from '../adaptToHistoricalDataPoint'
import type { PricePoint } from '../../hooks/usePriceData'

describe('adaptToHistoricalDataPoint', () => {
  const samplePricePoint: PricePoint = {
    date: '2025-01-15',
    open: 100_000,
    high: 110_000,
    low: 95_000,
    close: 105_000,
  }

  it('produces correct shape from a known PricePoint input', () => {
    const result = adaptToHistoricalDataPoint(samplePricePoint)
    expect(result).toEqual({
      time: Math.floor(new Date('2025-01-15T00:00:00Z').getTime() / 1000),
      date: '2025-01-15',
      open: 100_000,
      high: 110_000,
      low: 95_000,
      close: 105_000,
      volume: 0,
      source: 'api',
    })
  })

  it('time field is the unix-second timestamp of date + T00:00:00Z (UTC midnight)', () => {
    const result = adaptToHistoricalDataPoint(samplePricePoint)
    expect(result.time).toBe(1736899200)
    expect(new Date(result.time * 1000).toISOString()).toBe('2025-01-15T00:00:00.000Z')
  })

  it('volume is hardcoded 0 (PR2 API does not return volume)', () => {
    const result = adaptToHistoricalDataPoint(samplePricePoint)
    expect(result.volume).toBe(0)
  })

  it("source is hardcoded 'api' (single source identifier for API-derived rows)", () => {
    const result = adaptToHistoricalDataPoint(samplePricePoint)
    expect(result.source).toBe('api')
  })

  it('handles leap-day date (2024-02-29) correctly', () => {
    const leapDay: PricePoint = {
      date: '2024-02-29',
      open: 60_000,
      high: 62_000,
      low: 59_000,
      close: 61_500,
    }
    const result = adaptToHistoricalDataPoint(leapDay)
    expect(result.time).toBe(1709164800)
    expect(result.date).toBe('2024-02-29')
  })
})

describe('adaptManyToHistoricalDataPoints', () => {
  it('maps an array preserving order', () => {
    const points: PricePoint[] = [
      { date: '2025-01-01', open: 90_000, high: 92_000, low: 89_000, close: 91_500 },
      { date: '2025-01-02', open: 91_500, high: 93_000, low: 91_000, close: 92_750 },
      { date: '2025-01-03', open: 92_750, high: 94_500, low: 92_000, close: 93_900 },
    ]
    const result = adaptManyToHistoricalDataPoints(points)
    expect(result).toHaveLength(3)
    expect(result[0].date).toBe('2025-01-01')
    expect(result[1].date).toBe('2025-01-02')
    expect(result[2].date).toBe('2025-01-03')
    expect(result[0].volume).toBe(0)
    expect(result[2].source).toBe('api')
  })

  it('returns an empty array for empty input', () => {
    expect(adaptManyToHistoricalDataPoints([])).toEqual([])
  })

  it('produces the same result as mapping adaptToHistoricalDataPoint individually', () => {
    const points: PricePoint[] = [
      { date: '2025-01-01', open: 90_000, high: 92_000, low: 89_000, close: 91_500 },
      { date: '2025-01-02', open: 91_500, high: 93_000, low: 91_000, close: 92_750 },
    ]
    expect(adaptManyToHistoricalDataPoints(points)).toEqual(
      points.map(adaptToHistoricalDataPoint),
    )
  })
})
