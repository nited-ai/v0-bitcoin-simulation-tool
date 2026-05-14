/**
 * RolloverPolicyService
 *
 * Pure decision logic for what happens when a Rolling Loan matures:
 * refinance, top-up (move unlocked BTC into collateral), or force-sell BTC.
 *
 * Design principle (per project owner):
 *   "As long as the investor has enough collateral to top up, they should
 *    NOT be liquidated."
 *
 * Translation into rules:
 *   1. At rollover, the maximum permissible LTV is `rolloverMaxLtv`, not
 *      `targetLtv`. `targetLtv` is the *aspirational* LTV for new loans;
 *      `rolloverMaxLtv` sits between target and liquidation and answers
 *      "what's the highest LTV we'll refinance at before forcing a sale?"
 *   2. The collateral pool for this decision is locked + unlocked BTC.
 *      Unlocked BTC is implicitly available to be moved into locked (a
 *      "top-up at rollover") — selling only happens after that pool is
 *      exhausted at `rolloverMaxLtv`.
 *   3. Selling only kicks in when the old repayment exceeds the maximum
 *      principal the full stack can support at `rolloverMaxLtv`.
 *
 * Why a separate service: the hook (`useRollingLoanCalculations`) and the
 * strategy (`RollingLoanStrategy` via `StrategyExecutionService`) historically
 * had two divergent rollover implementations. Centralising the policy here
 * makes the math testable and the two call sites consistent.
 */

export interface RolloverPolicyInput {
  /** USD owed from the maturing loan (= old loanRepayment) */
  repaymentDue: number
  /** BTC currently pledged as collateral */
  lockedBtc: number
  /** BTC free (not pledged) — available for top-up at rollover */
  unlockedBtc: number
  /** Current BTC price in USD */
  btcPrice: number
  /**
   * Total cost factor for a new loan:
   *   1 + (originationFeePercent / 100) + (annualRate / 100 / 12) * termMonths
   * Encodes how much will eventually be owed per dollar of principal.
   */
  costFactor: number
  /** Target LTV for new loans (e.g. 40%) — aspirational */
  targetLtv: number
  /**
   * Max LTV permitted at rollover refinance (e.g. 68%).
   * Above this, we sell BTC. Below, we refinance.
   * Should sit between targetLtv and liquidationLtv.
   */
  rolloverMaxLtv: number
  /** Platform liquidation threshold (e.g. 80%) — for diagnostic only */
  liquidationLtv: number
  /**
   * User's preferred loan size as % of collateral (e.g. 15 → take 15% loan).
   * If set, drives the *target* new principal; cap still applies.
   * If unset, principal defaults to repaymentDue (pure refinance).
   */
  loanAmountPercent?: number
}

export interface RolloverPolicyOutput {
  /** BTC sold to reduce debt before refinancing (0 if pure refinance) */
  btcSold: number
  /** USD recovered from the sale (gross, no platform fees here) */
  usdRecovered: number
  /** Debt remaining after sale, before new loan is taken */
  remainingDebt: number
  /** Principal of the new loan */
  newPrincipal: number
  /** Collateral USD value after any sale */
  newCollateral: number
  /**
   * Resulting LTV (in %) after rollover, computed against the new repayment
   * (principal * costFactor) over the post-sale collateral.
   */
  resultingLtv: number
  /** Cash freed up by rollover (newPrincipal - remainingDebt, never < 0) */
  excessProceeds: number
  /** True if BTC had to be sold (debt exceeded rolloverMaxLtv cap) */
  forcedSale: boolean
  /** Describes the path taken — useful in UI tooltips and tests */
  outcome:
    | 'refinance-only'           // No sale, principal = at least repayment
    | 'refinance-with-excess'    // No sale, principal > repayment (loanAmountPercent)
    | 'force-sale'               // Sale needed to fit under rolloverMaxLtv
    | 'liquidation-territory'    // Even after max sale, LTV would exceed liquidationLtv
  reasoning: string
}

/**
 * Pure decision function. Given the rollover inputs, returns the action plan.
 * Does NOT mutate anything. Caller is responsible for applying the result
 * (updating lockedBtc/unlockedBtc/loans).
 */
export function decideRolloverAction(input: RolloverPolicyInput): RolloverPolicyOutput {
  const {
    repaymentDue,
    lockedBtc,
    unlockedBtc,
    btcPrice,
    costFactor,
    rolloverMaxLtv,
    liquidationLtv,
    loanAmountPercent,
  } = input

  if (btcPrice <= 0 || costFactor <= 0) {
    return zeroOutput('Invalid price or cost factor; cannot compute rollover')
  }

  const totalBtc = lockedBtc + unlockedBtc
  const collateralUsd = totalBtc * btcPrice
  const rolloverLtvDec = rolloverMaxLtv / 100
  const liquidationLtvDec = liquidationLtv / 100

  // Maximum principal the full stack can support at rolloverMaxLtv,
  // accounting for the fact that the *eventual* repayment will be
  // principal × costFactor. So principal_cap × costFactor / collateral ≤ rolloverLtv.
  const principalCap = collateralUsd > 0
    ? (collateralUsd * rolloverLtvDec) / costFactor
    : 0

  // ─── Case A: Refinance only ─────────────────────────────────────────────
  if (repaymentDue <= principalCap) {
    // Target principal: user's loanAmountPercent if set, else just cover old debt
    let targetPrincipal: number
    if (loanAmountPercent !== undefined && loanAmountPercent > 0) {
      // Interpret loanAmountPercent as desired LTV after this new loan settles.
      // principal × costFactor / collateral ≈ loanAmountPercent/100 → solve for principal.
      targetPrincipal = (collateralUsd * (loanAmountPercent / 100)) / costFactor
    } else {
      targetPrincipal = repaymentDue
    }

    // Take at least repaymentDue (must refinance) and at most principalCap
    const newPrincipal = Math.min(
      Math.max(repaymentDue, targetPrincipal),
      principalCap
    )

    const newRepayment = newPrincipal * costFactor
    const resultingLtv = collateralUsd > 0 ? (newRepayment / collateralUsd) * 100 : 0

    const hasExcess = newPrincipal > repaymentDue
    return {
      btcSold: 0,
      usdRecovered: 0,
      remainingDebt: repaymentDue,
      newPrincipal,
      newCollateral: collateralUsd,
      resultingLtv,
      excessProceeds: Math.max(0, newPrincipal - repaymentDue),
      forcedSale: false,
      outcome: hasExcess ? 'refinance-with-excess' : 'refinance-only',
      reasoning: hasExcess
        ? `Refinancing $${round(repaymentDue)} → $${round(newPrincipal)} at ${resultingLtv.toFixed(1)}% LTV (within ${rolloverMaxLtv}% cap); $${round(newPrincipal - repaymentDue)} excess proceeds`
        : `Refinancing old debt $${round(repaymentDue)} at ${resultingLtv.toFixed(1)}% LTV (within ${rolloverMaxLtv}% cap)`,
    }
  }

  // ─── Case B: Forced sale needed ─────────────────────────────────────────
  // Old debt exceeds what the full stack can refinance at rolloverMaxLtv.
  // Sell enough BTC so that (debt - sale_usd) = (collateral - sale_usd) × rolloverLtvDec / costFactor
  // Solving for sale_usd:
  //   debt - sale = (collateral - sale) × r            where r = rolloverLtvDec / costFactor
  //   debt - sale = collateral × r - sale × r
  //   debt - collateral × r = sale - sale × r
  //   sale × (1 - r) = debt - collateral × r
  //   sale = (debt - collateral × r) / (1 - r)
  const r = rolloverLtvDec / costFactor
  const saleUsd = Math.max(0, (repaymentDue - collateralUsd * r) / (1 - r))
  const btcSold = saleUsd / btcPrice
  const newCollateral = Math.max(0, collateralUsd - saleUsd)
  const remainingDebt = Math.max(0, repaymentDue - saleUsd)

  // After sale, refinance the remaining debt
  const newPrincipal = remainingDebt
  const newRepayment = newPrincipal * costFactor
  const resultingLtv = newCollateral > 0 ? (newRepayment / newCollateral) * 100 : 0

  // Diagnostic: is the resulting LTV still above liquidation? Means the
  // sale was insufficient (shouldn't happen by the math, but mark it).
  const inLiquidationZone = resultingLtv > liquidationLtv

  return {
    btcSold,
    usdRecovered: saleUsd,
    remainingDebt,
    newPrincipal,
    newCollateral,
    resultingLtv,
    excessProceeds: 0,
    forcedSale: true,
    outcome: inLiquidationZone ? 'liquidation-territory' : 'force-sale',
    reasoning: inLiquidationZone
      ? `LIQUIDATION ZONE: even after selling ${btcSold.toFixed(4)} BTC ($${round(saleUsd)}), LTV ${resultingLtv.toFixed(1)}% exceeds liquidation threshold ${liquidationLtv}%`
      : `Sold ${btcSold.toFixed(4)} BTC ($${round(saleUsd)}) to bring debt under ${rolloverMaxLtv}% LTV cap; refinanced $${round(newPrincipal)} at ${resultingLtv.toFixed(1)}% LTV`,
  }
}

function round(n: number): number {
  return Math.round(n)
}

function zeroOutput(reasoning: string): RolloverPolicyOutput {
  return {
    btcSold: 0,
    usdRecovered: 0,
    remainingDebt: 0,
    newPrincipal: 0,
    newCollateral: 0,
    resultingLtv: 0,
    excessProceeds: 0,
    forcedSale: false,
    outcome: 'refinance-only',
    reasoning,
  }
}

/**
 * Compute the canonical loan cost factor used throughout the strategy.
 * For a loan of principal P, the total owed at maturity is P * costFactor.
 */
export function computeCostFactor(
  originationFeePercent: number,
  annualInterestRate: number,
  loanTermMonths: number
): number {
  const fee = (originationFeePercent || 0) / 100
  const monthlyRate = (annualInterestRate || 0) / 100 / 12
  const term = loanTermMonths === Infinity ? 12 : (loanTermMonths || 0)
  return 1 + fee + monthlyRate * term
}

/**
 * Default rollover cap if the user hasn't configured one explicitly.
 * Sits halfway between target and liquidation, leaning toward not selling.
 */
export function defaultRolloverMaxLtv(targetLtv: number, liquidationLtv: number): number {
  // 70% of the way from target to liquidation. With target=40, liquidation=80
  // this gives 68% — generous enough to avoid sales on normal volatility,
  // leaves ~12pp buffer to liquidation.
  return targetLtv + (liquidationLtv - targetLtv) * 0.7
}
