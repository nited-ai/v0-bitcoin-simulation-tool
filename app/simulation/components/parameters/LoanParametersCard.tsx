"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CreditCard, Info, Calendar, DollarSign, Percent, AlertTriangle } from "lucide-react"
import { NumberInput } from "@/shared/ui/forms/NumberInput"
import { useSimulation } from "../../context/SimulationContext"
import { PlatformSelector } from "./PlatformSelector"

/**
 * Loan Parameters Card Component
 *
 * Handles all loan-specific settings including platform selection,
 * interest rates, fees, and risk management parameters.
 */
export function LoanParametersCard() {
  const { params, setParams } = useSimulation()

  /**
   * Handle parameter updates
   */
  const updateParam = (key: string, value: number) => {
    setParams((current) => ({
      ...current,
      [key]: value
    }))
  }

  /**
   * Handle nested parameter updates (for riskManagement)
   */
  const updateRiskParam = (key: string, value: number) => {
    setParams((current) => ({
      ...current,
      riskManagement: {
        ...current.riskManagement,
        [key]: value
      }
    }))
  }

  /**
   * Calculate max loan amount in USD based on percentage of BTC stack
   */
  const maxLoanAmountUsd = (params.maxLoanAmountPercent / 100) * (params.btcAmount * params.initialBtcPrice)

  /**
   * Calculate collateral BTC amount based on Initial LTV
   */
  const collateralBtcAmount = maxLoanAmountUsd / (params.initialBtcPrice * (params.riskManagement.targetLtv / 100))

  /**
   * Calculate correct liquidation price
   * Formula: liquidation_price = loan_amount / (collateral_btc_amount * liquidation_ltv)
   */
  const liquidationPrice = maxLoanAmountUsd / (collateralBtcAmount * (params.riskManagement.liquidationLtv / 100))

  return (
    <div className="space-y-6">
      {/* Platform Selector */}
      <PlatformSelector />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Loan Parameters
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Top Row: Max Loan Amount + Initial LTV */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Max Loan Amount (Percentage-based) - Moved to top */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Max Loan Amount
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Percentage of your total BTC stack value to use as maximum loan amount</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <NumberInput
                value={params.maxLoanAmountPercent}
                onChange={(value) => updateParam("maxLoanAmountPercent", value)}
                min={1}
                max={100}
                step={1}
                placeholder="15"
                suffix="% of BTC stack"
              />
            </div>

            {/* Initial LTV - Moved to top right */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Initial LTV
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Target Loan-to-Value ratio when taking out the loan</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <NumberInput
                value={params.riskManagement.targetLtv}
                onChange={(value) => updateRiskParam("targetLtv", value)}
                min={1}
                max={95}
                step={1}
                suffix="%"
                placeholder="50"
              />
            </div>
          </div>

          {/* Full-width helper text for Max Loan Amount */}
          <div className="text-xs text-muted-foreground !mt-2">
            = ${Math.round(maxLoanAmountUsd).toLocaleString()} (based on {params.btcAmount} BTC × ${params.initialBtcPrice.toLocaleString()}). Needed collateral: {collateralBtcAmount.toFixed(4)} BTC at {params.riskManagement.targetLtv}% Initial LTV
          </div>

          {/* Row 1: Annual Interest Rate + Origination Fee */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Annual Interest Rate
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Yearly interest rate charged on the loan amount, compounded over the loan term</p>
                  </TooltipContent>
                </Tooltip>
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

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Origination Fee
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>One-time fee charged when the loan is originated, calculated as percentage of loan amount</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <NumberInput
                value={params.loanOriginationFeePercent}
                onChange={(value) => updateParam("loanOriginationFeePercent", value)}
                min={0}
                max={10}
                step={0.1}
                placeholder="1.5"
                suffix="%"
              />
            </div>
          </div>

          {/* Row 2: Liquidation LTV + Liquidation Fee */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Liquidation LTV
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Loan-to-Value ratio at which liquidation occurs</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <NumberInput
                value={params.riskManagement.liquidationLtv}
                onChange={(value) => updateRiskParam("liquidationLtv", value)}
                min={50}
                max={100}
                step={1}
                placeholder="95"
                suffix="%"
              />
              {/* Enhanced dynamic helper text with percentage drop */}
              <div className="text-xs text-muted-foreground mt-1">
                {(() => {
                  const percentageDrop = ((params.initialBtcPrice - liquidationPrice) / params.initialBtcPrice) * 100
                  return `If you take a loan of $${Math.round(maxLoanAmountUsd).toLocaleString()}, BTC needs to drop ${percentageDrop.toFixed(1)}% (from $${params.initialBtcPrice.toLocaleString()} to $${Math.round(liquidationPrice).toLocaleString()}) to trigger liquidation (if you do not top up the collateral)`
                })()}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Liquidation Fee
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Fee charged when BTC collateral is liquidated to cover the loan, calculated as percentage of liquidated amount</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <NumberInput
                value={params.liquidationFeePercent}
                onChange={(value) => updateParam("liquidationFeePercent", value)}
                min={0}
                max={20}
                step={0.1}
                placeholder="5.0"
                suffix="%"
              />
            </div>
          </div>



          {/* Loan Term */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Loan Term
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Duration of the loan repayment period. Choose 'Infinity' for interest-only loans with no fixed repayment schedule</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Select
              value={params.loanTermMonths === Infinity ? "infinity" : params.loanTermMonths.toString()}
              onValueChange={(value) => updateParam("loanTermMonths", value === "infinity" ? Infinity : parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select loan term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 months</SelectItem>
                <SelectItem value="12">12 months</SelectItem>
                <SelectItem value="24">24 months</SelectItem>
                <SelectItem value="36">36 months</SelectItem>
                <SelectItem value="infinity">Infinity</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
