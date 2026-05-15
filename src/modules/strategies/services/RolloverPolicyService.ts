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
   * Optional user-set cap on the new loan size (as % of collateral). If set
   * AND less than `targetLtv`, it caps the refinance from above (more
   * conservative leverage at rollover than the strategic target). If
   * unset or higher than targetLtv, `targetLtv` drives the aim.
   *
   * Why: `targetLtv` is the strategic LTV the rolling-loan strategy aims
   * to maintain; `loanAmountPercent` exists as a UI-level cap for users who
   * want less leverage than the strategic target during refinance. At
   * rollover we never EXCEED what the user asked for, but we will EXCEED
   * `targetLtv` if the old debt forces it (up to rolloverMaxLtv).
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
    targetLtv,
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
  // Target principal: aim for `targetLtv` (the strategic LTV goal). Only when
  // the old debt won't fit at targetLtv do we exceed it — and even then only
  // up to `principalCap` (= rolloverMaxLtv). The optional `loanAmountPercent`
  // is honored as a SMALLER ceiling: if the user wants conservative leverage
  // at rollover (e.g. 15% LTV target), we cap there even if targetLtv would
  // allow more.
  if (repaymentDue <= principalCap) {
    // Principal that would land us exactly at targetLtv
    const principalAtTargetLtv = (collateralUsd * (targetLtv / 100)) / costFactor

    // Principal that would land us exactly at loanAmountPercent (if specified).
    // Treated as a conservative upper bound on the *new loan size* the user
    // wants to carry at rollover, not as the target itself.
    const principalAtUserCap =
      loanAmountPercent !== undefined && loanAmountPercent > 0
        ? (collateralUsd * (loanAmountPercent / 100)) / costFactor
        : Infinity

    // Aim for targetLtv, but never exceed loanAmountPercent if user set it,
    // and always cover at least the old repayment (must roll the debt).
    // Then cap the whole thing at the rollover hard cap.
    const aimed = Math.min(principalAtTargetLtv, principalAtUserCap)
    const newPrincipal = Math.min(
      Math.max(repaymentDue, aimed),
      principalCap
    )

    const newRepayment = newPrincipal * costFactor
    const resultingLtv = collateralUsd > 0 ? (newRepayment / collateralUsd) * 100 : 0

    const hasExcess = newPrincipal > repaymentDue
    // We "had to" exceed targetLtv if the old debt forced us above it
    const exceededTarget = resultingLtv > targetLtv + 0.5 // tolerance for FP
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
        ? `Refinancing $${round(repaymentDue)} → $${round(newPrincipal)} at ${resultingLtv.toFixed(1)}% LTV (target ${targetLtv}%); $${round(newPrincipal - repaymentDue)} excess proceeds`
        : exceededTarget
          ? `Refinancing old debt $${round(repaymentDue)} at ${resultingLtv.toFixed(1)}% LTV (exceeds target ${targetLtv}% but within rollover cap ${rolloverMaxLtv}%)`
          : `Refinancing old debt $${round(repaymentDue)} at ${resultingLtv.toFixed(1)}% LTV (at or below target ${targetLtv}%)`,
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
  const rawSaleUsd = (1 - r) > 0
    ? Math.max(0, (repaymentDue - collateralUsd * r) / (1 - r))
    : collateralUsd
  // Can't sell more BTC than the investor actually holds.
  const saleUsd = Math.min(collateralUsd, rawSaleUsd)
  const btcSold = btcPrice > 0 ? saleUsd / btcPrice : 0
  const newCollateral = Math.max(0, collateralUsd - saleUsd)
  const remainingDebt = Math.max(0, repaymentDue - saleUsd)

  // After sale, refinance the remaining debt
  const newPrincipal = remainingDebt
  const newRepayment = newPrincipal * costFactor
  const resultingLtv = newCollateral > 0 ? (newRepayment / newCollateral) * 100 : 0

  // Diagnostic: is the resulting LTV still above liquidation OR did we need
  // to sell more than we have? Either means the debt has overwhelmed the
  // collateral — true insolvency at this rollover.
  const inLiquidationZone = resultingLtv > liquidationLtv || rawSaleUsd > collateralUsd + 0.5

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
 * For a finite-term loan of principal P, the total owed at maturity is
 * P × costFactor (origination fee + simple interest over the term).
 *
 * For infinite-term loans the cost factor is just 1 + fee — interest is
 * accrued monthly during the simulation loop, not baked in upfront. This
 * matches the actual mechanics of an interest-only / negative-amortization
 * loan (where future interest is not owed up front).
 */
export function computeCostFactor(
  originationFeePercent: number,
  annualInterestRate: number,
  loanTermMonths: number
): number {
  const fee = (originationFeePercent || 0) / 100
  const monthlyRate = (annualInterestRate || 0) / 100 / 12
  if (loanTermMonths === Infinity) {
    // No maturity → no term-based interest baked in. Caller is responsible
    // for accruing `monthlyRate × principal` each month.
    return 1 + fee
  }
  const term = loanTermMonths || 0
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
