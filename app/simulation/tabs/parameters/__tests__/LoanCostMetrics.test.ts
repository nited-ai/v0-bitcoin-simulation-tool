import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { CalculationsService, useCalculations, type SimulationParams } from '../calculationsService'

const defaults: SimulationParams = {
  initialBtcAmount: 1,
  initialBtcPrice: 100_000,
  loanAmountPercent: 15,
  platform: 'firefish',
  originationFeePercent: 1.5,
  originationFeeType: 'annual',
  maxInitialLtv: 50,
  availableLoanTerms: [6, 12, 24],
  riskManagement: {
    targetLtv: 50,
    maxLoanAmount: 50_000,
    annualInterestRate: 6.5,
    loanTermMonths: 12,
    liquidationFeePercent: 5,
    liquidationLtv: 80,
  },
}

describe('Initial credit preview', () => {
  const service = new CalculationsService()
  beforeEach(() => service.clearCache())

  it('finances origination fees but not future interest in opening debt and collateral', () => {
    const result = service.calculateAll(defaults, 125_000)
    expect(result.loan.initialCurrentLoanAmount).toBe(15_000)
    expect(result.loan.initialOriginationFee).toBe(225)
    expect(result.loan.initialTotalLoanCost).toBe(15_225)
    expect(result.collateral.initialLockedCollateralBtc).toBeCloseTo(0.3045)
    expect(result.collateral.initialFreeCollateralBtc).toBeCloseTo(0.6955)
    expect(result.liquidation.initialImmediateLiquidationPrice).toBeCloseTo(62_500)
    expect(result.liquidation.initialTrueLiquidationPrice).toBeCloseTo(19_031.25)
    expect(result.loan.initialTotalInterestPayment).toBeCloseTo(989.625)
    expect(result.loan.initialMonthlyInterestPayment).toBeCloseTo(82.46875)
  })

  it('does not change initial debt or liquidation thresholds when only interest changes', () => {
    const highInterest = { ...defaults, riskManagement: { ...defaults.riskManagement, annualInterestRate: 40 } }
    expect(service.calculateCollateralMetrics(highInterest)).toEqual(service.calculateCollateralMetrics(defaults))
    expect(service.calculateLiquidationMetrics(highInterest, 125_000)).toEqual(service.calculateLiquidationMetrics(defaults, 125_000))
    expect(service.calculateLoanMetrics(highInterest).initialTotalLoanCost).toBe(15_225)
  })

  it.each([[6, 112.5], [24, 450]])('prorates annual fees for %s months', (term, fee) => {
    const params = { ...defaults, riskManagement: { ...defaults.riskManagement, loanTermMonths: term } }
    expect(service.calculateLoanMetrics(params).initialOriginationFee).toBe(fee)
  })

  it('applies a one-time fee only once regardless of term', () => {
    const params: SimulationParams = { ...defaults, originationFeeType: 'one-time', riskManagement: { ...defaults.riskManagement, loanTermMonths: 24 } }
    expect(service.calculateLoanMetrics(params).initialOriginationFee).toBe(225)
  })

  it('caps the advance so financed fees remain inside the maximum debt amount', () => {
    const params = { ...defaults, riskManagement: { ...defaults.riskManagement, maxLoanAmount: 10_000 } }
    const result = service.calculateAll(params, 125_000)
    expect(result.loan.initialCurrentLoanAmount).toBeCloseTo(10_000 / 1.015)
    expect(result.loan.initialTotalLoanCost).toBeCloseTo(10_000)
    expect(result.loan.initialMaxLoanCapacity).toBeCloseTo(10_000 / 1.015)
    expect(result.loan.initialAvailableBorrowingCapacity).toBe(0)
    expect(result.collateral.initialLockedCollateralBtc).toBeCloseTo(0.2)
  })

  it.each([[30, 50, 30_000], [70, 40, 40_000]])('caps debt at target %s%% and platform maximum %s%%', (target, maxLtv, debt) => {
    const params = { ...defaults, loanAmountPercent: 100, maxInitialLtv: maxLtv, riskManagement: { ...defaults.riskManagement, targetLtv: target } }
    const result = service.calculateAll(params, 125_000)
    expect(result.loan.initialTotalLoanCost).toBeCloseTo(debt)
    expect(result.collateral.initialLockedCollateralBtc).toBeCloseTo(1)
    expect(result.collateral.initialFreeCollateralBtc).toBeCloseTo(0)
    expect(result.liquidation.initialImmediateLiquidationPrice).toBeCloseTo(debt / 0.8)
    expect(result.liquidation.initialTrueLiquidationPrice).toBeCloseTo(debt / 0.8)
    expect(service.validateCollateralSufficiency(params).isSufficient).toBe(true)
  })

  it('supports open terms with one-time fees and a separate one-year interest reference', () => {
    const params: SimulationParams = { ...defaults, originationFeeType: 'one-time', riskManagement: { ...defaults.riskManagement, loanTermMonths: Infinity } }
    expect(service.validateParameters(params).isValid).toBe(true)
    expect(service.calculateLoanMetrics(params).initialTotalLoanCost).toBe(15_225)
    expect(service.calculateLoanMetrics(params).initialTotalInterestPayment).toBeCloseTo(989.625)
    expect(service.calculateCollateralMetrics(params).initialLockedCollateralBtc).toBeCloseTo(0.3045)
  })

  it('rejects nonzero annual fees without a finite term but permits zero fees', () => {
    const params = { ...defaults, riskManagement: { ...defaults.riskManagement, loanTermMonths: Infinity } }
    expect(service.validateParameters(params).isValid).toBe(false)
    expect(() => service.calculateLoanMetrics(params)).toThrow('Open-ended loans require a one-time origination fee')
    expect(service.calculateLoanMetrics({ ...params, originationFeePercent: 0 }).initialTotalLoanCost).toBe(15_000)
  })

  it('leaves all BTC free and both liquidation thresholds zero without borrowing', () => {
    const params = { ...defaults, loanAmountPercent: 0 }
    const result = service.calculateAll(params, 125_000)
    expect(result.loan.initialTotalLoanCost).toBe(0)
    expect(result.loan.initialTotalInterestPayment).toBe(0)
    expect(result.collateral.initialLockedCollateralBtc).toBe(0)
    expect(result.collateral.initialFreeCollateralBtc).toBe(1)
    expect(result.liquidation.initialImmediateLiquidationPrice).toBe(0)
    expect(result.liquidation.initialTrueLiquidationPrice).toBe(0)
  })

  it('keeps financed fees when the interest rate is zero', () => {
    const params = { ...defaults, riskManagement: { ...defaults.riskManagement, annualInterestRate: 0 } }
    const result = service.calculateLoanMetrics(params)
    expect(result.initialTotalInterestPayment).toBe(0)
    expect(result.initialTotalLoanCost).toBe(15_225)
  })

  it('reacts to fee, maximum LTV, and liquidation threshold edits without changing other inputs', () => {
    const { result, rerender } = renderHook(({ params }) => useCalculations(params), { initialProps: { params: defaults } })
    const newFee = { ...defaults, originationFeePercent: 3 }
    rerender({ params: newFee })
    expect(result.current?.loan.initialTotalLoanCost).toBe(15_450)
    const newLimit = { ...newFee, maxInitialLtv: 10 }
    rerender({ params: newLimit })
    expect(result.current?.loan.initialTotalLoanCost).toBeCloseTo(10_000)
    rerender({ params: { ...newLimit, riskManagement: { ...newLimit.riskManagement, liquidationLtv: 90 } } })
    expect(result.current?.liquidation.initialImmediateLiquidationPrice).toBeCloseTo(10_000 / 0.9)
  })
})
