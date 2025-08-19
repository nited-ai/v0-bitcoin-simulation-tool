"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { RefreshCw, Info, Bitcoin, DollarSign, Banknote, CreditCard } from "lucide-react"
import { useSimulation } from "../../context/SimulationContext"
import { centralizedDataService } from "@/lib/services/centralized-data-service"
import { NumberInput } from "@/shared/ui/forms/NumberInput"
import { CollateralSummaryCard } from "./CollateralSummaryCard"
import { useLoanCalculations } from "../../hooks/useCalculationsIntegration"
import { CalculationsErrorBoundary } from "./CalculationsErrorBoundary"

/**
 * Basic Parameters Card Component
 *
 * Handles the core simulation parameters: BTC amount, initial price,
 * and monthly withdrawal with BTC accumulation options.
 */
export function BasicParametersCard() {
  const {
    params,
    setParams,
    loadingBtcPrice,
    setLoadingBtcPrice
  } = useSimulation()

  // Use centralized loan calculations through integration hook
  const loanData = useLoanCalculations()

  // Get max loan capacity from centralized calculations
  const maxLoanCapacity = useMemo(() => {
    return loanData?.initialMaxLoanCapacity || 0
  }, [loanData])

  // BTC accumulation state and handlers moved to Strategy tab

  /**
   * The current BTC price is now loaded by the centralized data service during app initialization
   * No need to load it separately here - it will be set automatically via useCentralizedData hook
   */

  // Investment mode description function moved to Strategy tab

  /**
   * Refresh current BTC price from external APIs
   */
  const handleLoadCurrentPrice = async () => {
    setLoadingBtcPrice(true)
    try {
      // Use centralized data service to refresh current price
      const currentPrice = await centralizedDataService.getCurrentPrice()
      if (currentPrice) {
        setParams((p) => ({ ...p, initialBtcPrice: currentPrice.price }))
        console.log(`💰 Refreshed BTC price: $${currentPrice.price}`)
      }
    } catch (error) {
      console.error("Failed to refresh current BTC price:", error)
    } finally {
      setLoadingBtcPrice(false)
    }
  }

  return (
    <CalculationsErrorBoundary>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bitcoin className="w-5 h-5 text-orange-500" />
            Basic Parameters
          </CardTitle>
        </CardHeader>

      <CardContent className="space-y-6">
        {/* Two-column layout: Input fields on left, Collateral value summary on right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left Column: Input Fields */}
          <div className="space-y-6">
            {/* Initial BTC Price (moved to top) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-orange-500" />
                Initial BTC Price
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Starting Bitcoin price in USD for the simulation</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="flex gap-2">
                <NumberInput
                  value={params.initialBtcPrice}
                  onChange={(value) => setParams((p) => ({ ...p, initialBtcPrice: value }))}
                  min={1000}
                  max={10000000}
                  step={100}
                  decimals={0}
                  suffix="$"
                  placeholder="100,000"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleLoadCurrentPrice}
                  disabled={loadingBtcPrice}
                  title="Load Current Price"
                  className="shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingBtcPrice ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {/* BTC Amount (moved below price) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Bitcoin className="w-4 h-4 text-orange-500" />
                BTC Amount
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>The amount of Bitcoin you want to use as collateral for loans</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <NumberInput
                value={params.initialBtcAmount}
                onChange={(value) => setParams((p) => ({ ...p, initialBtcAmount: value }))}
                min={0.001}
                max={1000}
                step={0.001}
                decimals={4}
                suffix="BTC"
                placeholder="1.0000"
              />
            </div>
          </div>

          {/* Right Column: Total Fiat Value and Max Loan Amount */}
          <div className="space-y-6">
            {/* Total Fiat Value */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-orange-500" />
                Total Fiat Value
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total fiat value of your BTC stack available as collateral</p>
                    <p>Formula: BTC Amount × Initial BTC Price</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <CollateralSummaryCard
                btcAmount={params.initialBtcAmount}
                initialBtcPrice={params.initialBtcPrice}
                className="p-0 border-none bg-transparent"
              />
            </div>

            {/* Max Loan Amount */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-orange-500" />
                Max Loan Amount
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Maximum loan amount available on selected platform</p>
                    <p>Formula: (BTC Amount × Price) × Platform Max LTV</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="text-4xl font-bold text-orange-600">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(maxLoanCapacity)}
              </div>
            </div>
          </div>

        </div>

        {/* Monthly Savings/Withdrawal and BTC Accumulation moved to Strategy tab */}

      </CardContent>
    </Card>
    </CalculationsErrorBoundary>
  )
}
