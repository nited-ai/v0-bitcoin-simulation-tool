"use client"

import { useState, useEffect, useMemo, Suspense, useCallback, useRef } from "react"
import { useTranslation, I18nextProvider } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Legend } from "recharts"
import { Download, RefreshCw, AlertTriangle, TrendingUp, Bitcoin, Info } from "lucide-react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getPowerLawPrice, type PowerLawLine, getDaysSinceGenesis } from "@/lib/price-models/power-law"
import { getCycleRepeatPrice } from "@/lib/price-models/cycle-repeat"
import { loadPriceHistoryFromCsv } from "@/lib/csv-loader"
import { fetchRecentDailyPrices } from "@/lib/api/fetch-recent-prices"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PriceModelChart } from "@/components/price-model-chart"
import { ModeToggle } from "@/components/mode-toggle"
import { LocaleSwitcher } from "@/components/locale-switcher"
import i18n from "@/lib/i18n"
import { loadCurrentBtcPrice } from "@/lib/load-btc-price"

// Types
type PriceModel = "manual" | "powerLaw" | "cycleRepeat" | "cycleRepeatPowerLaw"
type MonthlyEvent =
  | { type: "withdrawal_skipped" }
  | { type: "deleveraged"; amount: number }
  | { type: "liquidated"; id: number }
  | { type: "collateral_topped_up"; loanId: number; amount: number }

interface PowerLawSettings {
  prognosisLine: PowerLawLine
}

interface RiskManagementSettings {
  targetLtv: number
  liquidationLtv: number
}

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
  powerLawSettings: PowerLawSettings
  riskManagement: RiskManagementSettings
  expectedAnnualInflation: number
}

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

interface HistoricalDataPoint {
  time: number
  close: number
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
  annualGrowthRates: [50, -50, -30, 110, 120, -50, -30, 110, 150, -50, -30, 110],
  priceModel: "manual",
  powerLawSettings: {
    prognosisLine: "fit",
  },
  riskManagement: {
    targetLtv: 50,
    liquidationLtv: 95,
  },
  expectedAnnualInflation: 2,
}

const PARAMS_STORAGE_KEY = "btc-simulator-params-v18" // Final calibration

function BitcoinSimulator() {
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

  const historicalDailyMultipliers = useMemo(() => {
    if (params.priceModel !== "cycleRepeat" || historicalPriceData.length < 2) {
      return null
    }
    const multipliers: number[] = []
    const relevantData = historicalPriceData.slice(-1458)
    for (let i = 1; i < relevantData.length; i++) {
      multipliers.push(relevantData[i].close / relevantData[i - 1].close)
    }
    return multipliers
  }, [historicalPriceData, params.priceModel])

  const historicalChannelPositions = useMemo(() => {
    if (params.priceModel !== "cycleRepeatPowerLaw" || historicalPriceData.length === 0) {
      return null
    }

    const positions = historicalPriceData.slice(-1458).map((dataPoint) => {
      const date = new Date(dataPoint.time * 1000)
      const price = dataPoint.close
      const support = getPowerLawPrice(date, "support")
      const resistance = getPowerLawPrice(date, "resistance")
      const channelWidth = resistance - support

      if (channelWidth <= 0) {
        return 0.5 // Default to fit line if channel is invalid
      }

      const position = (price - support) / channelWidth
      // Clamp the value between 0 and 1 to handle historical breaches
      return Math.max(0, Math.min(1, position))
    })

    return positions
  }, [historicalPriceData, params.priceModel])

  const runSimulation = useCallback(
    async (initialBtcPriceOverride?: number) => {
      const currentParams = initialBtcPriceOverride ? { ...params, initialBtcPrice: initialBtcPriceOverride } : params
      setIsLoading(true)
      setErrors([])

      await new Promise((resolve) => setTimeout(resolve, 50))

      try {
        if (currentParams.priceModel === "cycleRepeat" && !historicalDailyMultipliers) {
          setErrors((prev) => [...prev, t("Errors.historicalDataNotReady")])
          setIsLoading(false)
          return
        }
        if (currentParams.priceModel === "cycleRepeatPowerLaw" && !historicalChannelPositions) {
          setErrors((prev) => [...prev, t("Errors.historicalDataNotReady")])
          setIsLoading(false)
          return
        }

        const tempResults: MonthlyResult[] = []
        let activeLoans: Loan[] = []
        let totalBtcAmount = currentParams.btcAmount
        let nextLoanId = 1
        const simulationStartDate = new Date()
        const monthlyInflationRate = Math.pow(1 + currentParams.expectedAnnualInflation / 100, 1 / 12) - 1
        let cumulativeInflationFactor = 1

        for (let month = 1; month <= currentParams.simulationMonths; month++) {
          cumulativeInflationFactor *= 1 + monthlyInflationRate
          const currentDate = new Date(simulationStartDate)
          currentDate.setMonth(currentDate.getMonth() + month - 1)
          const dateString = `${(currentDate.getMonth() + 1).toString().padStart(2, "0")}/${currentDate.getFullYear()}`

          let btcPrice: number
          if (currentParams.priceModel === "powerLaw") {
            btcPrice =
              month === 1
                ? currentParams.initialBtcPrice
                : getPowerLawPrice(currentDate, currentParams.powerLawSettings.prognosisLine)
          } else if (currentParams.priceModel === "manual") {
            const prevPrice = month > 1 ? tempResults[month - 2].btcPrice : currentParams.initialBtcPrice
            const yearIndex = Math.min(Math.floor((month - 1) / 12), currentParams.annualGrowthRates.length - 1)
            const annualGrowthRate = currentParams.annualGrowthRates[yearIndex] / 100
            const monthlyGrowthRate = Math.pow(1 + annualGrowthRate, 1 / 12) - 1
            btcPrice = prevPrice * (1 + monthlyGrowthRate)
          } else if (currentParams.priceModel === "cycleRepeat") {
            btcPrice = getCycleRepeatPrice(
              month,
              currentParams.initialBtcPrice,
              historicalDailyMultipliers!,
              currentParams.simulationMonths,
            )
          } else if (currentParams.priceModel === "cycleRepeatPowerLaw") {
            const midMonthDate = new Date(currentDate)
            midMonthDate.setDate(15)

            const diffTime = midMonthDate.getTime() - simulationStartDate.getTime()
            const daysIntoSimulation = Math.floor(diffTime / (1000 * 60 * 60 * 24))

            const positionIndex = daysIntoSimulation % historicalChannelPositions!.length
            const channelPosition = historicalChannelPositions![positionIndex]

            const futureSupport = getPowerLawPrice(midMonthDate, "support")
            const futureResistance = getPowerLawPrice(midMonthDate, "resistance")
            const futureChannelWidth = futureResistance - futureSupport

            btcPrice = futureSupport + channelPosition * futureChannelWidth
          } else {
            btcPrice = currentParams.initialBtcPrice
          }
          const monthlyEvents: MonthlyEvent[] = []

          const collateralValue = totalBtcAmount * btcPrice
          const debtCapacity = collateralValue * (currentParams.riskManagement.targetLtv / 100)

          const maturingLoans = activeLoans.filter((l) => l.maturityMonth === month)
          const repaymentDue = maturingLoans.reduce((sum, l) => sum + l.repaymentAmount, 0)
          const debtFromOngoingLoans = activeLoans
            .filter((l) => l.maturityMonth !== month)
            .reduce((sum, l) => sum + l.repaymentAmount, 0)
          let withdrawalThisMonth = currentParams.monthlyWithdrawalAmount

          let principalForNeeds =
            (repaymentDue + withdrawalThisMonth) / (1 - currentParams.loanOriginationFeePercent / 100)
          let principalForReinvestment = 0

          const projectedDebtAfterNeeds = debtFromOngoingLoans + principalForNeeds

          if (projectedDebtAfterNeeds <= debtCapacity) {
            const remainingDebtCapacity = debtCapacity - projectedDebtAfterNeeds
            principalForReinvestment = remainingDebtCapacity
          } else {
            principalForReinvestment = 0
            withdrawalThisMonth = 0
            monthlyEvents.push({ type: "withdrawal_skipped" })

            principalForNeeds = repaymentDue / (1 - currentParams.loanOriginationFeePercent / 100)
            const projectedDebtForRepaymentOnly = debtFromOngoingLoans + principalForNeeds

            if (projectedDebtForRepaymentOnly > debtCapacity) {
              const shortfall = projectedDebtForRepaymentOnly - debtCapacity
              const btcToSell = shortfall / btcPrice

              if (totalBtcAmount > btcToSell) {
                totalBtcAmount -= btcToSell
                monthlyEvents.push({ type: "deleveraged", amount: btcToSell })
                principalForNeeds = debtCapacity - debtFromOngoingLoans
              } else {
                totalBtcAmount = 0
                activeLoans.forEach((l) => monthlyEvents.push({ type: "liquidated", id: l.id }))
                principalForNeeds = 0
              }
            }
          }

          activeLoans = activeLoans.filter((l) => l.maturityMonth !== month)

          const totalNewPrincipal = principalForNeeds + principalForReinvestment
          const interestFactor = 1 + (currentParams.annualInterestRate / 100) * (currentParams.loanTermMonths / 12)

          let principalLeftToCreate = totalNewPrincipal
          while (principalLeftToCreate > 1) {
            const loanPrincipal = Math.min(principalLeftToCreate, currentParams.maxLoanAmount)
            const newRepaymentAmount = loanPrincipal * interestFactor
            const btcToLock = newRepaymentAmount / (btcPrice * (PLATFORM_LTV_NEW_LOANS / 100))

            if (totalBtcAmount < btcToLock) break

            activeLoans.push({
              id: nextLoanId++,
              month: month,
              principal: loanPrincipal,
              maturityMonth: month + currentParams.loanTermMonths,
              repaymentAmount: newRepaymentAmount,
              lockedBtc: btcToLock,
            })
            principalLeftToCreate -= loanPrincipal
          }

          let reinvestmentAmount = 0
          if (principalForReinvestment > 0) {
            const proceeds = principalForReinvestment * (1 - currentParams.loanOriginationFeePercent / 100)
            const btcBought = proceeds / btcPrice
            totalBtcAmount += btcBought
            reinvestmentAmount = proceeds
          }

          const finalTotalDebt = activeLoans.reduce((sum, l) => sum + l.repaymentAmount, 0)
          const finalCollateralValue = totalBtcAmount * btcPrice
          const finalLockedBtc = activeLoans.reduce((sum, l) => sum + l.lockedBtc, 0)
          const finalFreeBtc = totalBtcAmount - finalLockedBtc
          const highestLtv =
            activeLoans.length > 0
              ? Math.max(...activeLoans.map((l) => (l.repaymentAmount / (l.lockedBtc * btcPrice)) * 100))
              : 0

          tempResults.push({
            month,
            dateString,
            btcPrice: Math.round(btcPrice),
            collateralValue: Math.round(finalCollateralValue),
            realCollateralValue: Math.round(finalCollateralValue / cumulativeInflationFactor),
            totalDebt: Math.round(finalTotalDebt),
            realTotalDebt: Math.round(finalTotalDebt / cumulativeInflationFactor),
            withdrawalAmount: Math.round(withdrawalThisMonth),
            newLoanPrincipal: Math.round(totalNewPrincipal),
            repaymentsDue: Math.round(repaymentDue),
            reinvestment: Math.round(reinvestmentAmount),
            currentBtcAmount: totalBtcAmount,
            freeBtc: finalFreeBtc,
            lockedBtc: finalLockedBtc,
            loanCount: activeLoans.length,
            highestLtv: isFinite(highestLtv) ? Math.round(highestLtv) : 0,
            events: monthlyEvents,
          })
        }
        setResults(tempResults)
      } catch (error) {
        console.error("Simulation error:", error)
        setErrors(["An unexpected error occurred during the simulation."])
      } finally {
        setIsLoading(false)
      }
    },
    [params, historicalDailyMultipliers, historicalChannelPositions, t],
  )

  useEffect(() => {
    const loadAndRun = async () => {
      setIsLoading(true)
      setErrors([])
      try {
        const HALVING_2016_TIMESTAMP_SECONDS = Math.floor(new Date("2016-07-09T00:00:00Z").getTime() / 1000)

        let csvData = await loadPriceHistoryFromCsv()
        csvData = csvData.filter((d) => d.time >= HALVING_2016_TIMESTAMP_SECONDS)

        const lastEntry = csvData.length > 0 ? csvData[csvData.length - 1] : null

        if (lastEntry) {
          const now = new Date()
          now.setUTCHours(0, 0, 0, 0)
          const lastDate = new Date(lastEntry.time * 1000)
          lastDate.setUTCHours(0, 0, 0, 0)

          const daysSinceLastEntry = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

          if (daysSinceLastEntry > 0) {
            const newData = await fetchRecentDailyPrices(daysSinceLastEntry)
            if (newData.length > 0) {
              const combined = new Map(csvData.map((d) => [d.time, d]))
              newData.forEach((d) => combined.set(d.time, d))
              csvData = Array.from(combined.values()).sort((a, b) => a.time - b.time)
            }
          }
        } else {
          const now = new Date()
          now.setUTCHours(0, 0, 0, 0)
          const daysToFetch = Math.floor((now.getTime() / 1000 - HALVING_2016_TIMESTAMP_SECONDS) / (60 * 60 * 24))
          const newData = await fetchRecentDailyPrices(daysToFetch)
          if (newData.length > 0) {
            csvData = newData.sort((a, b) => a.time - b.time)
          }
        }

        setHistoricalPriceData(csvData)

        const latestPrice = csvData.length > 0 ? csvData[csvData.length - 1].close : DEFAULT_PARAMS.initialBtcPrice
        if (firstRun.current) {
          firstRun.current = false
          const initialPrice = (await loadCurrentBtcPrice()) ?? latestPrice
          setParams((p) => ({ ...p, initialBtcPrice: initialPrice }))
        } else {
          await runSimulation()
        }
      } catch (e) {
        console.error("Failed to load data and run simulation:", e)
        setErrors((prev) => [...prev, t("Errors.failedToLoadHistoricalData")])
      } finally {
        setIsLoading(false)
      }
    }

    loadAndRun()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t])

  useEffect(() => {
    if (!firstRun.current) {
      runSimulation()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, historicalPriceData])

  const chartData = useMemo(() => {
    const dataMap = new Map<string, any>()

    historicalPriceData.forEach((point) => {
      const date = new Date(point.time * 1000)
      const dateString = `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`
      dataMap.set(dateString, {
        date: dateString,
        days: getDaysSinceGenesis(date),
        historicalPrice: point.close,
      })
    })

    results.forEach((point) => {
      const date = new Date(point.dateString.split("/")[1], Number(point.dateString.split("/")[0]) - 1)
      const currentData = dataMap.get(point.dateString) || {}
      dataMap.set(point.dateString, {
        ...currentData,
        date: point.dateString,
        days: getDaysSinceGenesis(date),
        simulationPath: point.btcPrice,
      })
    })

    const combinedData = Array.from(dataMap.values())

    combinedData.sort((a, b) => a.days - b.days)

    return combinedData.map((point) => {
      const dateForPL = new Date() // Dummy date, as getPowerLawPrice works with days
      // We can't easily go from days back to a precise date, but we don't need to.
      // The price function only needs the number of days.
      const getPriceByDays = (days: number, line: PowerLawLine) => {
        const model = {
          fit: { slope: 5.68, intercept: -16.493 },
          support: { slope: 5.85, intercept: -17.55 },
          resistance: { slope: 5.57, intercept: -15.75 },
        }[line]
        const logPrice = model.slope * Math.log10(days) + model.intercept
        const priceUsd = Math.pow(10, logPrice)
        return priceUsd * 0.92
      }

      return {
        ...point,
        fit: getPriceByDays(point.days, "fit"),
        support: getPriceByDays(point.days, "support"),
        resistance: getPriceByDays(point.days, "resistance"),
      }
    })
  }, [historicalPriceData, results])

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
    runSimulation()
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
                      <Label htmlFor="btcAmount">{t("BasicParams.btcAmount")}</Label>
                      <Input
                        id="btcAmount"
                        type="number"
                        value={params.btcAmount}
                        onChange={(e) => setParams((p) => ({ ...p, btcAmount: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="initialBtcPrice">{t("BasicParams.initialBtcPrice")}</Label>
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
                      <Label htmlFor="loanTermMonths">{t("BasicParams.loanTerm")}</Label>
                      <Input
                        id="loanTermMonths"
                        type="number"
                        value={params.loanTermMonths}
                        onChange={(e) => setParams((p) => ({ ...p, loanTermMonths: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="simulationMonths">{t("BasicParams.simulationDuration")}</Label>
                      <Input
                        id="simulationMonths"
                        type="number"
                        value={params.simulationMonths}
                        onChange={(e) => setParams((p) => ({ ...p, simulationMonths: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="annualInterestRate">{t("BasicParams.interestRate")}</Label>
                      <Input
                        id="annualInterestRate"
                        type="number"
                        value={params.annualInterestRate}
                        onChange={(e) => setParams((p) => ({ ...p, annualInterestRate: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="loanOriginationFeePercent">{t("BasicParams.originationFee")}</Label>
                      <Input
                        id="loanOriginationFeePercent"
                        type="number"
                        value={params.loanOriginationFeePercent}
                        onChange={(e) =>
                          setParams((p) => ({ ...p, loanOriginationFeePercent: Number(e.target.value) }))
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="maxLoanAmount">{t("BasicParams.maxLoanAmount")}</Label>
                    <Input
                      id="maxLoanAmount"
                      type="number"
                      value={params.maxLoanAmount}
                      onChange={(e) => setParams((p) => ({ ...p, maxLoanAmount: Number(e.target.value) }))}
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
                      <Label htmlFor="monthlyWithdrawalAmount">{t("Strategy.monthlyWithdrawal")}</Label>
                      <Input
                        id="monthlyWithdrawalAmount"
                        type="number"
                        value={params.monthlyWithdrawalAmount}
                        onChange={(e) => setParams((p) => ({ ...p, monthlyWithdrawalAmount: Number(e.target.value) }))}
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
                        <Label htmlFor="targetLtv">{t("RiskManagement.targetLtv")}</Label>
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
                        />
                      </div>
                      <div>
                        <Label htmlFor="liquidationLtv">{t("RiskManagement.liquidationLtv")}</Label>
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
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t("EconomicAssumptions.title")}</CardTitle>
                <CardDescription>{t("EconomicAssumptions.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="expectedAnnualInflation">{t("EconomicAssumptions.inflation")}</Label>
                  <Input
                    id="expectedAnnualInflation"
                    type="number"
                    value={params.expectedAnnualInflation}
                    onChange={(e) => setParams((p) => ({ ...p, expectedAnnualInflation: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-4">
                  <Label>{t("PriceModel.title")}</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    <div className="md:col-span-1">
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
                    {(params.priceModel === "powerLaw" || params.priceModel === "cycleRepeatPowerLaw") && (
                      <div className="md:col-span-2">
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
                    <PriceModelChart chartData={chartData} isLoading={isLoading} />
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

            <div className="flex flex-wrap gap-4">
              <Button
                onClick={() => runSimulation()}
                disabled={
                  isLoading ||
                  (params.priceModel === "cycleRepeat" && !historicalDailyMultipliers) ||
                  (params.priceModel === "cycleRepeatPowerLaw" && !historicalChannelPositions)
                }
                className="flex items-center gap-2"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                {isLoading ? t("Parameters.calculating") : t("Parameters.runSimulation")}
              </Button>
              <Button variant="outline" onClick={resetParams}>
                {t("Parameters.reset")}
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
            {chartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("Chart.debtVsCollateralTitle")}</CardTitle>
                  <CardDescription>{t("Chart.debtVsCollateralDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
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
                        <Tooltip
                          formatter={(value: number, name: string) => [`${value.toLocaleString("de-DE")} €`, name]}
                          labelFormatter={(date) => `${t("Chart.date")}: ${date}`}
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

export default function Page() {
  return (
    <Suspense fallback={<div className="w-full h-screen animate-pulse bg-secondary" />}>
      <I18nextProvider i18n={i18n}>
        <BitcoinSimulator />
      </I18nextProvider>
    </Suspense>
  )
}
