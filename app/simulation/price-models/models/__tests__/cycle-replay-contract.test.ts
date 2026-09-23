import { afterEach, describe, expect, it, vi } from 'vitest'
import { EnhancedCycleRepeatModel, DIMINISHING_RETURNS_PRESETS } from '../EnhancedCycleRepeatModel'
import type { HistoricalDataPoint } from '@/src/modules/price-data/types'

const DAY = 86400000
function history(): HistoricalDataPoint[] {
  const start = Date.parse('2020-05-11')
  const end = Date.parse('2024-04-20')
  return Array.from({ length: (end - start) / DAY + 1 }, (_, i) => ({
    time: (start + i * DAY) / 1000,
    open: 100, close: i === 1 ? 50 : 100, high: 110, low: i === 1 ? 40 : 90,
  }))
}
function params(extra = {}) {
  return { startPrice: 1000, projectionMonths: 1, modelSpecificParams: {
    diminishingReturns: { ...DIMINISHING_RETURNS_PRESETS.moderate.params,
      diminishingFactor: 0, referenceCycle: '2020-2024', phaseMonths: 0, ...extra },
  } }
}
afterEach(() => vi.useRealTimers())
describe('historical cycle replay contract', () => {
  it('keeps the full 12-year horizon and repeats the entire observed cycle', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const input = { ...params(), projectionMonths: 144 }
    const result = await new EnhancedCycleRepeatModel().generateProjection(history(), input)
    const count = result.metadata.cycleLengthDays
    expect(result.projectionPoints[count].price).toBe(1000)
    expect(result.projectionPoints[count + 1].price).toBe(500)
    expect(result.projectionPoints.at(-1)?.timestamp).toBe(Date.parse('2038-01-01'))
  })
  it('orders dampening presets by their actual effect on the same path', async () => {
    const model = new EnhancedCycleRepeatModel()
    const strong = await model.generateProjection(history(), params({ ...DIMINISHING_RETURNS_PRESETS.conservative.params }))
    const weak = await model.generateProjection(history(), params({ ...DIMINISHING_RETURNS_PRESETS.optimistic.params }))
    expect(strong.projectionPoints.at(-1)!.price).toBeLessThan(weak.projectionPoints.at(-1)!.price)
    expect(strong.projectionPoints[1].price).toBe(weak.projectionPoints[1].price)
  })
  it('keeps t=0 and every daily crash; ends at the calendar anniversary', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-31T14:00:00Z'))
    const result = await new EnhancedCycleRepeatModel().generateProjection(history(), params())
    expect(result.projectionPoints[0].price).toBe(1000)
    expect(result.projectionPoints[1].timestamp - result.projectionPoints[0].timestamp).toBe(DAY)
    expect(result.projectionPoints[1].price).toBe(500)
    expect(result.projectionPoints.at(-1)?.timestamp).toBe(Date.parse('2026-02-28'))
    expect(new Set(result.projectionPoints.map(p => p.timestamp)).size).toBe(29)
    expect(result.metadata.referenceStart).toBe('2020-05-11')
    expect(result.projectionPoints[1].metadata?.low).toBe(400)
  })
  it('changes the historical starting phase, not a random seed', async () => {
    const model = new EnhancedCycleRepeatModel()
    const a = await model.generateProjection(history(), params())
    const b = await model.generateProjection(history(), params({ phaseMonths: 12 }))
    expect(a.projectionPoints[1].price).toBe(500)
    expect(b.projectionPoints[1].price).toBe(1000)
    expect(b.metadata.replayStartsAt).toBe('2021-05-11')
  })
  it('rejects incomplete historical periods instead of inventing a cycle', async () => {
    await expect(new EnhancedCycleRepeatModel().generateProjection(history().slice(20), params())).rejects.toThrow(/vollständig/)
  })
  it('rejects missing daily candles instead of compressing the cycle', async () => {
    const rows = history(); rows.splice(40, 1)
    await expect(new EnhancedCycleRepeatModel().generateProjection(rows, params())).rejects.toThrow(/Lücke/)
  })
  it('preserves losses when upside is dampened and is reproducible', async () => {
    const model = new EnhancedCycleRepeatModel()
    const settings = params({ diminishingFactor: 0.5, cycleDegradation: 0 })
    const a = await model.generateProjection(history(), settings)
    const b = await model.generateProjection(history(), settings)
    expect(a.projectionPoints[1].price).toBe(500)
    expect(a.projectionPoints[2].price).toBe(750)
    expect(a.projectionPoints).toEqual(b.projectionPoints)
    expect(a.metadata.confidenceKind).toBe('not-estimated')
  })
})
