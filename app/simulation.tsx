"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Legend } from "recharts"
import { Download, RefreshCw, AlertTriangle, TrendingUp, Bitcoin, Info } from "lucide-react"
import { toast } from "sonner"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PriceModelChart } from "@/components/price-model-chart"
import { ModeToggle } from "@/components/mode-toggle"
import { LocaleSwitcher } from "@/components/locale-switcher"

import { loadCurrentBtcPrice } from "@/lib/load-btc-price"
import { loadHistoricalPriceData } from "@/lib/price-engine/historical-data-loader"
import { PerformanceMonitor } from "@/lib/price-engine/performance-monitor"
import { HistoricalDataCache } from "@/lib/price-engine/cache-manager"
import { generatePriceChartData, clearChartCache, getChartCacheStats } from "@/lib/price-engine"
import type {
  HistoricalDataPoint,
  PriceModel,
  PowerLawLine,
  PriceChartDataPoint,
  PriceEngineParams,
} from "@/lib/price-engine/types"
import { getPowerLawPrice } from "@/lib/price-engine/models/power-law"
import { runStrategySimulation, getAvailableStrategies } from "@/lib/strategy-engine"
import type {
  InvestmentStrategy,
  StrategyEngineParams,
  MonthlyResult as StrategyMonthlyResult,
  AthBasedStrategyParams,
  MovingAverageStrategyParams
} from "@/lib/strategy-engine/types"

// All specific types are now imported from the engine's type definition file.
// Financial-specific types remain here.
interface Loan {
  id: number
  month: number
  principal: number
  maturityMonth: number
  repaymentAmount: number
  lockedBtc: number
}

interface MonthlyResult {
  month: number
  dateString: string
  btcPrice: number
  collateralValue: number
  realCollateralValue: number
  totalDebt: number
  realTotalDebt: number
  withdrawalAmount: number
  newLoanPrincipal: number
  repaymentsDue: number
  reinvestment: number
  currentBtcAmount: number
  freeBtc: number
  lockedBtc: number
  loanCount: number
  highestLtv: number
  events: MonthlyEvent[]
}

type MonthlyEvent =
  | { type: "withdrawal_skipped" }
  | { type: "deleveraged"; amount: number }
  | { type: "liquidated"; id: number }
  | { type: "collateral_topped_up"; loanId: number; amount: number }

interface SimulationParams {
  btcAmount: number
  initialBtcPrice: number
  monthlyWithdrawalAmount: number
  annualInterestRate: number
  loanOriginationFeePercent: number
  loanTermMonths: number
  simulationMonths: number
  maxLoanAmount: number
  annualGrowthRates: number[]
  priceModel: PriceModel
  powerLawSettings: {
    prognosisLine: PowerLawLine
  }
  riskManagement: {
    targetLtv: number
    liquidationLtv: number
  }
  // Strategy parameters
  investmentStrategy: InvestmentStrategy
  athBasedParams: AthBasedStrategyParams
  movingAverageParams: MovingAverageStrategyParams
}

const PLATFORM_LTV_NEW_LOANS = 50

const DEFAULT_PARAMS: SimulationParams = {
  btcAmount: 1,
  initialBtcPrice: 100000,
  monthlyWithdrawalAmount: 0,
  annualInterestRate: 6.5,
  loanOriginationFeePercent: 1.5,
  loanTermMonths: 6,
  simulationMonths: 144,
  maxLoanAmount: 100000,
  annualGrowthRates: [180, -60, -20, 210, 250, -60, -20, 170, 200, -65, -20, 110],
  priceModel: "manual",
  powerLawSettings: {
    prognosisLine: "fit",
  },
  riskManagement: {
    targetLtv: 50,
    liquidationLtv: 95,
  },
  // Strategy parameters
  investmentStrategy: "default",
  athBasedParams: {
    athThresholdPercent: 80,
  },
  movingAverageParams: {
    movingAveragePeriod: 200,
    investmentMultiplier: 1.0,
  },
}

const PARAMS_STORAGE_KEY = "btc-simulator-params-v19-engine-refactor"

export default function BitcoinSimulator() {
  const { t, i18n } = useTranslation()

  const [params, setParams] = useState<SimulationParams>(() => {
    if (typeof window === "undefined") return DEFAULT_PARAMS
    try {
      const savedParams = localStorage.getItem(PARAMS_STORAGE_KEY)
      if (savedParams) {
        const parsed = JSON.parse(savedParams)
        const riskManagement = { ...DEFAULT_PARAMS.riskManagement, ...parsed.riskManagement }
        const powerLawSettings = { ...DEFAULT_PARAMS.powerLawSettings, ...parsed.powerLawSettings }
        return { ...DEFAULT_PARAMS, ...parsed, powerLawSettings, riskManagement }
      }
    } catch (error) {
      console.error("Error loading params from localStorage:", error)
    }
    return DEFAULT_PARAMS
  })

  const [results, setResults] = useState<MonthlyResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])
  const [loadingBtcPrice, setLoadingBtcPrice] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [historicalPriceData, setHistoricalPriceData] = useState<HistoricalDataPoint[]>([])
  const [priceChartData, setPriceChartData] = useState<PriceChartDataPoint[]>([])
  const [cacheStatus, setCacheStatus] = useState<'loading' | 'cached' | 'fresh' | 'error'>('loading')
  const [chartLoading, setChartLoading] = useState(false)

  const firstRun = useRef(true)

  useEffect(() => {
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  useEffect(() => {
    try {
      localStorage.setItem(PARAMS_STORAGE_KEY, JSON.stringify(params))
    } catch (error) {
      console.error("Error saving params to localStorage:", error)
    }
  }, [params])

  // This effect is now solely responsible for generating the complete price chart data
  // by calling the new Price Engine whenever parameters change.
  useEffect(() => {
    if (historicalPriceData.length === 0) return

    const generateData = async () => {
      setChartLoading(true)
      setIsLoading(true)
      try {
        // Calculate historical patterns needed for specific models
        const historicalDailyMultipliers = historicalPriceData
          .slice(-1458)
          .map((p, i, arr) => (i > 0 ? p.close / arr[i - 1].close : 1))
          .slice(1)

        const historicalChannelPositions = historicalPriceData.slice(-1458).map((dataPoint) => {
          const date = new Date(dataPoint.time * 1000)
          const price = dataPoint.close
          const support = getPowerLawPrice(date, "support")
          const resistance = getPowerLawPrice(date, "resistance")
          const channelWidth = resistance - support
          if (channelWidth <= 0) return 0.5
          return Math.max(0, Math.min(1, (price - support) / channelWidth))
        })

        // Prepare parameters for the engine
        const engineParams: PriceEngineParams = {
          ...params,
          historicalDailyMultipliers,
          historicalChannelPositions,
        }

        // Call the engine to get the complete chart data
        const chartData = await generatePriceChartData(engineParams, historicalPriceData)
        setPriceChartData(chartData)
      } catch (error) {
        console.error("Error generating price chart data:", error)
        setErrors((prev) => [...prev, "Failed to generate price model data."])
      } finally {
        setIsLoading(false)
        setChartLoading(false)
      }
    }

    generateData()
  }, [params, historicalPriceData])

  // Optimierung: Chart-Daten nur regenerieren wenn sich relevante Parameter ändern
  const relevantParams = useMemo(() => ({
    priceModel: params.priceModel,
    initialBtcPrice: params.initialBtcPrice,
    simulationMonths: params.simulationMonths,
    annualGrowthRates: params.annualGrowthRates,
    powerLawSettings: params.powerLawSettings,
  }), [params.priceModel, params.initialBtcPrice, params.simulationMonths, params.annualGrowthRates, params.powerLawSettings])

  // The simulation now consumes the pre-generated price data.
  const runSimulation = useCallback(
    async (initialBtcPriceOverride?: number) => {
      if (priceChartData.length === 0) return // Don't run if price data isn't ready

      const currentParams = initialBtcPriceOverride ? { ...params, initialBtcPrice: initialBtcPriceOverride } : params
      setIsLoading(true)
      setErrors([])

      await new Promise((resolve) => setTimeout(resolve, 50))

      try {
        // Convert SimulationParams to StrategyEngineParams
        const strategyParams: StrategyEngineParams = {
          btcAmount: currentParams.btcAmount,
          initialBtcPrice: currentParams.initialBtcPrice,
          monthlyWithdrawalAmount: currentParams.monthlyWithdrawalAmount,
          annualInterestRate: currentParams.annualInterestRate,
          loanOriginationFeePercent: currentParams.loanOriginationFeePercent,
          loanTermMonths: currentParams.loanTermMonths,
          simulationMonths: currentParams.simulationMonths,
          maxLoanAmount: currentParams.maxLoanAmount,
          riskManagement: currentParams.riskManagement,
          investmentStrategy: currentParams.investmentStrategy,
          athBasedParams: currentParams.athBasedParams,
          movingAverageParams: currentParams.movingAverageParams,
        }

        // Run the strategy simulation
        const strategyResults = await runStrategySimulation(
          strategyParams,
          priceChartData,
          historicalPriceData
        )

        // Convert StrategyMonthlyResult to MonthlyResult (they should be compatible)
        const convertedResults: MonthlyResult[] = strategyResults.map(result => ({
          ...result,
          liquidatedBtc: 0, // This field exists in MonthlyResult but not in StrategyMonthlyResult
        }))

        setResults(convertedResults)
      } catch (error) {
        console.error("Strategy simulation failed:", error)
        setErrors(["Strategy simulation failed. Please check your parameters and try again."])
      } finally {
        setIsLoading(false)
      }
    },
    [params, priceChartData, historicalPriceData],
  )

  // This effect loads the initial historical data ONCE on component mount with caching optimization.
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setErrors([])
      setCacheStatus('loading')

      try {
        const startTime = performance.now()
        const data = await loadHistoricalPriceData()
        const loadTime = performance.now() - startTime

        setHistoricalPriceData(data)

        // Cache-Status basierend auf Ladezeit und Cache-Logs bestimmen
        const isCacheHit = loadTime < 1000 // Großzügige Grenze für Cache-Hits
        setCacheStatus(isCacheHit ? 'cached' : 'fresh')

        if (firstRun.current) {
          firstRun.current = false
          const latestPrice = data.length > 0 ? data[data.length - 1].close : DEFAULT_PARAMS.initialBtcPrice
          const initialPrice = (await loadCurrentBtcPrice()) ?? latestPrice
          setParams((p) => ({ ...p, initialBtcPrice: initialPrice }))
        }

        console.log(`📊 Historical data loaded: ${data.length} points in ${Math.round(loadTime)}ms`)

        // Performance Report nach dem ersten Load
        if (firstRun.current === false) {
          PerformanceMonitor.logPerformanceReport()
        }

      } catch (e) {
        console.error("Failed to load data:", e)
        setCacheStatus('error')
        setErrors((prev) => [...prev, t("Errors.failedToLoadHistoricalData")])
        setIsLoading(false)
      }
    }

    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t])

  // This effect runs the financial simulation whenever the price data is ready or changes.
  useEffect(() => {
    if (priceChartData.length > 0) {
      runSimulation()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceChartData])

  // Create chart data that only shows the simulation period (not historical data)
  const financialChartData = useMemo(() => {
    if (results.length === 0) return []

    // Create chart data directly from simulation results
    return results.map((result) => ({
      date: result.dateString,
      collateralValue: result.collateralValue,
      lockedCollateralValue: result.lockedBtc * result.btcPrice,
      totalDebt: result.totalDebt,
      btcPrice: result.btcPrice,
    }))
  }, [results])

  const summary = useMemo(() => {
    if (results.length === 0) return null
    const firstLiquidation = results.find((r) => r.events.some((e) => e.type === "liquidated"))
    const maxDebt = Math.max(...results.map((r) => r.totalDebt))
    const finalResult = results[results.length - 1]
    return {
      firstLiquidationMonth: firstLiquidation?.month || null,
      maxDebt,
      finalCollateralValue: finalResult.collateralValue,
      finalNetWorth: finalResult.collateralValue - finalResult.totalDebt,
      finalBtcAmount: finalResult.currentBtcAmount,
    }
  }, [results])

  const exportToCsv = () => {
    if (results.length === 0) return
    const headers = [
      "Month",
      "Date",
      "BTC Price (€)",
      "Total Collateral (€)",
      "Total Debt (€)",
      "Highest LTV (%)",
      "Loan Count",
      "Total BTC",
      "Free BTC",
      "Locked BTC",
      "Withdrawal (€)",
      "New Loan Principal (€)",
      "Repayments Due (€)",
      "Reinvestment (€)",
      "Events",
    ]
    const csvContent = [
      headers.join(","),
      ...results.map((r) =>
        [
          r.month,
          r.dateString,
          r.btcPrice,
          r.collateralValue,
          r.totalDebt,
          r.highestLtv,
          r.loanCount,
          r.currentBtcAmount.toFixed(8),
          r.freeBtc.toFixed(8),
          r.lockedBtc.toFixed(8),
          r.withdrawalAmount,
          r.newLoanPrincipal,
          r.repaymentsDue,
          r.reinvestment,
          `"${r.events.map((e) => e.type).join(", ")}"`,
        ].join(","),
      ),
    ].join("\n")
    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "firefish-simulation.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetParams = () => {
    localStorage.removeItem(PARAMS_STORAGE_KEY)
    setParams(DEFAULT_PARAMS)
    setResults([])
    setErrors([])
  }

  const clearCache = async () => {
    try {
      // Beide Caches leeren
      const cache = new HistoricalDataCache()
      cache.clearCache()
      clearChartCache()

      setCacheStatus('loading')

      // Daten neu laden
      setIsLoading(true)
      const data = await loadHistoricalPriceData()
      setHistoricalPriceData(data)

      // Chart-Daten werden automatisch neu generiert durch useEffect
      setIsLoading(false)

      // Cache-Statistiken loggen
      const chartStats = getChartCacheStats()
      console.log("📊 Cache cleared - Chart cache stats:", chartStats)

      toast.success("All caches cleared and data reloaded successfully!")
    } catch (error) {
      console.error("Failed to clear cache:", error)
      toast.error("Failed to clear cache")
    }
  }

  const formatEvent = (event: MonthlyEvent) => {
    switch (event.type) {
      case "withdrawal_skipped":
        return t("Results.eventWithdrawalSkipped")
      case "deleveraged":
        return t("Results.eventDeleveraged", { amount: event.amount.toFixed(4) })
      case "liquidated":
        return t("Results.eventLiquidated", { id: event.id })
      case "collateral_topped_up":
        return t("Results.eventCollateralToppedUp", { id: event.loanId, amount: event.amount.toFixed(4) })
      default:
        return ""
    }
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex-1"></div>
          <div className="flex-1 text-center">
            <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-2">
              <Bitcoin className="w-8 h-8 text-orange-500" />
              {t("Page.title")}
            </h1>
            <p className="text-muted-foreground">{t("Page.description")}</p>
          </div>
          <div className="flex-1 flex justify-end gap-2">
            <LocaleSwitcher />
            <ModeToggle />
          </div>
        </div>

        <Tabs defaultValue="parameters" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="parameters">{t("Tabs.parameters")}</TabsTrigger>
            <TabsTrigger value="results">{t("Tabs.results")}</TabsTrigger>
            <TabsTrigger value="chart">{t("Tabs.chart")}</TabsTrigger>
            <TabsTrigger value="how-it-works">{t("Tabs.howItWorks")}</TabsTrigger>
          </TabsList>

          <TabsContent value="parameters" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("BasicParams.title")}</CardTitle>
                  <CardDescription>{t("BasicParams.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                          onClick={async () => {
                            setLoadingBtcPrice(true)
                            const price = await loadCurrentBtcPrice()
                            if (price) {
                              setParams((p) => ({ ...p, initialBtcPrice: price }))
                            }
                            setLoadingBtcPrice(false)
                          }}
                          disabled={loadingBtcPrice}
                        >
                          <RefreshCw className={`w-4 h-4 ${loadingBtcPrice ? "animate-spin" : ""}`} />
                        </Button>
                      </div>
                    </div>
                  </div>
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
                  <div>
                    <Label htmlFor="maxLoanAmount">
                      {t("BasicParams.maxLoanAmount")}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 ml-1 inline" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("BasicParams.maxLoanAmountTooltip")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("Strategy.title")}</CardTitle>
                    <CardDescription>{t("Strategy.description")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="monthlyWithdrawalAmount">
                        {t("Strategy.monthlyWithdrawal")}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 ml-1 inline" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("Strategy.monthlyWithdrawalTooltip")}</p>
                            </TooltipContent>
                          </Tooltip>

                      </Label>
                      <Input
                        id="monthlyWithdrawalAmount"
                        type="number"
                        value={params.monthlyWithdrawalAmount}
                        onChange={(e) => setParams((p) => ({ ...p, monthlyWithdrawalAmount: Number(e.target.value) }))}
                        min="0"
                        step="100"
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{t("RiskManagement.title")}</CardTitle>
                    <CardDescription>{t("RiskManagement.description")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="targetLtv">
                          {t("RiskManagement.targetLtv")}
  
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 ml-1 inline" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t("RiskManagement.targetLtvTooltip")}</p>
                              </TooltipContent>
                            </Tooltip>
  
                        </Label>
                        <Input
                          id="targetLtv"
                          type="number"
                          value={params.riskManagement.targetLtv}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              riskManagement: { ...p.riskManagement, targetLtv: Number(e.target.value) },
                            }))
                          }
                          min="0"
                          max="90"
                          step="1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="liquidationLtv">
                          {t("RiskManagement.liquidationLtv")}
  
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 ml-1 inline" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t("RiskManagement.liquidationLtvTooltip")}</p>
                              </TooltipContent>
                            </Tooltip>
  
                        </Label>
                        <Input
                          id="liquidationLtv"
                          type="number"
                          value={params.riskManagement.liquidationLtv}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              riskManagement: { ...p.riskManagement, liquidationLtv: Number(e.target.value) },
                            }))
                          }
                          min="50"
                          max="100"
                          step="1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Investment Strategy Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  {t("InvestmentStrategy.title")}
                </CardTitle>
                <CardDescription>{t("InvestmentStrategy.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="investment-strategy">{t("InvestmentStrategy.selectStrategy")}</Label>
                  <Select
                    value={params.investmentStrategy}
                    onValueChange={(value: InvestmentStrategy) =>
                      setParams((prev) => ({ ...prev, investmentStrategy: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("InvestmentStrategy.selectStrategy")} />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableStrategies().map((strategy) => (
                        <SelectItem key={strategy.id} value={strategy.id}>
                          {t(`InvestmentStrategy.${strategy.id}Strategy`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* ATH-Based Strategy Settings */}
                {params.investmentStrategy === "athBased" && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <div>
                      <h4 className="font-medium">{t("InvestmentStrategy.athSettingsTitle")}</h4>
                      <p className="text-sm text-muted-foreground">{t("InvestmentStrategy.athSettingsDescription")}</p>
                    </div>
                    <div>
                      <Label htmlFor="ath-threshold">
                        {t("InvestmentStrategy.athThreshold")}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 ml-1 inline" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("InvestmentStrategy.athThresholdTooltip")}</p>
                            </TooltipContent>
                          </Tooltip>

                      </Label>
                      <Input
                        id="ath-threshold"
                        type="number"
                        value={params.athBasedParams.athThresholdPercent}
                        onChange={(e) =>
                          setParams((prev) => ({
                            ...prev,
                            athBasedParams: {
                              ...prev.athBasedParams,
                              athThresholdPercent: parseFloat(e.target.value) || 80,
                            },
                          }))
                        }
                        min="0"
                        max="100"
                        step="1"
                      />
                    </div>
                  </div>
                )}

                {/* Moving Average Strategy Settings */}
                {params.investmentStrategy === "movingAverage" && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <div>
                      <h4 className="font-medium">{t("InvestmentStrategy.movingAverageSettingsTitle")}</h4>
                      <p className="text-sm text-muted-foreground">{t("InvestmentStrategy.movingAverageSettingsDescription")}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ma-period">
                          {t("InvestmentStrategy.movingAveragePeriod")}
  
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 ml-1 inline" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t("InvestmentStrategy.movingAveragePeriodTooltip")}</p>
                              </TooltipContent>
                            </Tooltip>
  
                        </Label>
                        <Input
                          id="ma-period"
                          type="number"
                          value={params.movingAverageParams.movingAveragePeriod}
                          onChange={(e) =>
                            setParams((prev) => ({
                              ...prev,
                              movingAverageParams: {
                                ...prev.movingAverageParams,
                                movingAveragePeriod: parseInt(e.target.value) || 200,
                              },
                            }))
                          }
                          min="1"
                          max="1000"
                          step="1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="investment-multiplier">
                          {t("InvestmentStrategy.investmentMultiplier")}
  
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 ml-1 inline" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t("InvestmentStrategy.investmentMultiplierTooltip")}</p>
                              </TooltipContent>
                            </Tooltip>
  
                        </Label>
                        <Input
                          id="investment-multiplier"
                          type="number"
                          value={params.movingAverageParams.investmentMultiplier}
                          onChange={(e) =>
                            setParams((prev) => ({
                              ...prev,
                              movingAverageParams: {
                                ...prev.movingAverageParams,
                                investmentMultiplier: parseFloat(e.target.value) || 1.0,
                              },
                            }))
                          }
                          min="0"
                          max="3"
                          step="0.1"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("EconomicAssumptions.title")}</CardTitle>
                <CardDescription>{t("EconomicAssumptions.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div>
                      <Label htmlFor="priceModel">{t("PriceModel.selectModel")}</Label>
                      <Select
                        value={params.priceModel}
                        onValueChange={(value: PriceModel) => setParams((p) => ({ ...p, priceModel: value }))}
                      >
                        <SelectTrigger id="priceModel">
                          <SelectValue placeholder={t("PriceModel.selectModel")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">{t("PriceModel.manualGrowth")}</SelectItem>
                          <SelectItem value="powerLaw">{t("PriceModel.powerLaw")}</SelectItem>
                          <SelectItem value="cycleRepeat">{t("PriceModel.cycleRepeat")}</SelectItem>
                          <SelectItem value="cycleRepeatPowerLaw">{t("PriceModel.cycleRepeatPowerLaw")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {params.priceModel === "powerLaw" && (
                      <div>
                        <Label htmlFor="prognosisLine">{t("PriceModel.prognosisLine")}</Label>
                        <Select
                          value={params.powerLawSettings.prognosisLine}
                          onValueChange={(value: PowerLawLine) =>
                            setParams((p) => ({
                              ...p,
                              powerLawSettings: { ...p.powerLawSettings, prognosisLine: value },
                            }))
                          }
                        >
                          <SelectTrigger id="prognosisLine">
                            <SelectValue placeholder={t("PriceModel.prognosisLine")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fit">{t("PriceModel.fit")}</SelectItem>
                            <SelectItem value="support">{t("PriceModel.support")}</SelectItem>
                            <SelectItem value="resistance">{t("PriceModel.resistance")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <PriceModelChart chartData={priceChartData} isLoading={isLoading} />
                  </div>

                  {params.priceModel === "manual" && (
                    <div className="space-y-2">
                      <Label>{t("PriceModel.manualSettingsDescription")}</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {params.annualGrowthRates.map((rate, index) => (
                          <div key={index}>
                            <Label htmlFor={`growth-${index}`}>
                              {t("PriceModel.year")} {index + 1} (%)
                            </Label>
                            <Input
                              id={`growth-${index}`}
                              type="number"
                              value={rate}
                              onChange={(e) => {
                                const newRates = [...params.annualGrowthRates]
                                newRates[index] = Number(e.target.value)
                                setParams((prev) => ({ ...prev, annualGrowthRates: newRates }))
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>


            {/* Cache Status Feedback */}
            {isLoading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">
                  {cacheStatus === 'loading' && !chartLoading && "Loading historical data..."}
                  {cacheStatus === 'cached' && !chartLoading && "Loading from cache..."}
                  {cacheStatus === 'fresh' && !chartLoading && "Loading data..."}
                  {chartLoading && "Generating chart from cache..."}
                </p>
              </div>
            )}

            {/* Cache Status Badge */}
            {!isLoading && cacheStatus === 'cached' && (
              <div className="flex justify-center mb-4">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  📦 Data loaded from cache
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              <Button onClick={() => runSimulation()} disabled={isLoading || priceChartData.length === 0}>
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    {t("Parameters.calculating")}
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    {t("Parameters.runSimulation")}
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={resetParams}>
                {t("Parameters.reset")}
              </Button>
              <Button variant="outline" onClick={clearCache} className="text-xs">
                🗑️ Clear Cache
              </Button>
              {results.length > 0 && (
                <Button variant="outline" onClick={exportToCsv} className="flex items-center gap-2 bg-transparent">
                  <Download className="w-4 h-4" />
                  {t("Parameters.exportCsv")}
                </Button>
              )}
            </div>

            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t("Parameters.errorsTitle")}</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {summary?.firstLiquidationMonth && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t("Results.liquidationWarningTitle")}</AlertTitle>
                <AlertDescription>
                  {t("Results.liquidationWarningText", { month: summary.firstLiquidationMonth })}
                </AlertDescription>
              </Alert>
            )}

            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{t("Results.firstLiquidation")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {summary.firstLiquidationMonth
                        ? `${t("Results.month")} ${summary.firstLiquidationMonth}`
                        : t("Results.none")}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{t("Results.maxDebt")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.maxDebt.toLocaleString("de-DE")} €</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-medium text-sm">{t("Results.finalCollateral")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.finalCollateralValue.toLocaleString("de-DE")} €</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-medium text-sm">{t("Results.finalNetWorth")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.finalNetWorth.toLocaleString("de-DE")} €</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-medium text-sm">{t("Results.finalBtcAmount")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.finalBtcAmount?.toFixed(4)} BTC</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {results.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("Results.monthlyResults")}</CardTitle>
                  <CardDescription>{t("Results.monthlyResultsDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <div className="max-h-[60vh] overflow-y-auto">
                      <table className="w-full text-sm text-right">
                        <thead className="sticky top-0 bg-background z-10">
                          <tr className="border-b">
                            <th className="text-left p-2">{t("Results.tableMonth")}</th>
                            <th className="text-left p-2">{t("Results.tableDate")}</th>
                            <th className="p-2">{t("Results.tableBtcPrice")}</th>
                            <th className="p-2">{t("Results.tableBtcTotal")}</th>
                            <th className="p-2">{t("Results.tableCollateral")}</th>
                            <th className="p-2">{t("Results.tableTotalDebt")}</th>
                            <th className="p-2">{t("Results.tableLockedCollateral")}</th>
                            <th className="p-2">{t("Results.tableHighestLtv")}</th>
                            <th className="p-2">{t("Results.tableNewLoans")}</th>
                            <th className="p-2">{t("Results.tableRepayments")}</th>
                            <th className="p-2">{t("Results.tableWithdrawal")}</th>
                            <th className="p-2">{t("Results.tableReinvestment")}</th>
                            <th className="p-2 text-center">{t("Results.tableLoanCount")}</th>
                            <th className="p-2 text-left">{t("Results.tableEvents")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.slice((currentPage - 1) * 12, currentPage * 12).map((r) => (
                            <tr
                              key={r.month}
                              className={`border-b hover:bg-muted/50 ${
                                r.events.some((e) => e.type === "liquidated") ? "bg-red-900/20" : ""
                              }`}
                            >
                              <td className="text-left p-2">{r.month}</td>
                              <td className="text-left p-2">{r.dateString}</td>
                              <td className="p-2">{r.btcPrice.toLocaleString("de-DE")}</td>
                              <td className="p-2">{r.currentBtcAmount.toFixed(4)}</td>
                              <td className="p-2">{r.collateralValue.toLocaleString("de-DE")}</td>
                              <td className="p-2">{r.totalDebt.toLocaleString("de-DE")}</td>
                              <td className="p-2">{(r.lockedBtc * r.btcPrice).toLocaleString("de-DE")}</td>
                              <td
                                className={`p-2 text-center ${
                                  r.highestLtv >= params.riskManagement.liquidationLtv ? "text-red-500" : ""
                                }`}
                              >
                                {r.highestLtv}%
                              </td>
                              <td className="p-2">{r.newLoanPrincipal.toLocaleString("de-DE")}</td>
                              <td className="p-2">{r.repaymentsDue.toLocaleString("de-DE")}</td>
                              <td className="p-2">{r.withdrawalAmount.toLocaleString("de-DE")}</td>
                              <td className="p-2">{r.reinvestment.toLocaleString("de-DE")}</td>
                              <td className="p-2 text-center">{r.loanCount}</td>
                              <td className="p-2 text-left">
                                {r.events.length > 0 && (
                                  <div className="flex flex-col">
                                    {r.events.map((event, i) => (
                                      <span
                                        key={i}
                                        className={
                                          event.type === "liquidated" || event.type === "deleveraged"
                                            ? "text-red-500"
                                            : event.type === "collateral_topped_up"
                                              ? "text-blue-500"
                                              : "text-yellow-500"
                                        }
                                      >
                                        {formatEvent(event)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {results.length > 12 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        {t("Results.paginationShowing", {
                          start: (currentPage - 1) * 12 + 1,
                          end: Math.min(currentPage * 12, results.length),
                          total: results.length,
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          {t("Results.paginationPrevious")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(p + 1, Math.ceil(results.length / 12)))}
                          disabled={currentPage * 12 >= results.length}
                        >
                          {t("Results.paginationNext")}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="chart" className="space-y-6">
            {financialChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("Chart.debtVsCollateralTitle")}</CardTitle>
                  <CardDescription>{t("Chart.debtVsCollateralDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={financialChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" minTickGap={30} />
                        <YAxis
                          yAxisId="left"
                          label={{ value: t("Chart.amountInEur"), angle: -90, position: "insideLeft" }}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          label={{ value: t("Chart.btcPriceInEur"), angle: 90, position: "insideRight" }}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <RechartsTooltip
                          formatter={(value: number, name: string) => [`${value.toLocaleString("de-DE")} €`, name]}
                          labelFormatter={(date: any) => `${t("Chart.date")}: ${date}`}
                        />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="collateralValue"
                          name={t("Chart.legendCollateral")}
                          stroke="#8884d8"
                          dot={false}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="lockedCollateralValue"
                          name={t("Chart.legendLockedCollateral")}
                          stroke="#82ca9d"
                          dot={false}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="totalDebt"
                          name={t("Chart.legendTotalDebt")}
                          stroke="#ef4444"
                          dot={false}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="btcPrice"
                          name={t("Chart.legendBtcPrice")}
                          stroke="#f97316"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="how-it-works" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("HowItWorks.title")}</CardTitle>
                <CardDescription>{t("HowItWorks.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-base prose dark:prose-invert max-w-none">
                <h3>{t("HowItWorks.section1Title")}</h3>
                <p>{t("HowItWorks.section1Text1")}</p>
                <p>{t("HowItWorks.section1Text2")}</p>
                <h3>{t("HowItWorks.section2Title")}</h3>
                <p>{t("HowItWorks.section2Text1")}</p>
                <p>{t("HowItWorks.section2Text2")}</p>
                <Alert variant="default">
                  <Info className="h-4 w-4" />
                  <AlertDescription>{t("HowItWorks.section2Disclaimer")}</AlertDescription>
                </Alert>
                <h3>{t("HowItWorks.section3Title")}</h3>
                <p>{t("HowItWorks.section3Text1")}</p>
                <p>{t("HowItWorks.section3Text2")}</p>
                <h3>{t("HowItWorks.section4Title")}</h3>
                <p>{t("HowItWorks.section4Text1")}</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}

// This export is not needed since BitcoinSimulator is already exported above
// and page.tsx handles the I18nextProvider wrapper
