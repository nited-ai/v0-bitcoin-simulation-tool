"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CreditCard, Info, Calendar, DollarSign, Percent } from "lucide-react"
import { NumberInput } from "@/shared/ui/forms/NumberInput"
import { useSimulation } from "../../context/SimulationContext"

import { getPlatformConfig } from "../../constants/platformPresets"

/**
 * Loan Parameters Card Component
 *
 * Handles all loan-specific settings including platform selection,
 * interest rates, fees, and risk management parameters.
 */
export function LoanParametersCard() {
  const { params, setParams, markParameterAsManual } = useSimulation()

  // Get current platform configuration
  const platformConfig = getPlatformConfig(params.platform)

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



  /**
   * Calculate loan amount in USD based on percentage of BTC stack
   */
  const loanAmountUsd = (params.loanAmountPercent / 100) * (params.btcAmount * params.initialBtcPrice)

  /**
   * Calculate origination fee
   */
  const originationFeeUsd = loanAmountUsd * (platformConfig.originationFeePercent / 100)

  /**
   * Calculate collateral BTC amount based on Initial LTV (corrected formula)
   * Formula: collateralBtcAmount = (loanAmount + originationFee) / (btcPrice × targetLtv)
   */
  const collateralBtcAmount = (loanAmountUsd + originationFeeUsd) / (params.initialBtcPrice * (params.riskManagement.targetLtv / 100))

  /**
   * Validate collateral sufficiency
   */
  const isCollateralSufficient = collateralBtcAmount <= params.btcAmount

  /**
   * Calculate correct liquidation price (corrected formula)
   * Formula: liquidation_price = (loan_amount + origination_fee) / (collateral_btc_amount * liquidation_ltv)
   */
  const liquidationPrice = (loanAmountUsd + originationFeeUsd) / (collateralBtcAmount * (params.riskManagement.liquidationLtv / 100))

  return (
    <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Loan Parameters
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Row 1: Loan Amount + Initial LTV */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Loan Amount (Percentage-based) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Loan Amount
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Percentage of your total BTC stack value to use as loan amount</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <NumberInput
                value={params.loanAmountPercent}
                onChange={(value) => updateParam("loanAmountPercent", value)}
                min={1}
                max={100}
                step={1}
                placeholder="15"
                suffix="% of BTC stack"
              />
              {/* Helper text for Loan Amount */}
              <div className={`text-xs !mt-2 ${isCollateralSufficient ? 'text-muted-foreground' : 'text-red-600'}`}>
                = ${Math.round(loanAmountUsd).toLocaleString()} (based on {params.btcAmount} BTC × ${params.initialBtcPrice.toLocaleString()}). Needed collateral: {collateralBtcAmount.toFixed(4)} BTC at {params.riskManagement.targetLtv}% LTV
              </div>
            </div>

            {/* Initial LTV */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Initial LTV (max {platformConfig.maxInitialLtv}%)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Loan-to-Value ratio - percentage of collateral value that can be borrowed</p>
                    <p>Maximum allowed by {platformConfig.name} platform: {platformConfig.maxInitialLtv}%</p>
                  </TooltipContent>
                </Tooltip>
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
              {/* Liquidation explanation text */}
              <div className="text-xs text-muted-foreground !mt-2">
                {(() => {
                  const percentageDrop = ((params.initialBtcPrice - liquidationPrice) / params.initialBtcPrice) * 100
                  return `If you take a loan of $${Math.round(loanAmountUsd).toLocaleString()}, BTC needs to drop ${percentageDrop.toFixed(1)}% (from $${params.initialBtcPrice.toLocaleString()} to $${Math.round(liquidationPrice).toLocaleString()}) to trigger liquidation (if you do not top up the collateral)`
                })()}
              </div>
            </div>
          </div>

          {/* Row 2: Annual Interest Rate + Loan Term */}
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
                  {platformConfig.availableLoanTerms.map((term) => (
                    <SelectItem
                      key={term}
                      value={term === 'infinity' ? 'infinity' : term.toString()}
                    >
                      {term === 'infinity' ? 'Infinity' : `${term} months`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>


        </CardContent>
      </Card>
  )
}
