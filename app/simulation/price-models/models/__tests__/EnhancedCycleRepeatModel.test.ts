import { describe, it, expect } from 'vitest'
import { EnhancedCycleRepeatModel, DIMINISHING_RETURNS_PRESETS } from '../EnhancedCycleRepeatModel'
const model = new EnhancedCycleRepeatModel()
const input = { startPrice: 10000, projectionMonths: 12, modelSpecificParams: { diminishingReturns: DIMINISHING_RETURNS_PRESETS.moderate.params } }
describe('EnhancedCycleRepeatModel public contract', () => {
  it('identifies a historical replay without claiming forecast confidence', () => {
    expect(model.name).toBe('Historical Cycle Replay')
    expect(model.version).toBe('3.0.0')
    expect(model.getMetadata().confidenceRange).toBe('not-estimated')
  })
  it('uses the shared moderate defaults', () => expect(model.getDefaultParams().diminishingReturns).toEqual(DIMINISHING_RETURNS_PRESETS.moderate.params))
  it.each([0, -1, NaN, Infinity])('rejects invalid price %s', value => expect(model.validateParams({ ...input, startPrice: value })).toBe(false))
  it.each([0, -1, 1.5, 301, Infinity])('rejects invalid months %s', value => expect(model.validateParams({ ...input, projectionMonths: value })).toBe(false))
  it.each(['diminishingFactor', 'cycleDegradation'])('rejects invalid %s', key => {
    for (const value of [-1, 2, NaN, Infinity]) expect(model.validateParams({ ...input, modelSpecificParams: { diminishingReturns: { ...input.modelSpecificParams.diminishingReturns, [key]: value } } })).toBe(false)
  })
  it('rejects missing history', async () => await expect(model.generateProjection([], input)).rejects.toThrow(/Tageskurse/))
  it('accepts every existing preset', () => {
    for (const preset of Object.values(DIMINISHING_RETURNS_PRESETS)) expect(model.validateParams({ ...input, modelSpecificParams: { diminishingReturns: preset.params } })).toBe(true)
  })
})
