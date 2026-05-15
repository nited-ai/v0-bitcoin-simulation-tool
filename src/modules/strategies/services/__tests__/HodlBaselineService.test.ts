/**
 * HodlBaselineService — scenario tests
 *
 * Defines the precise semantics of the HODL counterfactual against which
 * every leverage strategy is judged. If any of these expectations are
 * wrong, the "vs HODL" headline KPI on the Results page tells the user
 * the wrong story — so the math has to be tight.
 */

import { describe, expect, it } from 'vitest'
import {
  computeHodlBaseline,
  compareVsHodl,
} from '../HodlBaselineService'

const flatPrice = (p: number) => () => p
const linearPrice = (p0: number, growthPerMonth: number) => (m: number) =>
  p0 + growthPerMonth * m

describe('HodlBaselineService: stack growth from savings (no withdrawal)', () => {
  it('stays at initial BTC when no flow and no growth', () => {
    const out = computeHodlBaseline({
      initialBtcAmount: 1,
      monthlyWithdrawalAmount: 0,
      simulationMonths: 12,
      priceForMonth: flatPrice(50_000),
    })
    expect(out.finalBtc).toBe(1)
    expect(out.totalSavings).toBe(0)
    expect(out.totalWithdrawals).toBe(0)
  })

  it('adds BTC each month at flat price when saving $1000/mo', () => {
    // $1000/mo × 12 mo at $50k = $12k savings ⇒ 0.24 BTC bought ⇒ stack 1.24
    const out = computeHodlBaseline({
      initialBtcAmount: 1,
      monthlyWithdrawalAmount: 1000,
      simulationMonths: 12,
      priceForMonth: flatPrice(50_000),
    })
    expect(out.finalBtc).toBeCloseTo(1.24, 5)
    expect(out.totalSavings).toBe(12_000)
  })

  it('buys less BTC per dollar as price rises (price-averaged accumulation)', () => {
    // Start $50k, +$5k/mo growth → average price across 12 months > $50k,
    // so total BTC bought < 0.24 (the constant-price baseline).
    const out = computeHodlBaseline({
      initialBtcAmount: 1,
      monthlyWithdrawalAmount: 1000,
      simulationMonths: 12,
      priceForMonth: linearPrice(50_000, 5_000),
    })
    expect(out.finalBtc).toBeLessThan(1.24) // less than flat-price scenario
    expect(out.finalBtc).toBeGreaterThan(1.1) // but still meaningful growth
  })

  it('honors annualSavingsIncrease (compounds yearly)', () => {
    // $1000/mo year 1, +10%/yr → $1100/mo year 2, $1210/mo year 3
    const out = computeHodlBaseline({
      initialBtcAmount: 0,
      monthlyWithdrawalAmount: 1000,
      annualSavingsIncrease: 10,
      simulationMonths: 36,
      priceForMonth: flatPrice(50_000),
    })
    // year 1: 12 × $1000 = $12k. year 2: 12 × $1100 = $13.2k. year 3: 12 × $1210 = $14.52k.
    // Total = $39.72k / $50k = 0.7944 BTC
    expect(out.totalSavings).toBeCloseTo(39_720, 0)
    expect(out.finalBtc).toBeCloseTo(0.7944, 3)
  })
})

describe('HodlBaselineService: withdrawals drain the stack', () => {
  it('reduces BTC each month when withdrawing', () => {
    // 1 BTC × $100k = $100k. Withdraw $4k/mo for 12 mo = $48k drained.
    // At flat $100k: 48,000 / 100,000 = 0.48 BTC drained ⇒ stack 0.52.
    const out = computeHodlBaseline({
      initialBtcAmount: 1,
      monthlyWithdrawalAmount: -4_000,
      simulationMonths: 12,
      priceForMonth: flatPrice(100_000),
    })
    expect(out.finalBtc).toBeCloseTo(0.52, 5)
    expect(out.totalWithdrawals).toBe(48_000)
  })

  it('flags the month the stack ran out', () => {
    // 0.5 BTC × $10k = $5k. Withdraw $1000/mo → exhausted at month 6.
    const out = computeHodlBaseline({
      initialBtcAmount: 0.5,
      monthlyWithdrawalAmount: -1_000,
      simulationMonths: 12,
      priceForMonth: flatPrice(10_000),
    })
    expect(out.finalBtc).toBe(0)
    expect(out.monthExhausted).toBeGreaterThan(0)
    expect(out.monthExhausted).toBeLessThanOrEqual(7)
  })

  it('does not go negative when withdrawal exceeds remaining stack', () => {
    const out = computeHodlBaseline({
      initialBtcAmount: 0.1,
      monthlyWithdrawalAmount: -10_000,
      simulationMonths: 6,
      priceForMonth: flatPrice(10_000),
    })
    expect(out.finalBtc).toBeGreaterThanOrEqual(0)
  })
})

describe('HodlBaselineService: compareVsHodl', () => {
  it('reports outperformance when strategy ends with more net BTC', () => {
    const cmp = compareVsHodl(11.16, 263_511, 1_200_000, 10.5)
    // debtBtc = 263_511 / 1_200_000 ≈ 0.220
    // strategyNetBtc = 11.16 − 0.220 ≈ 10.94
    // delta = 10.94 − 10.5 = 0.44 BTC
    expect(cmp.outperformed).toBe(true)
    expect(cmp.strategyNetBtc).toBeCloseTo(10.94, 1)
    expect(cmp.deltaBtc).toBeCloseTo(0.44, 1)
  })

  it('reports underperformance when strategy ends with less net BTC', () => {
    const cmp = compareVsHodl(9.5, 263_511, 1_200_000, 10.5)
    // strategyNetBtc ≈ 9.28; hodl 10.5; delta −1.22
    expect(cmp.outperformed).toBe(false)
    expect(cmp.deltaBtc).toBeLessThan(0)
    expect(cmp.deltaPercent).toBeLessThan(0)
  })

  it('handles zero HODL gracefully (avoids div-by-zero)', () => {
    const cmp = compareVsHodl(0.5, 1_000, 100_000, 0)
    expect(cmp.deltaPercent).toBe(0)
  })

  it('handles zero final price gracefully', () => {
    const cmp = compareVsHodl(1, 1_000, 0, 1)
    expect(cmp.strategyNetBtc).toBe(1) // debt/price defaults to 0
  })
})

describe('HodlBaselineService: realistic 12-year sim', () => {
  it('handles the user-screenshot scenario: 10 BTC, $4k withdrawal, growing price', () => {
    // Start: 10 BTC at $80k. End: $1.2M (rough). $4k/mo withdrawal for 144 mo.
    // We don't pin exact numbers (cycle-repeat is volatile) — just sanity:
    //   - withdrawals total = 144 × $4000 = $576k
    //   - finalBtc < 10 (withdrawals drain it)
    //   - finalBtc > 5 (because price rose massively over the period)
    const out = computeHodlBaseline({
      initialBtcAmount: 10,
      monthlyWithdrawalAmount: -4_000,
      simulationMonths: 144,
      priceForMonth: (m) => 80_000 + (m * 8_000), // linear $80k → $1.2M
    })
    expect(out.totalWithdrawals).toBe(576_000)
    expect(out.finalBtc).toBeLessThan(10)
    expect(out.finalBtc).toBeGreaterThan(5)
    expect(out.monthExhausted).toBe(0) // never runs out under growth scenario
  })
})

describe('HodlBaselineService: invariants', () => {
  for (let i = 0; i < 30; i++) {
    it(`random scenario #${i} — trajectory shape and signs`, () => {
      const initial = Math.random() * 10
      const flow = (Math.random() - 0.5) * 10_000 // ±$5k/mo
      const months = 12 + Math.floor(Math.random() * 60)
      const p0 = 10_000 + Math.random() * 100_000
      const out = computeHodlBaseline({
        initialBtcAmount: initial,
        monthlyWithdrawalAmount: flow,
        simulationMonths: months,
        priceForMonth: linearPrice(p0, Math.random() * 5_000),
      })
      // trajectory has months+1 points (month 0 through month N)
      expect(out.trajectory.length).toBe(months + 1)
      // BTC never negative
      out.trajectory.forEach((p) => expect(p.btcAmount).toBeGreaterThanOrEqual(0))
      // Month 0 has zero delta
      expect(out.trajectory[0].btcDelta).toBe(0)
      // totalSavings and totalWithdrawals are both non-negative
      expect(out.totalSavings).toBeGreaterThanOrEqual(0)
      expect(out.totalWithdrawals).toBeGreaterThanOrEqual(0)
    })
  }
})
