"use client"

import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { RefreshCw, Info } from "lucide-react"
import { useSimulation } from "../../context/SimulationContext"
import { loadCurrentBtcPrice } from "@/lib/load-btc-price"

/**
 * Basic Parameters Card Component
 * 
 * Handles the core simulation parameters like BTC amount, initial price,
 * loan terms, interest rates, etc. Extracted from the monolithic simulation.tsx
 * to improve maintainability and enable focused testing.
 */
export function BasicParametersCard() {
  // Temporarily disable translations to avoid infinite loops
  // const { t } = useTranslation()
  const {
    params,
    setParams,
    loadingBtcPrice,
    setLoadingBtcPrice
  } = useSimulation()

  // Simple fallback function for translations
  const t = (key: string) => {
    const translations: Record<string, string> = {
      "BasicParameters.title": "Basic Parameters",
      "BasicParameters.description": "Configure basic simulation parameters",
      "BasicParameters.btcAmount": "BTC Amount",
      "BasicParameters.initialBtcPrice": "Initial BTC Price (€)",
      "BasicParameters.loanTermMonths": "Loan Term (Months)",
      "BasicParameters.simulationMonths": "Simulation Duration (Months)",
      "BasicParameters.annualInterestRate": "Annual Interest Rate (%)",
      "BasicParameters.loadCurrentPrice": "Load Current Price",
    }
    return translations[key] || key
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
        <CardTitle>{t("BasicParams.title")}</CardTitle>
        <CardDescription>{t("BasicParams.description")}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* BTC Amount and Initial Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="btcAmount">
              {t("BasicParams.btcAmount")}
            </Label>
            <Input
              id="btcAmount"
              type="number"
              value={params.btcAmount}
              onChange={(e) => setParams((p) => ({ ...p, btcAmount: Number(e.target.value) }))}
              min="0.001"
              step="0.001"
            />
          </div>
          
          <div>
            <Label htmlFor="initialBtcPrice">
              {t("BasicParams.initialBtcPrice")}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("BasicParams.initialBtcPriceTooltip")}</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <div className="flex gap-2">
              <Input
                id="initialBtcPrice"
                type="number"
                value={params.initialBtcPrice}
                onChange={(e) => setParams((p) => ({ ...p, initialBtcPrice: Number(e.target.value) }))}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleLoadCurrentPrice}
                disabled={loadingBtcPrice}
                title={t("BasicParams.loadCurrentPrice")}
              >
                <RefreshCw className={`w-4 h-4 ${loadingBtcPrice ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Loan Term and Simulation Duration */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="loanTermMonths">
              {t("BasicParams.loanTerm")}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("BasicParams.loanTermTooltip")}</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="loanTermMonths"
              type="number"
              value={params.loanTermMonths}
              onChange={(e) => setParams((p) => ({ ...p, loanTermMonths: Number(e.target.value) }))}
              min="1"
              max="60"
              step="1"
            />
          </div>
          
          <div>
            <Label htmlFor="simulationMonths">
              {t("BasicParams.simulationDuration")}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("BasicParams.simulationDurationTooltip")}</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="simulationMonths"
              type="number"
              value={params.simulationMonths}
              onChange={(e) => setParams((p) => ({ ...p, simulationMonths: Number(e.target.value) }))}
              min="12"
              max="600"
              step="1"
            />
          </div>
        </div>

        {/* Interest Rate and Origination Fee */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="annualInterestRate">
              {t("BasicParams.interestRate")}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("BasicParams.interestRateTooltip")}</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="annualInterestRate"
              type="number"
              value={params.annualInterestRate}
              onChange={(e) => setParams((p) => ({ ...p, annualInterestRate: Number(e.target.value) }))}
              min="0"
              max="50"
              step="0.1"
            />
          </div>
          
          <div>
            <Label htmlFor="loanOriginationFeePercent">
              {t("BasicParams.originationFee")}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("BasicParams.originationFeeTooltip")}</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="loanOriginationFeePercent"
              type="number"
              value={params.loanOriginationFeePercent}
              onChange={(e) =>
                setParams((p) => ({ ...p, loanOriginationFeePercent: Number(e.target.value) }))
              }
              min="0"
              max="10"
              step="0.1"
            />
          </div>
        </div>

        {/* Max Loan Amount */}
        <div>
          <Label htmlFor="maxLoanAmount">
            {t("BasicParams.maxLoanAmount")}
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 ml-1 inline" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("BasicParams.maxLoanAmountTooltip")}</p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <Input
            id="maxLoanAmount"
            type="number"
            value={params.maxLoanAmount}
            onChange={(e) => setParams((p) => ({ ...p, maxLoanAmount: Number(e.target.value) }))}
            min="1000"
            step="1000"
          />
        </div>
      </CardContent>
    </Card>
  )
}
