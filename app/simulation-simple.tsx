"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, RefreshCw, TrendingUp, Bitcoin } from "lucide-react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PriceModelChart } from "@/components/price-model-chart"
import { ModeToggle } from "@/components/mode-toggle"
import { LocaleSwitcher } from "@/components/locale-switcher"

import { loadCurrentBtcPrice } from "@/lib/load-btc-price"
import { loadHistoricalPriceData } from "@/lib/price-engine/historical-data-loader"
import { PerformanceMonitor } from "@/lib/price-engine/performance-monitor"
import { HistoricalDataCache } from "@/lib/price-engine/cache-manager"
import { generatePriceChartData } from "@/lib/price-engine"
import type {
  HistoricalDataPoint,
  PriceModel,
  PowerLawLine,
  PriceChartDataPoint,
  PriceEngineParams,
} from "@/lib/price-engine/types"
import type {
  InvestmentStrategy,
  StrategyEngineParams,
  MonthlyResult,
  AthBasedStrategyParams,
  MovingAverageStrategyParams
} from "@/lib/strategy-engine/types"

const PARAMS_STORAGE_KEY = "simulationParams"

interface SimulationParams {
  btcAmount: number
  initialBtcPrice: number
  loanTermMonths: number
  annualInterestRate: number
  loanOriginationFeePercent: number
  monthlyWithdrawalAmount: number
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
  investmentStrategy: InvestmentStrategy
  athBasedParams: AthBasedStrategyParams
  movingAverageParams: MovingAverageStrategyParams
}

const DEFAULT_PARAMS: SimulationParams = {
  btcAmount: 1,
  initialBtcPrice: 100000,
  loanTermMonths: 6,
  annualInterestRate: 6.5,
  loanOriginationFeePercent: 1.5,
  monthlyWithdrawalAmount: 0,
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
  investmentStrategy: "default",
  athBasedParams: {
    athThresholdPercent: 80,
  },
  movingAverageParams: {
    movingAveragePeriod: 200,
    investmentMultiplier: 1.0,
  },
}

export default function BitcoinSimulator() {
  const { t } = useTranslation()

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
  const [historicalPriceData, setHistoricalPriceData] = useState<HistoricalDataPoint[]>([])
  const [priceChartData, setPriceChartData] = useState<PriceChartDataPoint[]>([])
  const [cacheStatus, setCacheStatus] = useState<'loading' | 'cached' | 'fresh' | 'error'>('loading')

  const firstRun = useRef(true)

  // Save params to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(PARAMS_STORAGE_KEY, JSON.stringify(params))
    } catch (error) {
      console.error("Error saving params to localStorage:", error)
    }
  }, [params])

  // Load historical data with caching optimization
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
        
        // Cache-Status basierend auf Ladezeit bestimmen
        setCacheStatus(loadTime < 100 ? 'cached' : 'fresh')
        
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
        setErrors((prev) => [...prev, "Failed to load historical data"])
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Generate price chart data when params change
  useEffect(() => {
    if (historicalPriceData.length === 0) return

    const generateData = async () => {
      setIsLoading(true)
      try {
        const engineParams: PriceEngineParams = {
          ...params,
          historicalDailyMultipliers: null,
          historicalChannelPositions: null,
        }
        
        const chartData = await generatePriceChartData(engineParams, historicalPriceData)
        setPriceChartData(chartData)
      } catch (error) {
        console.error("Error generating price chart data:", error)
        setErrors((prev) => [...prev, "Failed to generate price model data."])
      } finally {
        setIsLoading(false)
      }
    }

    generateData()
  }, [params, historicalPriceData])

  const clearCache = async () => {
    try {
      const cache = new HistoricalDataCache()
      cache.clearCache()
      setCacheStatus('loading')
      
      // Daten neu laden
      setIsLoading(true)
      const data = await loadHistoricalPriceData()
      setHistoricalPriceData(data)
      setIsLoading(false)
      
      toast.success("Cache cleared and data reloaded successfully!")
    } catch (error) {
      console.error("Failed to clear cache:", error)
      toast.error("Failed to clear cache")
    }
  }

  const resetParams = () => {
    localStorage.removeItem(PARAMS_STORAGE_KEY)
    setParams(DEFAULT_PARAMS)
    setResults([])
    setErrors([])
  }

  return (
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
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="how-it-works">How It Works</TabsTrigger>
        </TabsList>

        <TabsContent value="parameters" className="space-y-6">
          {errors.length > 0 && (
            <Alert>
              <AlertDescription>
                <div className="font-semibold mb-2">Errors:</div>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Cache Status Feedback */}
          {isLoading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">
                {cacheStatus === 'loading' && "Loading historical data..."}
                {cacheStatus === 'cached' && "Loading from cache..."}
                {cacheStatus === 'fresh' && "Fetching latest data..."}
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Parameters */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Parameters</CardTitle>
                <CardDescription>Configure your Bitcoin and loan parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="btcAmount">BTC Amount</Label>
                    <Input
                      id="btcAmount"
                      type="number"
                      value={params.btcAmount}
                      onChange={(e) => setParams((p) => ({ ...p, btcAmount: Number(e.target.value) }))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label htmlFor="initialBtcPrice">Initial BTC Price (€)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="initialBtcPrice"
                        type="number"
                        value={params.initialBtcPrice}
                        onChange={(e) => setParams((p) => ({ ...p, initialBtcPrice: Number(e.target.value) }))}
                        min="0"
                        step="0.01"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={async () => {
                          const price = await loadCurrentBtcPrice()
                          if (price) {
                            setParams((p) => ({ ...p, initialBtcPrice: price }))
                          }
                        }}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Price Model Section - Our updated version */}
            <Card>
              <CardHeader>
                <CardTitle>Price Model</CardTitle>
                <CardDescription>Define your expectations for price development.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div>
                      <Label htmlFor="priceModel">Select Model</Label>
                      <Select
                        value={params.priceModel}
                        onValueChange={(value: PriceModel) => setParams((p) => ({ ...p, priceModel: value }))}
                      >
                        <SelectTrigger id="priceModel">
                          <SelectValue placeholder="Select Model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual Growth Rates</SelectItem>
                          <SelectItem value="powerLaw">Power Law Model</SelectItem>
                          <SelectItem value="cycleRepeat">Cycle Repeat</SelectItem>
                          <SelectItem value="cycleRepeatPowerLaw">Cycle Repeat (Power Law)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {params.priceModel === "powerLaw" && (
                      <div>
                        <Label htmlFor="prognosisLine">Select Price Projection Line</Label>
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
                            <SelectValue placeholder="Select Price Projection Line" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fit">Fit (Green)</SelectItem>
                            <SelectItem value="support">Support (Red)</SelectItem>
                            <SelectItem value="resistance">Resistance (Purple)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <PriceModelChart chartData={priceChartData} isLoading={isLoading} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button disabled={isLoading || priceChartData.length === 0}>
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Calculating...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Run Simulation
                </>
              )}
            </Button>
            <Button variant="outline" onClick={resetParams}>
              Reset
            </Button>
            <Button variant="outline" onClick={clearCache} className="text-xs">
              🗑️ Clear Cache
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Simulation Results</CardTitle>
              <CardDescription>Results from your Bitcoin bullet loan simulation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>No simulation results yet. Run a simulation to see results.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle>Results Chart</CardTitle>
              <CardDescription>Visual representation of your simulation results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>No simulation results yet. Run a simulation to see charts.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="how-it-works">
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
              <CardDescription>Understanding the Bitcoin bullet loan simulation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>This simulation models rolling bullet loans secured by Bitcoin collateral.</p>
                <p>Key concepts:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Bullet loans are interest-only loans with principal due at maturity</li>
                  <li>Bitcoin serves as collateral for the loans</li>
                  <li>Loans are rolled over at maturity if conditions allow</li>
                  <li>Risk is managed through loan-to-value (LTV) ratios</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
