"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useTranslation, I18nextProvider } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Legend } from "recharts"
import { Download, RefreshCw, AlertTriangle, TrendingUp, Bitcoin, Info } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getPowerLawPrice, type PowerLawLine } from "@/lib/price-models"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PriceModelChart } from "@/components/price-model-chart"
import { ModeToggle } from "@/components/mode-toggle"
import { LocaleSwitcher } from "@/components/locale-switcher"
import i18n from "@/lib/i18n"
import { loadCurrentBtcPrice } from "@/lib/load-btc-price"

// Types
type PriceModel = "manual" | "powerLaw"
type RiskProfile = "safe" | "balanced" | "growth"
type MonthlyEvent =
  | { type: "withdrawal_skipped" }
  | { type: "deleveraged"; amount: number }
  | { type: "liquidated"; id: number }
  | { type: "collateral_topped_up"; loanId: number; amount: number }

interface PowerLawSettings {
  prognosisLine: PowerLawLine
}

interface RiskManagementSettings {
  maxToleratedPriceDropPercent: number
  topUpLtv: number
  liquidationLtv: number
  liquidationFeePercent: number
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
  reinvestmentEnabled: boolean
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
  allTimeHighBtcPrice: number
}

const PLATFORM_LTV_NEW_LOANS = 50

const DEFAULT_PARAMS: SimulationParams = {
  btcAmount: 1,
  initialBtcPrice: 60000,
  monthlyWithdrawalAmount: 1000,
  annualInterestRate: 6.5,
  loanOriginationFeePercent: 1.5,
  loanTermMonths: 12,
  simulationMonths: 144,
  maxLoanAmount: 10000,
  annualGrowthRates: [50, -60, 30, 60, 80, -50, 20, 60, 90, -50, 20, 60],
  reinvestmentEnabled: true,
  priceModel: "powerLaw",
  powerLawSettings: {
    prognosisLine: "fit",
  },
  riskManagement: {
    maxToleratedPriceDropPercent: 80,
    topUpLtv: 70,
    liquidationLtv: 95,
    liquidationFeePercent: 2,
  },
  expectedAnnualInflation: 2,
}

const PARAMS_STORAGE_KEY = "btc-simulator-params-v3"

function BitcoinSimulator() {
  const { t, i18n } = useTranslation()

  const [params, setParams] = useState<SimulationParams>(() => {
    if (typeof window === "undefined") return DEFAULT_PARAMS
    try {
      const savedParams = localStorage.getItem(PARAMS_STORAGE_KEY)
      if (savedParams) {
        const parsed = JSON.parse(savedParams)
        return {
          ...DEFAULT_PARAMS,
          ...parsed,
          powerLawSettings: { ...DEFAULT_PARAMS.powerLawSettings, ...parsed.powerLawSettings },
          riskManagement: { ...DEFAULT_PARAMS.riskManagement, ...parsed.riskManagement },
        }
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
  const [btcPrice, setBtcPrice] = useState<number>(params.initialBtcPrice)
  const [month, setMonth] = useState<number>(1)

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

  const runSimulation = (initialBtcPriceOverride?: number) => {
    const currentParams = initialBtcPriceOverride ? { ...params, initialBtcPrice: initialBtcPriceOverride } : params
    setIsLoading(true)
    setErrors([])

    setTimeout(() => {
      try {
        const tempResults: MonthlyResult[] = []
        let activeLoans: Loan[] = []
        let totalBtcAmount = currentParams.btcAmount
        let nextLoanId = 1
        const simulationStartDate = new Date()
        const monthlyInflationRate = Math.pow(1 + currentParams.expectedAnnualInflation / 100, 1 / 12) - 1
        let cumulativeInflationFactor = 1
        let allTimeHighBtcPrice = currentParams.initialBtcPrice

        for (let month = 1; month <= currentParams.simulationMonths; month++) {
          // A. PREPARATION
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
          } else {
            const prevPrice = month > 1 ? tempResults[month - 2].btcPrice : currentParams.initialBtcPrice
            const yearIndex = Math.min(Math.floor((month - 1) / 12), currentParams.annualGrowthRates.length - 1)
            const annualGrowthRate = currentParams.annualGrowthRates[yearIndex] / 100
            const monthlyGrowthRate = Math.pow(1 + annualGrowthRate, 1 / 12) - 1
            btcPrice = prevPrice * (1 + monthlyGrowthRate)
          }
          allTimeHighBtcPrice = Math.max(allTimeHighBtcPrice, btcPrice)
          const monthlyEvents: MonthlyEvent[] = []

          // B. COLLATERAL MANAGEMENT (TOP-UP) - Unified BTC tracking
          let currentLockedBtc = activeLoans.reduce((sum, l) => sum + l.lockedBtc, 0)
          let currentFreeBtc = Math.max(0, totalBtcAmount - currentLockedBtc)

          if (currentFreeBtc > 0) {
            for (const loan of activeLoans) {
              const currentLoanLtv = (loan.repaymentAmount / (loan.lockedBtc * btcPrice)) * 100
              if (currentLoanLtv > currentParams.riskManagement.topUpLtv) {
                const targetLockedBtc = loan.repaymentAmount / (btcPrice * (PLATFORM_LTV_NEW_LOANS / 100))
                const additionalBtcNeeded = Math.max(0, targetLockedBtc - loan.lockedBtc)
                const btcToMove = Math.min(additionalBtcNeeded, currentFreeBtc)

                if (btcToMove > 0) {
                  loan.lockedBtc += btcToMove
                  currentFreeBtc -= btcToMove
                  currentLockedBtc += btcToMove
                  monthlyEvents.push({ type: "collateral_topped_up", loanId: loan.id, amount: btcToMove })
                }
              }
            }
          }

          // C. DEBT CAPACITY CALCULATION
          const liquidationPrice =
            allTimeHighBtcPrice * (1 - currentParams.riskManagement.maxToleratedPriceDropPercent / 100)
          const collateralValueAtLiquidation = totalBtcAmount * liquidationPrice
          const debtCapacity = collateralValueAtLiquidation * (currentParams.riskManagement.liquidationLtv / 100)

          // D. MONTHLY ACTIONS

          // 1. DETERMINE CURRENT STATE & NEEDS
          const maturingLoans = activeLoans.filter((l) => l.maturityMonth === month)
          const repaymentDue = maturingLoans.reduce((sum, l) => sum + l.repaymentAmount, 0)
          const currentDebt = activeLoans.reduce((sum, l) => sum + l.repaymentAmount, 0)
          let withdrawalThisMonth = currentParams.monthlyWithdrawalAmount

          // 2. CALCULATE AVAILABLE CAPACITY & PLAN NEW LOANS
          const debtFromOngoingLoans = currentDebt - repaymentDue
          const capacityForNewDebt = Math.max(0, debtCapacity - debtFromOngoingLoans)

          let principalToBorrowForNeeds = 0
          let principalToBorrowForReinvestment = 0
          let liquidationOccurred = false

          const proceedsNeededForBoth =
            (repaymentDue + withdrawalThisMonth) / (1 - currentParams.loanOriginationFeePercent / 100)

          if (capacityForNewDebt >= proceedsNeededForBoth) {
            // Happy path: We can cover both repayments and withdrawal
            principalToBorrowForNeeds = proceedsNeededForBoth
          } else {
            // Need to make compromises
            withdrawalThisMonth = 0
            monthlyEvents.push({ type: "withdrawal_skipped" })
            const proceedsNeededForRepayment = repaymentDue / (1 - currentParams.loanOriginationFeePercent / 100)

            if (capacityForNewDebt >= proceedsNeededForRepayment) {
              // Can at least cover repayments
              principalToBorrowForNeeds = proceedsNeededForRepayment
            } else {
              // Cannot even cover repayments fully - need to sell BTC or liquidate
              principalToBorrowForNeeds = Math.max(0, capacityForNewDebt)
              const borrowedProceeds = principalToBorrowForNeeds * (1 - currentParams.loanOriginationFeePercent / 100)
              const shortfall = Math.max(0, repaymentDue - borrowedProceeds)

              if (shortfall > 0) {
                const btcToSell = shortfall / btcPrice

                if (currentFreeBtc >= btcToSell) {
                  // We have enough free BTC to sell
                  const actualBtcSold = Math.min(btcToSell, currentFreeBtc)
                  totalBtcAmount = Math.max(0, totalBtcAmount - actualBtcSold)
                  currentFreeBtc = Math.max(0, currentFreeBtc - actualBtcSold)
                  monthlyEvents.push({ type: "deleveraged", amount: actualBtcSold })
                } else {
                  // Not enough free BTC - liquidation required
                  // SAFE LIQUIDATION: Only liquidate what we actually have
                  const btcLost = maturingLoans.reduce((sum, l) => sum + l.lockedBtc, 0)
                  const safeBtcLoss = Math.min(btcLost, totalBtcAmount)

                  totalBtcAmount = Math.max(0, totalBtcAmount - safeBtcLoss)
                  currentFreeBtc = Math.max(0, totalBtcAmount - (currentLockedBtc - btcLost))

                  maturingLoans.forEach((l) => monthlyEvents.push({ type: "liquidated", id: l.id }))
                  principalToBorrowForNeeds = 0
                  liquidationOccurred = true
                }
              }
            }
          }

          // 3. REINVESTMENT LOGIC (only if no liquidation occurred)
          if (!liquidationOccurred) {
            const debtAfterNeedsLoan = debtFromOngoingLoans + principalToBorrowForNeeds
            const reinvestmentCapacity = Math.max(0, debtCapacity - debtAfterNeedsLoan)
            if (reinvestmentCapacity > 0 && currentParams.reinvestmentEnabled) {
              principalToBorrowForReinvestment = reinvestmentCapacity
            }
          }

          // 4. EXECUTE THE PLAN - Remove maturing loans
          activeLoans = activeLoans.filter((l) => l.maturityMonth !== month)

          // 5. REINVESTMENT EXECUTION
          let reinvestmentAmount = 0
          if (principalToBorrowForReinvestment > 0) {
            const proceeds = principalToBorrowForReinvestment * (1 - currentParams.loanOriginationFeePercent / 100)
            const btcBought = proceeds / btcPrice
            totalBtcAmount += btcBought
            reinvestmentAmount = proceeds
          }

          // 6. CREATE NEW LOANS (Collateral-First Approach)
          const totalNewPrincipalPlanned = principalToBorrowForNeeds + principalToBorrowForReinvestment

          if (totalNewPrincipalPlanned > 0) {
            // Determine max principal possible based on available free BTC
            const availableBtcForLocking = Math.max(
              0,
              totalBtcAmount - activeLoans.reduce((sum, l) => sum + l.lockedBtc, 0),
            )
            const interestFactor = 1 + (currentParams.annualInterestRate / 100) * (currentParams.loanTermMonths / 12)

            // This is the reverse calculation: how much can we borrow with the BTC we have?
            // maxRepayment = (availableBtcForLocking * btcPrice * LTV)
            // maxPrincipal = maxRepayment / interestFactor
            const maxPossibleRepayment = availableBtcForLocking * btcPrice * (PLATFORM_LTV_NEW_LOANS / 100)
            const maxPossiblePrincipal = maxPossibleRepayment / interestFactor

            // Take the minimum of what's planned vs. what's possible
            const totalNewPrincipal = Math.min(totalNewPrincipalPlanned, maxPossiblePrincipal)

            // Recalculate reinvestment amount based on the actual principal taken
            if (principalToBorrowForReinvestment > 0) {
              const actualReinvestmentPrincipal = Math.max(0, totalNewPrincipal - principalToBorrowForNeeds)
              reinvestmentAmount = actualReinvestmentPrincipal * (1 - currentParams.loanOriginationFeePercent / 100)
              const btcBought = reinvestmentAmount / btcPrice
              // Important: Add the bought BTC *before* locking it for the new loan
              totalBtcAmount += btcBought
            }

            let principalLeftToCreate = totalNewPrincipal
            while (principalLeftToCreate > 0) {
              const loanPrincipal = Math.min(principalLeftToCreate, currentParams.maxLoanAmount)
              const newRepaymentAmount = loanPrincipal * interestFactor
              const btcToLock = newRepaymentAmount / (btcPrice * (PLATFORM_LTV_NEW_LOANS / 100))

              // This check is now more robust because we've pre-calculated the max possible loan
              const currentFreeBtcForLocking = Math.max(
                0,
                totalBtcAmount - activeLoans.reduce((sum, l) => sum + l.lockedBtc, 0),
              )
              if (btcToLock <= currentFreeBtcForLocking) {
                activeLoans.push({
                  id: nextLoanId++,
                  month: month,
                  principal: loanPrincipal,
                  maturityMonth: month + currentParams.loanTermMonths,
                  repaymentAmount: newRepaymentAmount,
                  lockedBtc: btcToLock,
                })
              } else {
                // This case should ideally not be hit due to the maxPossiblePrincipal calculation,
                // but as a safeguard, we log it and break to prevent creating bad loans.
                console.warn(
                  `Month ${month}: Not enough free BTC to lock for a planned loan. Short by ${btcToLock - currentFreeBtcForLocking} BTC.`,
                )
                break
              }
              principalLeftToCreate -= loanPrincipal
            }
          }

          // 7. FINAL CALCULATIONS FOR REPORTING
          const finalTotalDebt = activeLoans.reduce((sum, l) => sum + l.repaymentAmount, 0)
          const finalCollateralValue = Math.max(0, totalBtcAmount * btcPrice)
          const finalLockedBtc = activeLoans.reduce((sum, l) => sum + l.lockedBtc, 0)
          const finalFreeBtc = Math.max(0, totalBtcAmount - finalLockedBtc)
          const highestLtv =
            activeLoans.length > 0
              ? Math.max(...activeLoans.map((l) => (l.repaymentAmount / (l.lockedBtc * btcPrice)) * 100))
              : 0

          const totalNewPrincipal = totalNewPrincipalPlanned // Declare totalNewPrincipal here

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
            currentBtcAmount: Math.max(0, totalBtcAmount),
            freeBtc: finalFreeBtc,
            lockedBtc: finalLockedBtc,
            loanCount: activeLoans.length,
            highestLtv: isFinite(highestLtv) ? Math.round(highestLtv) : 0,
            events: monthlyEvents,
            allTimeHighBtcPrice,
          })
        }
        setResults(tempResults)
      } catch (error) {
        console.error("Simulation error:", error)
        setErrors(["An unexpected error occurred during the simulation."])
      } finally {
        setIsLoading(false)
      }
    }, 50)
  }

  useEffect(() => {
    const initializeSimulation = async () => {
      setIsLoading(true)
      setErrors([])
      if (params.initialBtcPrice === DEFAULT_PARAMS.initialBtcPrice) {
        const fetchedPrice = await loadCurrentBtcPrice()
        runSimulation(fetchedPrice ?? undefined)
      } else {
        runSimulation()
      }
    }
    initializeSimulation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const chartData = useMemo(() => {
    if (!results) return []
    return results.map((r) => ({
      date: r.dateString,
      collateralValue: r.collateralValue,
      lockedCollateralValue: r.lockedBtc * r.btcPrice,
      totalDebt: r.totalDebt,
      realCollateralValue: r.realCollateralValue,
      realTotalDebt: r.realTotalDebt,
      btcPrice: r.btcPrice,
      liquidationThresholdPrice: r.allTimeHighBtcPrice * (1 - params.riskManagement.maxToleratedPriceDropPercent / 100),
    }))
  }, [results, params.riskManagement.maxToleratedPriceDropPercent])

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
                        <Button variant="outline" size="icon" onClick={loadCurrentBtcPrice} disabled={loadingBtcPrice}>
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
                  <div className="flex items-center space-x-2 pt-4">
                    <Checkbox
                      id="reinvestmentEnabled"
                      checked={params.reinvestmentEnabled}
                      onCheckedChange={(checked) => setParams((p) => ({ ...p, reinvestmentEnabled: !!checked }))}
                    />
                    <Label htmlFor="reinvestmentEnabled">{t("Strategy.reinvestSurplus")}</Label>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t("RiskManagement.title")}</CardTitle>
                <CardDescription>{t("RiskManagement.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="maxToleratedPriceDropPercent">{t("RiskManagement.maxPriceDrop")}</Label>
                    <Input
                      id="maxToleratedPriceDropPercent"
                      type="number"
                      value={params.riskManagement.maxToleratedPriceDropPercent}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          riskManagement: { ...p.riskManagement, maxToleratedPriceDropPercent: Number(e.target.value) },
                        }))
                      }
                      min="0"
                      max="99"
                    />
                  </div>
                  <div>
                    <Label htmlFor="topUpLtv">{t("RiskManagement.deleveragingLtv")}</Label>
                    <Input
                      id="topUpLtv"
                      type="number"
                      value={params.riskManagement.topUpLtv}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          riskManagement: { ...p.riskManagement, topUpLtv: Number(e.target.value) },
                        }))
                      }
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
                        </SelectContent>
                      </Select>
                    </div>
                    {params.priceModel === "powerLaw" && (
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
                  {params.priceModel === "powerLaw" && (
                    <div className="mt-4">
                      <PriceModelChart simulationMonths={params.simulationMonths} />
                    </div>
                  )}
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
              <Button onClick={() => runSimulation()} disabled={isLoading} className="flex items-center gap-2">
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
                            <th className="p-2">{t("Results.tableLoanCount")}</th>
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
                                  r.highestLtv >= params.riskManagement.liquidationLtv
                                    ? "text-red-500"
                                    : r.highestLtv >= params.riskManagement.topUpLtv
                                      ? "text-yellow-500"
                                      : ""
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
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="liquidationThresholdPrice"
                          name={t("Chart.legendLiquidationThreshold")}
                          stroke="#e11d48"
                          strokeDasharray="5 5"
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
