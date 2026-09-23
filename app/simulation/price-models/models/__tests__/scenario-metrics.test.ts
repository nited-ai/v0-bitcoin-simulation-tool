import { describe, expect, it, vi, afterEach } from 'vitest'
import { projectionMetrics } from '../projectionMetrics'
import { ManualGrowthModel } from '../ManualGrowthModel'
import { PowerLawModel } from '../PowerLawModel'
afterEach(() => vi.useRealTimers())
describe('scenario metrics', () => {
  it('uses the entered start price and a full calendar year for Power Law', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-31T15:00:00Z'))
    const result = await new PowerLawModel().generateProjection([], { startPrice: 100000, projectionMonths: 12, modelSpecificParams: { prognosisLine: 'fit' } })
    expect(result.projectionPoints[0].price).toBe(100000)
    expect(result.projectionPoints[0].timestamp).toBe(Date.parse('2026-01-31'))
    expect(result.projectionPoints.at(-1)?.timestamp).toBe(Date.parse('2027-01-31'))
    expect(projectionMetrics(result.projectionPoints, 100000).peakGrowth).not.toBeNull()
  })
  it('measures elapsed years, independently of daily or monthly cadence', () => {
    const start = Date.parse('2025-01-01')
    const end = Date.parse('2026-01-01')
    const create = (n: number) => Array.from({ length: n + 1 }, (_, i) => ({ timestamp: start + (end - start) * i / n, price: 100 * 2 ** (i / n), confidence: 0 }))
    for (const n of [12, 365]) {
      const result = projectionMetrics(create(n), 100)
      expect(result.avgAnnualGrowth).toBeCloseTo(100, 0)
      expect(result.totalGrowth).toBeCloseTo(100)
      expect(result.maxDecline).toBe(0)
    }
  })
  it('includes a crash after a flat high even when price fully recovers', () => {
    const points = [100, 100, 40, 100].map((price, i) => ({ price, timestamp: i * 86400000, confidence: 0 }))
    expect(projectionMetrics(points, 100).maxDecline).toBe(-60)
  })
  it('starts manual scenarios at t=0 and uses calendar anniversaries', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-31T15:00:00Z'))
    const result = await new ManualGrowthModel().generateProjection([], { startPrice: 100, projectionMonths: 12, modelSpecificParams: { annualGrowthRates: [100] } })
    expect(result.projectionPoints[0].price).toBe(100)
    expect(result.projectionPoints[1].timestamp).toBe(Date.parse('2026-02-28'))
    expect(result.projectionPoints.at(-1)?.price).toBeCloseTo(200)
    expect(result.projectionPoints.at(-1)?.timestamp).toBe(Date.parse('2027-01-31'))
  })
})
