"use client"

import React, { useState, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HybridTooltip, HybridTooltipContent, HybridTooltipTrigger } from "@/components/ui/hybrid-tooltip"
import { Button } from "@/components/ui/button"
import { CreditCard, Info, Calendar, DollarSign, Percent, Calculator, Receipt, TrendingUp } from "lucide-react"
import { NumberInput } from "../../../../shared/ui/forms/NumberInput"
import { useSimulation } from "../../context/SimulationContext"
import { useLoanCalculations, useCollateralCalculations, useLiquidationCalculations } from "../../hooks/useCalculationsIntegration"
import { CalculationsErrorBoundary } from "./CalculationsErrorBoundary"
import { getPlatformConfig } from "../../constants/platformPresets"
import { ValidationAlert } from "./ValidationAlert"
import { COMPONENT_FIELDS } from "./validationFieldMapping"
import { useLocaleNumberFormat } from "@/shared/utils/localeNumberFormat"

/**
 * Loan Parameters Card Component
 *
 * Handles all loan-specific settings including platform selection,
 * interest rates, fees, and risk management parameters.
 */
export function LoanParametersCard() {
  const { t } = useTranslation()
  const { params, setParams, markParameterAsManual } = useSimulation()
  const { formatCurrency } = useLocaleNumberFormat()

  // Use centralized calculations
  const loanData = useLoanCalculations()
  const collateralData = useCollateralCalculations()
  const liquidationData = useLiquidationCalculations()

  // Get current platform configuration
  const platformConfig = getPlatformConfig(params.platform)

  // State for loan amount input mode (percentage vs USD)
  const [loanInputMode, setLoanInputMode] = useState<'percentage' | 'usd'>('percentage')

  /**
   * Handle parameter updates (memoized to prevent re-renders)
   */
  const updateParam = useCallback((key: string, value: number) => {
    if (key.includes('.')) {
      // Handle nested parameter updates (e.g., "riskManagement.targetLtv")
      const [parentKey, childKey] = key.split('.')
      setParams((current) => ({
        ...current,
        [parentKey]: {
          ...(current[parentKey as keyof typeof current] as any),
          [childKey]: value
        }
      }))
    } else {
      setParams((current) => ({
        ...current,
        [key]: value
      }))
    }
    // Mark parameter as manually edited
    markParameterAsManual(key)
  }, [setParams, markParameterAsManual])

  // Calculate total BTC stack value for conversions (memoized)
  const totalStackValue = useMemo(() =>
    params.initialBtcAmount * params.initialBtcPrice,
    [params.initialBtcAmount, params.initialBtcPrice]
  )

  // Convert between percentage and USD values (memoized)
  const convertPercentageToUsd = useCallback((percentage: number) => {
    return (percentage / 100) * totalStackValue
  }, [totalStackValue])

  const convertUsdToPercentage = useCallback((usdAmount: number) => {
    return totalStackValue > 0 ? (usdAmount / totalStackValue) * 100 : 0
  }, [totalStackValue])

  // Get current display value based on input mode
  const getCurrentDisplayValue = () => {
    if (loanInputMode === 'percentage') {
      return params.loanAmountPercent
    } else {
      return convertPercentageToUsd(params.loanAmountPercent)
    }
  }

  // Handle loan amount input changes
  const handleLoanAmountChange = (value: number) => {
    let percentageValue: number

    if (loanInputMode === 'percentage') {
      percentageValue = value
    } else {
      percentageValue = convertUsdToPercentage(value)
    }

    updateParam("loanAmountPercent", percentageValue)
  }

  // Toggle between input modes
  const toggleInputMode = () => {
    setLoanInputMode(prev => prev === 'percentage' ? 'usd' : 'percentage')
  }

  // Get calculated values from centralized service with fallbacks
  const loanAmountUsd = loanData?.initialCurrentLoanAmount || 0
  const originationFeeUsd = loanData?.initialOriginationFee || 0
  const collateralBtcAmount = collateralData?.initialLockedCollateralBtc || 0
  const isCollateralSufficient = collateralData?.isSufficient || false
  const liquidationPrice = liquidationData?.initialImmediateLiquidationPrice || 0

  return (
    <CalculationsErrorBoundary>
      <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              {t('LoanParameters.title')}
            </CardTitle>
            {/* Validation alerts for loan-related errors */}
            <ValidationAlert fields={COMPONENT_FIELDS.LoanParametersCard} className="mt-3" />
          </CardHeader>

        <CardContent className="space-y-6">
          {/* Row 1: Loan Amount + Initial LTV */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Loan Amount with Toggle */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                {t('LoanParameters.loanAmount.label', 'Loan Amount')}
                <HybridTooltip>
                  <HybridTooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </HybridTooltipTrigger>
                  <HybridTooltipContent>
                    <p>
                      {loanInputMode === 'percentage'
                        ? t('LoanParameters.tooltips.loanAmountPercentage', 'Percentage of your total BTC stack value to use as loan amount')
                        : t('LoanParameters.tooltips.loanAmountDirect', 'Direct USD amount to borrow')
                      }
                    </p>
                  </HybridTooltipContent>
                </HybridTooltip>
              </Label>
              <div className="flex gap-2">
                <NumberInput
                  value={getCurrentDisplayValue()}
                  onChange={handleLoanAmountChange}
                  min={loanInputMode === 'percentage' ? 1 : 100}
                  max={loanInputMode === 'percentage' ? 100 : totalStackValue}
                  step={loanInputMode === 'percentage' ? 1 : 100}
                  decimals={loanInputMode === 'percentage' ? 1 : 2}
                  placeholder={loanInputMode === 'percentage' ? "15" : "15,000"}
                  suffix={loanInputMode === 'percentage' ? t('LoanParameters.percentOfBtcStack', '% of BTC stack') : "$"}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={toggleInputMode}
                  className="shrink-0"
                  title={`Switch to ${loanInputMode === 'percentage' ? 'USD' : 'percentage'} input`}
                >
                  {loanInputMode === 'percentage' ? (
                    <DollarSign className="w-4 h-4" />
                  ) : (
                    <Percent className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Initial LTV */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                {t('LoanParameters.initialLtv.label', 'Initial LTV')} (max {params.maxInitialLtv}%)
                <HybridTooltip>
                  <HybridTooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </HybridTooltipTrigger>
                  <HybridTooltipContent>
                    <p>{t('LoanParameters.tooltips.initialLtv', 'Loan-to-Value ratio - percentage of collateral value that can be borrowed')}</p>
                    <p>{t('LoanParameters.tooltips.initialLtvMax', 'Maximum allowed by {{platform}} platform: {{maxLtv}}%', {
                      platform: platformConfig.name,
                      maxLtv: params.maxInitialLtv
                    })}</p>
                  </HybridTooltipContent>
                </HybridTooltip>
              </Label>
              <NumberInput
                value={params.riskManagement.targetLtv}
                onChange={(value) => updateParam("riskManagement.targetLtv", value)}
                min={1}
                max={params.maxInitialLtv}
                step={1}
                decimals={1}
                placeholder="50"
                suffix="%"
              />
            </div>
          </div>

          {/* Row 2: Annual Interest Rate + Loan Term */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                {t('LoanParameters.interestRate.label', 'Annual Interest Rate')}
                <HybridTooltip>
                  <HybridTooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </HybridTooltipTrigger>
                  <HybridTooltipContent>
                    <p>{t('LoanParameters.tooltips.dailyInterest', 'Interest accrues daily on outstanding debt, including financed fees. Future interest is not included in the opening debt or initial collateral.')}</p>
                  </HybridTooltipContent>
                </HybridTooltip>
              </Label>
              <NumberInput
                value={params.annualInterestRate}
                onChange={(value) => updateParam("annualInterestRate", value)}
                min={0}
                max={50}
                decimals={2}
                step={0.1}
                placeholder="6.5"
                suffix="%"
              />
            </div>

            {/* Loan Term */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t('LoanParameters.loanTerm.label', 'Loan Term')}
                <HybridTooltip>
                  <HybridTooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </HybridTooltipTrigger>
                  <HybridTooltipContent>
                    <p>{t('LoanParameters.tooltips.loanTerm', "Duration of the loan repayment period. Choose 'Infinity' for interest-only loans with no fixed repayment schedule")}</p>
                  </HybridTooltipContent>
                </HybridTooltip>
              </Label>
              <Select
                value={params.loanTermMonths === Infinity ? "infinity" : (params.loanTermMonths?.toString() || "6")}
                onValueChange={(value) => updateParam("loanTermMonths", value === "infinity" ? Infinity : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select loan term" />
                </SelectTrigger>
                <SelectContent>
                  {platformConfig.availableLoanTerms.map((term) => (
                    <SelectItem
                      key={term}
                      value={term === 'infinity' ? 'infinity' : term.toString()}
                    >
                      {term === 'infinity' ? t('LoanParameters.infinity', 'Infinity') : t('LoanParameters.monthsUnit', '{{count}} months', { count: term })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loan Breakdown Section */}
          <div className="space-y-4 pt-6 border-t border-border">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">{t('LoanParameters.loanBreakdown', 'Loan Breakdown')}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Initial Loan Amount */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs">
                  <DollarSign className="w-3 h-3 text-green-500" />
                  {t('LoanParameters.netCashAdvance', 'Net Cash Advance')}
                  <HybridTooltip>
                    <HybridTooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-help" />
                    </HybridTooltipTrigger>
                    <HybridTooltipContent>
                      <p>{t('LoanParameters.tooltips.netCashAdvance', 'Cash available at the start. Borrowing limits apply to debt including financed origination fees, so the advance may be below the requested amount.')}</p>
                      <p className="text-xs text-muted-foreground">
                        {params.loanAmountPercent.toFixed(2)}{t('LoanParameters.percentOf', '% of')} {formatCurrency(params.initialBtcAmount * params.initialBtcPrice, 0)}
                      </p>
                    </HybridTooltipContent>
                  </HybridTooltip>
                </Label>
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
                  <div className="text-lg font-semibold text-green-700 dark:text-green-300" suppressHydrationWarning>
                    {formatCurrency(loanData?.initialCurrentLoanAmount || 0, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t('LoanParameters.requestedAmount', 'Requested: {{amount}}', { amount: formatCurrency(convertPercentageToUsd(params.loanAmountPercent), 0) })}
                  </div>
                </div>
              </div>

              {/* Total Interest */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs">
                  <TrendingUp className="w-3 h-3 text-blue-500" />
                  {params.loanTermMonths === Infinity
                    ? t('LoanParameters.referenceInterest', 'Interest Estimate (1 Year)')
                    : t('LoanParameters.estimatedInterest', 'Interest Estimate (Term)')}
                  <HybridTooltip>
                    <HybridTooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-help" />
                    </HybridTooltipTrigger>
                    <HybridTooltipContent>
                      <p>{t('LoanParameters.tooltips.estimatedInterest', 'Simple estimate assuming opening debt stays constant. Actual daily interest depends on repayments, additional borrowing and capitalization in the simulation.')}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('LoanParameters.tooltips.estimatedInterestFormula', 'Opening Debt × Annual Rate × Reference Months ÷ 12')}
                      </p>
                    </HybridTooltipContent>
                  </HybridTooltip>
                </Label>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                  <div className="text-lg font-semibold text-blue-700 dark:text-blue-300" suppressHydrationWarning>
                    {formatCurrency(loanData?.initialTotalInterestPayment || 0, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t('LoanParameters.monthlyInterestEstimate', '{{amount}} per month initially', { amount: formatCurrency(loanData?.initialMonthlyInterestPayment || 0, 0) })}
                  </div>
                </div>
              </div>

              {/* Origination Fee */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs">
                  <Receipt className="w-3 h-3 text-orange-500" />
                  {t('LoanParameters.originationFee', 'Origination Fee')}
                  <HybridTooltip>
                    <HybridTooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-help" />
                    </HybridTooltipTrigger>
                    <HybridTooltipContent>
                      <p>
                        {params.originationFeeType === 'one-time'
                          ? t('LoanParameters.tooltips.originationFeeOneTime', 'One-time fee charged when the loan is originated')
                          : t('LoanParameters.tooltips.originationFeeAnnual', 'Annual fee charged throughout the loan term')
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('LoanParameters.tooltips.originationFeeFormula', 'Formula: Loan Amount × Platform Origination Fee %')}
                        {params.originationFeeType === 'annual' && t('LoanParameters.tooltips.originationFeeFormulaAnnual', ' × Loan Term (years)')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('LoanParameters.tooltips.feeType', 'Fee Type')}: {params.originationFeeType === 'one-time' ? t('LoanParameters.tooltips.oneTime', 'One-time') : t('LoanParameters.tooltips.annualPA', 'Annual (p.a.)')}
                      </p>
                    </HybridTooltipContent>
                  </HybridTooltip>
                </Label>
                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-md border border-orange-200 dark:border-orange-800">
                  <div className="text-lg font-semibold text-orange-700 dark:text-orange-300" suppressHydrationWarning>
                    {formatCurrency(loanData?.initialOriginationFee || 0, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {params.originationFeePercent}% {params.originationFeeType === 'annual' ? t('LoanParameters.tooltips.annualPA', 'p.a.') : ''} of {formatCurrency(loanData?.initialCurrentLoanAmount || 0, 0)}
                  </div>
                </div>
              </div>

              {/* Opening debt, before interest accrues */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs">
                  <CreditCard className="w-3 h-3 text-red-500" />
                  {t('LoanParameters.openingDebt', 'Opening Debt')}
                  <HybridTooltip>
                    <HybridTooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-help" />
                    </HybridTooltipTrigger>
                    <HybridTooltipContent>
                      <p>{t('LoanParameters.tooltips.openingDebt', 'Debt at the start, before daily interest accrues. This balance determines the initial collateral and liquidation thresholds.')}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('LoanParameters.tooltips.openingDebtFormula', 'Net Cash Advance + Financed Origination Fee')}
                      </p>
                    </HybridTooltipContent>
                  </HybridTooltip>
                </Label>
                <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-800">
                  <div className="text-lg font-semibold text-red-700 dark:text-red-300" suppressHydrationWarning>
                    {formatCurrency(loanData?.initialTotalLoanCost || 0, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t('LoanParameters.advancePlusFees', 'Advance + {{costs}} fees', {
                      costs: formatCurrency(loanData?.initialOriginationFee || 0, 0)
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
    </CalculationsErrorBoundary>
  )
}
