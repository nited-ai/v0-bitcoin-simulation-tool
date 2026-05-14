/**
 * RolloverPolicyService — Scenario tests
 *
 * Each test describes a concrete situation the rolling-loan strategy can
 * encounter, with expected outcomes that encode the project owner's
 * design principle:
 *
 *   "As long as the investor has enough collateral to top up, they should
 *    NOT be liquidated."
 *
 * In particular:
 *   - Refinance at the rollover LTV cap (not target LTV) is preferred over
 *     selling BTC.
 *   - Selling only happens when debt would push the *full BTC stack* above
 *     the rollover cap.
 *   - Some scenarios use exact numbers from the May 2026 user-reported
 *     screenshots to lock in regression behavior.
 */

import { describe, expect, it } from 'vitest'
import {
  decideRolloverAction,
  computeCostFactor,
  defaultRolloverMaxLtv,
  type RolloverPolicyInput,
} from '../RolloverPolicyService'

const baseInput = (overrides: Partial<RolloverPolicyInput> = {}): RolloverPolicyInput => ({
  repaymentDue: 10_000,
  lockedBtc: 0.4,
  unlockedBtc: 0.6,
  btcPrice: 100_000,
  costFactor: computeCostFactor(1.5, 6.5, 12), // ≈ 1.08
  targetLtv: 40,
  rolloverMaxLtv: 68,
  liquidationLtv: 80,
  ...overrides,
})

describe('RolloverPolicyService: refinance-only path (aim for targetLtv)', () => {
  it('refinances UP to targetLtv when old debt is below target (takes excess to buy BTC)', () => {
    // 1 BTC at $100k = $100k collateral. costFactor ≈ 1.08. targetLtv = 40%.
    // principalAtTargetLtv ≈ 100,000 × 0.40 / 1.08 ≈ $37,037.
    // Old debt $10k < $37k target → refinance UP to $37k, excess ≈ $27k.
    // This is the "rolling-loan accumulation" mechanic: at rollover the
    // strategy takes a bigger loan (back to targetLtv) and buys more BTC
    // with the excess proceeds.
    const out = decideRolloverAction(baseInput({ repaymentDue: 10_000 }))

    expect(out.forcedSale).toBe(false)
    expect(out.btcSold).toBe(0)
    expect(out.outcome).toBe('refinance-with-excess')
    expect(out.newPrincipal).toBeGreaterThan(36_000)
    expect(out.newPrincipal).toBeLessThan(38_000)
    expect(out.resultingLtv).toBeCloseTo(40, 0) // aim is met exactly
    expect(out.excessProceeds).toBeGreaterThan(26_000) // bulk to buy BTC
  })

  it('refinances at the old debt size (above target) when forced by carried debt', () => {
    // Old debt $50k on $100k collateral. principalAtTargetLtv = $37k < $50k.
    // We MUST cover the old debt. Don't sell since $50k fits within
    // principalCap@68% = $62.9k. Refinance at $50k → LTV ≈ 54% (above
    // target but below rollover cap). Per user principle: this is OK.
    const out = decideRolloverAction(baseInput({ repaymentDue: 50_000 }))

    expect(out.forcedSale).toBe(false)
    expect(out.btcSold).toBe(0)
    expect(out.newPrincipal).toBe(50_000)
    expect(out.resultingLtv).toBeGreaterThan(40)
    expect(out.resultingLtv).toBeLessThan(68)
    expect(out.excessProceeds).toBe(0) // no enlargement when forced over target
  })

  it('honors loanAmountPercent as a SMALLER cap (more conservative than targetLtv)', () => {
    // User configures 15% loan size — wants less leverage than the 40%
    // strategic target. Policy caps at 15%, doesn't take it back up to 40%.
    // Old debt $10k → new principal = max($10k, $13.8k @ 15%) ≈ $13.8k.
    const out = decideRolloverAction(baseInput({
      repaymentDue: 10_000,
      loanAmountPercent: 15,
    }))

    expect(out.forcedSale).toBe(false)
    expect(out.outcome).toBe('refinance-with-excess')
    expect(out.newPrincipal).toBeGreaterThan(13_500)
    expect(out.newPrincipal).toBeLessThan(14_500)
    expect(out.resultingLtv).toBeCloseTo(15, 0)
  })

  it('ignores loanAmountPercent when it exceeds targetLtv (target wins)', () => {
    // User sets loanAmountPercent = 80% but targetLtv = 40%. The strategy
    // sticks with 40% as the aim — never EXCEEDS target by choice. Only
    // the old debt could force us above (and there's no old debt here).
    const out = decideRolloverAction(baseInput({
      repaymentDue: 10_000,
      loanAmountPercent: 80,
    }))

    expect(out.resultingLtv).toBeCloseTo(40, 0)
    expect(out.forcedSale).toBe(false)
  })
})

describe('RolloverPolicyService: the project-owner principle (bear drift, no forced sale)', () => {
  /**
   * The KEY SCENARIO that motivated this service.
   *
   * Numbers from the May 2026 user-reported Vercel preview at Jun 2029:
   *   - Old loan repayment: $45,213
   *   - Total BTC at rollover: 1.3117 (1.2891 plus monthly accumulations)
   *   - BTC price: $79,759
   *   - Total collateral: $104,619
   *
   * Old behavior: principalCap @ targetLtv 40% / costFactor 1.13 ≈ $37,000.
   * $45,213 > $37,000 → forced sale of ~0.147 BTC.
   *
   * New behavior with rolloverMaxLtv = 68%:
   * principalCap = $104,619 × 0.68 / 1.13 ≈ $62,931. $45,213 < $62,931 →
   * NO SALE, refinance at ~48% LTV instead. Investor keeps full BTC stack.
   */
  it('Jun 2029 reproduction: 44.7% LTV debt should NOT trigger a sale', () => {
    const out = decideRolloverAction({
      repaymentDue: 45_213,
      lockedBtc: 1.2692,
      unlockedBtc: 0.0425, // 1.3117 - 1.2692
      btcPrice: 79_759,
      costFactor: computeCostFactor(1.5, 6.5, 12),
      targetLtv: 40,
      rolloverMaxLtv: 68,
      liquidationLtv: 80,
    })

    expect(out.forcedSale).toBe(false)
    expect(out.btcSold).toBe(0)
    expect(out.outcome).toBe('refinance-only')
    expect(out.newPrincipal).toBe(45_213)
    // Resulting LTV should be well under rolloverMaxLtv (48% ish)
    expect(out.resultingLtv).toBeLessThan(55)
    expect(out.resultingLtv).toBeGreaterThan(40)
  })

  it('Jun 2036 reproduction: 50.9% LTV pre-rollover should also not force a sale', () => {
    // Approximate numbers from the screenshot:
    //   Old debt ≈ $394,971 (the carrying $327k + extra from the year)
    //   Total BTC ≈ 1.2636 after multiple top-ups
    //   Price ≈ $701,278
    // Even at 50.9% LTV, well under rolloverMaxLtv=68%.
    const out = decideRolloverAction({
      repaymentDue: 394_971,
      lockedBtc: 1.0148,
      unlockedBtc: 0.2488, // 1.2636 - 1.0148
      btcPrice: 701_278,
      costFactor: computeCostFactor(1.5, 6.5, 12),
      targetLtv: 40,
      rolloverMaxLtv: 68,
      liquidationLtv: 80,
    })

    expect(out.forcedSale).toBe(false)
    expect(out.btcSold).toBe(0)
  })
})

describe('RolloverPolicyService: forced sale path', () => {
  it('sells BTC when debt exceeds rolloverMaxLtv on the FULL stack', () => {
    // 1 BTC at $50k = $50k collateral. Cap @ 68% ≈ $31,481.
    // Debt $40k > $31,481 → must sell.
    const out = decideRolloverAction(baseInput({
      repaymentDue: 40_000,
      lockedBtc: 0.4,
      unlockedBtc: 0.6,
      btcPrice: 50_000,
    }))

    expect(out.forcedSale).toBe(true)
    expect(out.outcome).toBe('force-sale')
    expect(out.btcSold).toBeGreaterThan(0)
    // Resulting LTV should land at exactly rolloverMaxLtv (the cap)
    expect(out.resultingLtv).toBeCloseTo(68, 0)
    // Debt should be reduced
    expect(out.remainingDebt).toBeLessThan(40_000)
    expect(out.newPrincipal).toBe(out.remainingDebt) // refinance the remainder
  })

  it('still avoids a sale if more collateral is *available* (locked + unlocked)', () => {
    // 0.4 locked BTC alone is insufficient (0.4 × 50k = $20k collateral, cap $13.6k vs $30k debt).
    // BUT add 1.0 unlocked → 1.4 total → $70k collateral, cap $47.6k > $30k debt.
    // No sale needed.
    const out = decideRolloverAction({
      repaymentDue: 30_000,
      lockedBtc: 0.4,
      unlockedBtc: 1.0,
      btcPrice: 50_000,
      costFactor: computeCostFactor(1.5, 6.5, 12),
      targetLtv: 40,
      rolloverMaxLtv: 68,
      liquidationLtv: 80,
    })

    expect(out.forcedSale).toBe(false)
    expect(out.btcSold).toBe(0)
  })

  it('flags liquidation territory when even full-stack sale cannot save it', () => {
    // 0.5 BTC at $10k = $5k collateral. Debt $20k. No sale gets us under 68%
    // because the entire stack at $5k can only support $3,148 at 68% LTV;
    // selling everything still leaves a $15k+ debt with no collateral.
    const out = decideRolloverAction({
      repaymentDue: 20_000,
      lockedBtc: 0.3,
      unlockedBtc: 0.2,
      btcPrice: 10_000,
      costFactor: computeCostFactor(1.5, 6.5, 12),
      targetLtv: 40,
      rolloverMaxLtv: 68,
      liquidationLtv: 80,
    })

    expect(out.forcedSale).toBe(true)
    // In this catastrophic case the policy still produces a "best effort"
    // sale; the resulting LTV may be high — caller should flag via outcome.
    expect(['force-sale', 'liquidation-territory']).toContain(out.outcome)
  })
})

describe('RolloverPolicyService: edge cases', () => {
  it('handles zero unlocked BTC (all collateral already pledged)', () => {
    const out = decideRolloverAction(baseInput({
      lockedBtc: 1.0,
      unlockedBtc: 0,
      repaymentDue: 10_000,
    }))

    expect(out.forcedSale).toBe(false)
    expect(out.newCollateral).toBe(100_000)
  })

  it('handles all-unlocked stack (rollover top-up moves it into locked)', () => {
    // Caller will move unlocked → locked post-rollover. Policy just sees the
    // pool as one total. The math should still work.
    const out = decideRolloverAction(baseInput({
      lockedBtc: 0,
      unlockedBtc: 1.0,
      repaymentDue: 10_000,
    }))

    expect(out.forcedSale).toBe(false)
    expect(out.newPrincipal).toBe(10_000)
  })

  it('returns zero result for invalid price', () => {
    const out = decideRolloverAction(baseInput({ btcPrice: 0 }))
    expect(out.newPrincipal).toBe(0)
    expect(out.btcSold).toBe(0)
  })

  it('returns zero result for invalid cost factor', () => {
    const out = decideRolloverAction(baseInput({ costFactor: 0 }))
    expect(out.newPrincipal).toBe(0)
  })

  it('returns zero result when there is no BTC at all', () => {
    const out = decideRolloverAction(baseInput({
      lockedBtc: 0,
      unlockedBtc: 0,
      repaymentDue: 1_000,
    }))
    expect(out.btcSold).toBe(0)
    expect(out.newPrincipal).toBe(0)
  })
})

describe('RolloverPolicyService: helpers', () => {
  describe('computeCostFactor', () => {
    it('computes 12-month standard loan cost factor', () => {
      // 1.5% fee + 6.5% annual × 12 months = 1 + 0.015 + 0.065 = 1.08
      const factor = computeCostFactor(1.5, 6.5, 12)
      expect(factor).toBeCloseTo(1.08, 4)
    })

    it('handles infinite-term loans by capping at 12 months', () => {
      const factor = computeCostFactor(1.5, 6.5, Infinity)
      expect(factor).toBeCloseTo(1.08, 4)
    })

    it('handles zero fees and rate', () => {
      expect(computeCostFactor(0, 0, 12)).toBe(1)
    })
  })

  describe('defaultRolloverMaxLtv', () => {
    it('produces a value between target and liquidation', () => {
      const v = defaultRolloverMaxLtv(40, 80)
      expect(v).toBeGreaterThan(40)
      expect(v).toBeLessThan(80)
    })

    it('lands at 68% for the standard 40/80 setup', () => {
      // 40 + (80 - 40) × 0.7 = 40 + 28 = 68
      expect(defaultRolloverMaxLtv(40, 80)).toBe(68)
    })

    it('scales with the gap between target and liquidation', () => {
      // 50/90: 50 + 40 × 0.7 = 78
      expect(defaultRolloverMaxLtv(50, 90)).toBe(78)
    })
  })
})

describe('RolloverPolicyService: invariants across many randomised scenarios', () => {
  /**
   * Property-style sanity checks. For any reasonable input:
   *   1. resultingLtv must be ≤ liquidationLtv (after possible sale)
   *   2. newPrincipal ≥ 0
   *   3. btcSold ≥ 0
   *   4. newCollateral = (totalBtc - btcSold) × btcPrice (within rounding)
   *   5. if forcedSale is false, btcSold == 0
   */
  for (let i = 0; i < 50; i++) {
    it(`invariant check #${i}`, () => {
      const btcPrice = 10_000 + Math.random() * 1_000_000
      const lockedBtc = Math.random() * 5
      const unlockedBtc = Math.random() * 2
      const repaymentDue = Math.random() * (lockedBtc + unlockedBtc) * btcPrice * 1.2

      const out = decideRolloverAction({
        repaymentDue,
        lockedBtc,
        unlockedBtc,
        btcPrice,
        costFactor: computeCostFactor(1.5, 6.5, 12),
        targetLtv: 40,
        rolloverMaxLtv: 68,
        liquidationLtv: 80,
      })

      expect(out.newPrincipal).toBeGreaterThanOrEqual(0)
      expect(out.btcSold).toBeGreaterThanOrEqual(0)
      // resultingLtv allowed slight rounding overshoot
      if (out.outcome !== 'liquidation-territory') {
        expect(out.resultingLtv).toBeLessThanOrEqual(81)
      }
      if (!out.forcedSale) {
        expect(out.btcSold).toBe(0)
      }
      const totalBtc = lockedBtc + unlockedBtc
      const expectedCollateral = (totalBtc - out.btcSold) * btcPrice
      expect(Math.abs(out.newCollateral - expectedCollateral)).toBeLessThan(1)
    })
  }
})
