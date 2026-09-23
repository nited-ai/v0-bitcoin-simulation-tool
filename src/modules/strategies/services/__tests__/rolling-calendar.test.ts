import { expect, it } from 'vitest'
import { simulateRollingLoan } from '../simulateRollingLoan'
import { DEFAULT_PARAMS } from '../../../../../app/simulation/types/simulation'
it('samples actual calendar month ends from a daily scenario', () => {
  const start = Date.parse('2026-01-31')
  const projectionPoints = Array.from({ length: 60 }, (_, i) => ({ timestamp: start + i * 86400000, price: 100000 + i * 100, confidence: 0 }))
  const result = simulateRollingLoan({ ...DEFAULT_PARAMS, initialBtcPrice: 100000, simulationMonths: 2 }, {
    modelName: 'fixture', modelVersion: '1', projectionPoints,
    metadata: { totalMonths: 2, totalGrowth: 5.9, averageMonthlyGrowth: 0, confidence: 0, generatedAt: '' },
  })
  expect(result.getTimestampForMonth(1)).toBe(Date.parse('2026-02-28'))
  expect(result.getBtcPriceForMonth(1)).toBe(102800)
  expect(result.getTimestampForMonth(2)).toBe(Date.parse('2026-03-31'))
  expect(result.getBtcPriceForMonth(2)).toBe(105900)
})
it('does not invent a loan scenario before projection data exists', () => {
  expect(simulateRollingLoan(DEFAULT_PARAMS, null).monthlySnapshots).toEqual([])
})
