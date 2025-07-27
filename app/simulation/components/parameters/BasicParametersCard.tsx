"use client"

import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { RefreshCw, Info, Bitcoin, DollarSign, TrendingUp } from "lucide-react"
import { useSimulation } from "../../context/SimulationContext"
import { loadCurrentBtcPrice } from "@/lib/load-btc-price"
import { NumberInput } from "@/shared/ui/forms/NumberInput"

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

  // Get BTC accumulation state (default to true)
  const btcAccumulation = (params as any).btcAccumulation ?? true

  /**
   * Handle BTC accumulation checkbox change
   */
  const handleBtcAccumulationChange = (checked: boolean) => {
    setParams((current) => ({
      ...current,
      btcAccumulation: checked
    }))
  }

  /**
   * Automatically load current BTC price on component mount
   */
  useEffect(() => {
    handleLoadCurrentPrice()
  }, []) // Empty dependency array means this runs once on mount

  /**
   * Get investment mode description based on checkbox and withdrawal amount
   */
  const getInvestmentModeDescription = () => {
    if (btcAccumulation && params.monthlyWithdrawalAmount === 0) {
      return "Accumulate more BTC only (reinvest all loan proceeds)"
    } else if (!btcAccumulation && params.monthlyWithdrawalAmount > 0) {
      return "Live from BTC stack only (withdraw specific amount, no reinvestment)"
    } else if (btcAccumulation && params.monthlyWithdrawalAmount > 0) {
      return "Hybrid approach (withdraw specific amount AND reinvest remaining loan proceeds into BTC)"
    } else {
      return "No withdrawals, no reinvestment"
    }
  }

  /**
   * Load current BTC price from API
   */
  const handleLoadCurrentPrice = async () => {
    setLoadingBtcPrice(true)
    try {
      const price = await loadCurrentBtcPrice()
      if (price) {
        setParams((p) => ({ ...p, initialBtcPrice: price }))
      }
    } catch (error) {
      console.error("Failed to load current BTC price:", error)
    } finally {
      setLoadingBtcPrice(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bitcoin className="w-5 h-5 text-orange-500" />
          Basic Parameters
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* BTC Amount and Initial Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              value={params.btcAmount}
              onChange={(value) => setParams((p) => ({ ...p, btcAmount: value }))}
              min={0.001}
              max={1000}
              step={0.001}
              decimals={4}
              suffix="BTC"
              placeholder="1.0000"
            />
          </div>

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
        </div>

        {/* Second Row: Monthly Withdrawal + BTC Accumulation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-500" />
              Monthly Withdrawal
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Amount withdrawn monthly from your BTC stack for living expenses or other purposes</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <NumberInput
              value={params.monthlyWithdrawalAmount}
              onChange={(value) => setParams((p) => ({ ...p, monthlyWithdrawalAmount: value }))}
              min={0}
              max={50000}
              step={100}
              decimals={0}
              suffix="€"
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            {/* Empty label space to align with Monthly Withdrawal label */}
            <div className="h-6"></div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="btcAccumulation"
                checked={btcAccumulation}
                onCheckedChange={handleBtcAccumulationChange}
              />
              <Label
                htmlFor="btcAccumulation"
                className="flex items-center gap-2 cursor-pointer"
              >
                <TrendingUp className="w-4 h-4 text-green-500" />
                BTC Accumulation
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Decide whether you want to accumulate more BTC or live off your stack</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
            </div>
          </div>
        </div>

        {/* Investment Mode Description */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Current Mode:</strong> {getInvestmentModeDescription()}
          </p>
        </div>

      </CardContent>
    </Card>
  )
}
