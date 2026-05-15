/**
 * HodlBaselineService
 *
 * Pure helper that computes the "HODL baseline" — what the investor's BTC
 * stack would look like if they just held BTC and applied monthly cash flow
 * by buying/selling BTC at the market price (no loans, no debt, no
 * leverage).
 *
 * This is the universal counterfactual every leverage strategy needs to be
 * judged against:
 *   - End-of-sim strategy Net BTC > HODL BTC → strategy generated value
 *   - Strategy Net BTC < HODL BTC → strategy destroyed value (vs simply
 *     holding and selling some BTC to cover withdrawals)
 *
 * Sign convention for `monthlyWithdrawalAmount`:
 *   - positive = savings (USD added → buy BTC, stack grows)
 *   - negative = withdrawal (USD taken → sell BTC, stack shrinks)
 */

export interface HodlBaselineInput {
  /** Starting BTC at month 0 */
  initialBtcAmount: number
  /** Monthly cash flow in USD. Positive = savings, negative = withdrawal. */
  monthlyWithdrawalAmount: number
  /** Compound annual increase rate (e.g. 5 = 5%/year). Optional. */
  annualSavingsIncrease?: number
  /** Number of months to simulate (inclusive of month 0) */
  simulationMonths: number
  /** Function returning the BTC price for a given month (0-indexed) */
  priceForMonth: (m: number) => number
}

export interface HodlPoint {
  month: number
  /** BTC stack at end of this month */
  btcAmount: number
  /** Change this month (positive bought, negative sold, 0 if no flow) */
  btcDelta: number
  /** Cash flow applied this month, after annual-increase compounding */
  cashFlowUsd: number
  /** BTC price used for this month's conversion */
  btcPrice: number
}

export interface HodlSummary {
  /** BTC stack at simulation end */
  finalBtc: number
  /** USD value at simulation end (finalBtc × final price) */
  finalUsdValue: number
  /** Total USD invested via savings (positive flows summed) */
  totalSavings: number
  /** Total USD withdrawn (absolute value of negative flows summed) */
  totalWithdrawals: number
  /** Months in which stack dropped to zero or below (HODL "ran out"). 0 if never. */
  monthExhausted: number
  /** Per-month trajectory */
  trajectory: HodlPoint[]
}

/**
 * Compute the full HODL baseline trajectory. Pure, no side effects.
 */
export function computeHodlBaseline(input: HodlBaselineInput): HodlSummary {
  const {
    initialBtcAmount,
    monthlyWithdrawalAmount,
    annualSavingsIncrease = 0,
    simulationMonths,
    priceForMonth,
  } = input

  const trajectory: HodlPoint[] = []
  let currentBtc = initialBtcAmount
  let totalSavings = 0
  let totalWithdrawals = 0
  let monthExhausted = 0

  // Month 0 — record starting state, no flow yet
  const price0 = priceForMonth(0)
  trajectory.push({
    month: 0,
    btcAmount: currentBtc,
    btcDelta: 0,
    cashFlowUsd: 0,
    btcPrice: price0,
  })

  for (let m = 1; m <= simulationMonths; m++) {
    const yearsPassed = Math.floor(m / 12)
    const adjustedFlow =
      monthlyWithdrawalAmount * Math.pow(1 + annualSavingsIncrease / 100, yearsPassed)
    const price = priceForMonth(m)
    const btcDelta = price > 0 ? adjustedFlow / price : 0

    // Apply the flow but never go below zero (can't hold negative BTC)
    let appliedDelta = btcDelta
    if (currentBtc + btcDelta < 0) {
      appliedDelta = -currentBtc
      if (monthExhausted === 0) monthExhausted = m
    }
    currentBtc = Math.max(0, currentBtc + btcDelta)

    if (adjustedFlow > 0) totalSavings += adjustedFlow
    else if (adjustedFlow < 0) totalWithdrawals += -adjustedFlow

    trajectory.push({
      month: m,
      btcAmount: currentBtc,
      btcDelta: appliedDelta,
      cashFlowUsd: adjustedFlow,
      btcPrice: price,
    })
  }

  const finalPoint = trajectory[trajectory.length - 1]
  return {
    finalBtc: finalPoint.btcAmount,
    finalUsdValue: finalPoint.btcAmount * finalPoint.btcPrice,
    totalSavings,
    totalWithdrawals,
    monthExhausted,
    trajectory,
  }
}

/**
 * Compare strategy Net BTC vs HODL BTC at the end of simulation.
 *
 * "Net BTC" for the strategy = total BTC held minus debt-equivalent BTC
 * (totalBtc - debt / finalPrice). This is what the investor would walk
 * away with after paying off all loans at the final price.
 *
 * HODL has no debt, so HODL Net BTC = HODL finalBtc.
 */
export interface VsHodlComparison {
  /** Strategy's net BTC at end (totalBtc − debt/finalPrice) */
  strategyNetBtc: number
  /** HODL final BTC */
  hodlBtc: number
  /** strategyNetBtc − hodlBtc; positive means strategy beat HODL */
  deltaBtc: number
  /** delta / hodlBtc × 100; positive means outperformance */
  deltaPercent: number
  /** Did the strategy beat HODL? */
  outperformed: boolean
}

export function compareVsHodl(
  strategyTotalBtc: number,
  strategyTotalDebtUsd: number,
  finalBtcPrice: number,
  hodlFinalBtc: number
): VsHodlComparison {
  const debtBtc = finalBtcPrice > 0 ? strategyTotalDebtUsd / finalBtcPrice : 0
  const strategyNetBtc = strategyTotalBtc - debtBtc
  const deltaBtc = strategyNetBtc - hodlFinalBtc
  const deltaPercent = hodlFinalBtc > 0 ? (deltaBtc / hodlFinalBtc) * 100 : 0

  return {
    strategyNetBtc,
    hodlBtc: hodlFinalBtc,
    deltaBtc,
    deltaPercent,
    outperformed: deltaBtc > 0,
  }
}
