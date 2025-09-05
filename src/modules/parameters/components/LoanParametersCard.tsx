"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HybridTooltip, HybridTooltipContent, HybridTooltipTrigger } from "@/components/ui/hybrid-tooltip"
import { Button } from "@/components/ui/button"
import { CreditCard, Info, Calendar, DollarSign, Percent, Calculator, Receipt, TrendingUp } from "lucide-react"
import { NumberInput } from "@/shared/ui/forms/NumberInput"
import { useSimulation } from "../../context/SimulationContext"
import { useLoanCalculations, useCollateralCalculations, useLiquidationCalculations } from "../../hooks/useCalculationsIntegration"
import { CalculationsErrorBoundary } from "./CalculationsErrorBoundary"
import { getPlatformConfig } from "../../constants/platformPresets"
import { ValidationAlert } from "./ValidationAlert"
import { COMPONENT_FIELDS } from "./validationFieldMapping"

/**
 * Loan Parameters Card Component
 *
 * Handles all loan-specific settings including platform selection,
 * interest rates, fees, and risk management parameters.
 */
export function LoanParametersCard() {
  const { t } = useTranslation()
  const { params, setParams, markParameterAsManual } = useSimulation()

  // Use centralized calculations
  const loanData = useLoanCalculations()
  const collateralData = useCollateralCalculations()
  const liquidationData = useLiquidationCalculations()

  // Get current platform configuration
  const platformConfig = getPlatformConfig(params.platform)

  // State for loan amount input mode (percentage vs USD)
  const [loanInputMode, setLoanInputMode] = useState<'percentage' | 'usd'>('percentage')

  /**
   * Handle parameter updates
   */
  const updateParam = (key: string, value: number) => {
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
  }

  // Calculate total BTC stack value for conversions
  const totalStackValue = params.initialBtcAmount * params.initialBtcPrice

  // Convert between percentage and USD values
  const convertPercentageToUsd = (percentage: number) => {
    return (percentage / 100) * totalStackValue
  }

  const convertUsdToPercentage = (usdAmount: number) => {
    return totalStackValue > 0 ? (usdAmount / totalStackValue) * 100 : 0
  }

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
                {t('LoanParameters.initialLtv.label', 'Initial LTV')} (max {platformConfig.maxInitialLtv}%)
                <HybridTooltip>
                  <HybridTooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </HybridTooltipTrigger>
                  <HybridTooltipContent>
                    <p>{t('LoanParameters.tooltips.initialLtv', 'Loan-to-Value ratio - percentage of collateral value that can be borrowed')}</p>
                    <p>{t('LoanParameters.tooltips.initialLtvMax', 'Maximum allowed by {{platform}} platform: {{maxLtv}}%', {
                      platform: platformConfig.name,
                      maxLtv: platformConfig.maxInitialLtv
                    })}</p>
                  </HybridTooltipContent>
                </HybridTooltip>
              </Label>
              <NumberInput
                value={params.riskManagement.targetLtv}
                onChange={(value) => updateParam("riskManagement.targetLtv", value)}
                min={1}
                max={platformConfig.maxInitialLtv}
                step={1}
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
                    <p>{t('LoanParameters.tooltips.interestRate', 'Yearly interest rate charged on the loan amount, compounded over the loan term')}</p>
                  </HybridTooltipContent>
                </HybridTooltip>
              </Label>
              <NumberInput
                value={params.annualInterestRate}
                onChange={(value) => updateParam("annualInterestRate", value)}
                min={0}
                max={50}
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
                  {t('LoanParameters.loanAmountBreakdown', 'Loan Amount')}
                  <HybridTooltip>
                    <HybridTooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-help" />
                    </HybridTooltipTrigger>
                    <HybridTooltipContent>
                      <p>{t('LoanParameters.tooltips.loanAmountBreakdown', 'Initial loan principal amount')}</p>
                      <p className="text-xs text-muted-foreground">
                        {params.loanAmountPercent.toFixed(2)}{t('LoanParameters.percentOf', '% of')} {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(params.initialBtcAmount * params.initialBtcPrice)}
                      </p>
                    </HybridTooltipContent>
                  </HybridTooltip>
                </Label>
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
                  <div className="text-lg font-semibold text-green-700 dark:text-green-300">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(loanData?.initialCurrentLoanAmount || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {params.loanAmountPercent.toFixed(2)}{t('LoanParameters.percentOf', '% of')} {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(params.initialBtcAmount * params.initialBtcPrice)}
                  </div>
                </div>
              </div>

              {/* Total Interest */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs">
                  <TrendingUp className="w-3 h-3 text-blue-500" />
                  {t('LoanParameters.totalInterest', 'Total Interest')}
                  <HybridTooltip>
                    <HybridTooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-help" />
                    </HybridTooltipTrigger>
                    <HybridTooltipContent>
                      <p>{t('LoanParameters.tooltips.totalInterest', 'Total interest paid over the loan term')}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('LoanParameters.tooltips.totalInterestFormula', 'Formula: Loan Amount × Annual Rate × Term (months) ÷ 12')}
                      </p>
                    </HybridTooltipContent>
                  </HybridTooltip>
                </Label>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                  <div className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(loanData?.initialTotalInterestPayment || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(loanData?.initialMonthlyInterestPayment || 0)} {params.loanTermMonths === Infinity ? '∞' : t('LoanParameters.forMonths', 'for {{count}} months', { count: params.loanTermMonths })}
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
                        {platformConfig.originationFeeType === 'one-time'
                          ? t('LoanParameters.tooltips.originationFeeOneTime', 'One-time fee charged when the loan is originated')
                          : t('LoanParameters.tooltips.originationFeeAnnual', 'Annual fee charged throughout the loan term')
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('LoanParameters.tooltips.originationFeeFormula', 'Formula: Loan Amount × Platform Origination Fee %')}
                        {platformConfig.originationFeeType === 'annual' && t('LoanParameters.tooltips.originationFeeFormulaAnnual', ' × Loan Term (years)')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('LoanParameters.tooltips.feeType', 'Fee Type')}: {platformConfig.originationFeeType === 'one-time' ? t('LoanParameters.tooltips.oneTime', 'One-time') : t('LoanParameters.tooltips.annualPA', 'Annual (p.a.)')}
                      </p>
                    </HybridTooltipContent>
                  </HybridTooltip>
                </Label>
                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-md border border-orange-200 dark:border-orange-800">
                  <div className="text-lg font-semibold text-orange-700 dark:text-orange-300">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(loanData?.initialOriginationFee || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {platformConfig.originationFeePercent}% {platformConfig.originationFeeType === 'annual' ? t('LoanParameters.tooltips.annualPA', 'p.a.') : ''} of {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(loanData?.initialCurrentLoanAmount || 0)}
                  </div>
                </div>
              </div>

              {/* Total Repayment Amount */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs">
                  <CreditCard className="w-3 h-3 text-red-500" />
                  {t('LoanParameters.totalRepayment', 'Total Repayment')}
                  <HybridTooltip>
                    <HybridTooltipTrigger asChild>
                      <Info className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-help" />
                    </HybridTooltipTrigger>
                    <HybridTooltipContent>
                      <p>{t('LoanParameters.tooltips.totalRepayment', "Total amount you'll pay back over the loan term")}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('LoanParameters.tooltips.totalRepaymentFormula', 'Formula: Loan Principal + Origination Fee + Total Interest')}
                      </p>
                    </HybridTooltipContent>
                  </HybridTooltip>
                </Label>
                <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-800">
                  <div className="text-lg font-semibold text-red-700 dark:text-red-300">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(loanData?.initialTotalLoanCost || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t('LoanParameters.loanPlusCosts', 'Loan + {{costs}} costs', {
                      costs: new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(((loanData?.initialOriginationFee || 0) + (loanData?.initialTotalInterestPayment || 0)))
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
