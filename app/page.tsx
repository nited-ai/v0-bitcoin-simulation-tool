"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart } from "recharts"
import { Download, RefreshCw, AlertTriangle, TrendingUp, Bitcoin, Info } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip as ShadcnTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getPowerLawPrice, type PowerLawLine } from "@/lib/price-models"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PriceModelChart } from "@/components/price-model-chart"
import { ModeToggle } from "@/components/mode-toggle"

// Types
type PriceModel = "manual" | "powerLaw"

interface PowerLawSettings {
  prognosisLine: PowerLawLine
  liquidationLine: PowerLawLine
}

interface RiskManagementSettings {
  initialLoanLtv: number
  warningLtv: number
  deleveragingLtv: number
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
  annualGrowthRates: number[]
  reinvestmentEnabled: boolean
  priceModel: PriceModel
  powerLawSettings: PowerLawSettings
  manualModeSafetyDiscount: number
  riskManagement: RiskManagementSettings
}

interface Loan {
  month: number
  principal: number
  maturityMonth: number
  repaymentAmount: number
  lockedBtc: number
}

interface MonthlyResult {
  month: number
  year: number
  dateString: string
  btcPrice: number
  collateralValue: number
  lockedCollateralValue: number
  withdrawalAmount: number
  reinvestmentAmount: number
  newLoanAmount: number
  loanRepayments: number
  totalOutstandingDebt: number
  secureDebtLimit: number
  ltvStatus: "OK" | "Überschritten"
  activeLoans: Loan[]
  isLiquidated: boolean
  currentBtcAmount: number
  unencumberedBtc: number
  lockedBtc: number
  liquidatedBtc: number
  controlledSaleBtc: number
  highestIndividualLtv: number
  totalLtv: number
}

const DEFAULT_PARAMS: SimulationParams = {
  btcAmount: 1,
  initialBtcPrice: 100000,
  monthlyWithdrawalAmount: 1000,
  annualInterestRate: 6.5,
  loanOriginationFeePercent: 1.5,
  loanTermMonths: 6,
  simulationMonths: 144,
  annualGrowthRates: [60, -60, 20, 60, 70, -50, 20, 60, 90, -50, 20, 20],
  reinvestmentEnabled: true,
  priceModel: "manual",
  powerLawSettings: {
    prognosisLine: "fit",
    liquidationLine: "support",
  },
  manualModeSafetyDiscount: 50,
  riskManagement: {
    initialLoanLtv: 50,
    warningLtv: 60,
    deleveragingLtv: 75,
    liquidationLtv: 90,
  },
}

const lineConfig = {
  collateralValue: { name: "Collateral-Wert (Gesamt)", color: "#8884d8" },
  lockedCollateralValue: { name: "Gesperrter Collateral-Wert", color: "#facc15" },
  totalDebt: { name: "Gesamtschuld", color: "#ef4444" },
  secureDebtLimit: { name: "Sichere Kreditgrenze", color: "#22c55e" },
  liquidationLevel: { name: "Persönl. Liquidationsgrenze", color: "#06b6d4" },
}

export default function BitcoinBulletCreditSimulator() {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS)
  const [results, setResults] = useState<MonthlyResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])
  const [loadingBtcPrice, setLoadingBtcPrice] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [lineVisibility, setLineVisibility] = useState({
    collateralValue: true,
    lockedCollateralValue: true,
    totalDebt: true,
    secureDebtLimit: true,
    liquidationLevel: true,
  })

  const itemsPerPage = 125
  const totalPages = Math.ceil(params.simulationMonths / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentResults = results.slice(startIndex, endIndex)

  const handleLineVisibilityChange = (lineKey: keyof typeof lineVisibility) => {
    setLineVisibility((prev) => ({
      ...prev,
      [lineKey]: !prev[lineKey],
    }))
  }

  const validateParams = (p: SimulationParams): string[] => {
    const errors: string[] = []
    if (p.btcAmount <= 0) errors.push("BTC-Menge muss positiv sein")
    if (p.initialBtcPrice <= 0) errors.push("BTC-Preis muss positiv sein")
    return errors
  }

  const loadCurrentBtcPrice = async () => {
    setLoadingBtcPrice(true)
    try {
      const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur")
      const data = await response.json()
      const currentPrice = data.bitcoin?.eur
      if (currentPrice) {
        setParams((prev) => ({ ...prev, initialBtcPrice: Math.round(currentPrice) }))
        return Math.round(currentPrice)
      } else {
        throw new Error("Preis nicht verfügbar")
      }
    } catch (error) {
      console.error("Fehler beim Laden des BTC-Preises:", error)
      alert("Fehler beim Laden des aktuellen BTC-Preises. Bitte manuell eingeben.")
      return null
    } finally {
      setLoadingBtcPrice(false)
    }
  }

  const calculateRepaymentAmount = (principal: number, annualRate: number, termMonths: number): number => {
    return principal * (1 + (annualRate / 100) * (termMonths / 12))
  }

  const getPricesForMonth = (
    month: number,
    params: SimulationParams,
    previousBtcPrice: number | null,
    simulationStartDate: Date,
  ): { forecastPrice: number; supportPrice: number } => {
    const currentDate = new Date(simulationStartDate)
    currentDate.setMonth(currentDate.getMonth() + month - 1)

    let forecastPrice: number
    let supportPrice: number

    if (params.priceModel === "powerLaw") {
      forecastPrice =
        month === 1 ? params.initialBtcPrice : getPowerLawPrice(currentDate, params.powerLawSettings.prognosisLine)
      supportPrice = getPowerLawPrice(currentDate, params.powerLawSettings.liquidationLine)
    } else {
      if (month === 1) {
        forecastPrice = params.initialBtcPrice
      } else {
        const year = Math.floor((month - 1) / 12) + 1
        const yearIndex = Math.min(year - 1, params.annualGrowthRates.length - 1)
        const annualGrowthRate = params.annualGrowthRates[yearIndex] / 100
        const monthlyGrowthRate = Math.pow(1 + annualGrowthRate, 1 / 12) - 1
        forecastPrice = previousBtcPrice! * (1 + monthlyGrowthRate)
      }
      supportPrice = forecastPrice * (1 - params.manualModeSafetyDiscount / 100)
    }

    return { forecastPrice, supportPrice }
  }

  const runSimulation = (initialBtcPriceOverride?: number) => {
    const currentParams =
      initialBtcPriceOverride !== undefined ? { ...params, initialBtcPrice: initialBtcPriceOverride } : params
    const validationErrors = validateParams(currentParams)
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      setIsLoading(false)
      return
    }
    setErrors([])
    setIsLoading(true)

    const MIN_LOAN_AMOUNT = 1000
    const MAX_LOAN_AMOUNT = 15000

    try {
      const tempResults: MonthlyResult[] = []
      let activeLoans: Loan[] = []
      let unencumberedBtc = currentParams.btcAmount
      const simulationStartDate = new Date()
      const { riskManagement } = currentParams

      for (let month = 1; month <= currentParams.simulationMonths; month++) {
        const currentDate = new Date(simulationStartDate)
        currentDate.setMonth(currentDate.getMonth() + month - 1)
        const dateString = `${(currentDate.getMonth() + 1).toString().padStart(2, "0")}/${currentDate
          .getFullYear()
          .toString()
          .slice(-2)}`

        const previousBtcPrice = month === 1 ? null : tempResults[month - 2].btcPrice
        const { forecastPrice: btcPrice, supportPrice } = getPricesForMonth(
          month,
          currentParams,
          previousBtcPrice,
          simulationStartDate,
        )

        // Liquidation & Deleveraging (no changes)
        // ... (code for liquidation and deleveraging remains the same)
        let liquidatedBtcThisMonth = 0
        const survivingLoans: Loan[] = []
        activeLoans.forEach((loan) => {
          const individualLtv = loan.repaymentAmount / (loan.lockedBtc * btcPrice)
          if (individualLtv >= riskManagement.liquidationLtv / 100) {
            liquidatedBtcThisMonth += loan.lockedBtc
          } else {
            survivingLoans.push(loan)
          }
        })
        activeLoans = survivingLoans

        let controlledSaleBtc = 0
        const currentTotalDebtBeforeNewLoans = activeLoans.reduce((sum, l) => sum + l.repaymentAmount, 0)
        const currentTotalBtc = unencumberedBtc + activeLoans.reduce((sum, l) => sum + l.lockedBtc, 0)
        const currentCollateralValue = currentTotalBtc * btcPrice
        const totalLtv = currentCollateralValue > 0 ? currentTotalDebtBeforeNewLoans / currentCollateralValue : 0

        if (totalLtv > riskManagement.deleveragingLtv / 100 && unencumberedBtc > 0) {
          const targetDebt = currentCollateralValue * (riskManagement.warningLtv / 100)
          const debtToRepay = currentTotalDebtBeforeNewLoans - targetDebt
          const btcToSell = debtToRepay / btcPrice
          const actualBtcSold = Math.min(unencumberedBtc, btcToSell)
          controlledSaleBtc = actualBtcSold
          unencumberedBtc -= actualBtcSold
          let repaidAmount = actualBtcSold * btcPrice
          activeLoans.sort((a, b) => b.month - a.month)
          const remainingLoans: Loan[] = []
          for (const loan of activeLoans) {
            if (repaidAmount <= 0) {
              remainingLoans.push(loan)
              continue
            }
            const repaymentForThisLoan = Math.min(repaidAmount, loan.repaymentAmount)
            const principalReduction =
              repaymentForThisLoan /
              (1 + (currentParams.annualInterestRate / 100) * (currentParams.loanTermMonths / 12))
            if (repaymentForThisLoan < loan.repaymentAmount) {
              remainingLoans.push({
                ...loan,
                principal: loan.principal - principalReduction,
                repaymentAmount: loan.repaymentAmount - repaymentForThisLoan,
              })
            } else {
              unencumberedBtc += loan.lockedBtc
            }
            repaidAmount -= repaymentForThisLoan
          }
          activeLoans = remainingLoans
        }

        // --- FUNDAMENTALLY NEW LOAN LOGIC ---

        // 1. Handle maturing loans
        const maturingLoans = activeLoans.filter((l) => l.maturityMonth === month)
        const loanRepayments = maturingLoans.reduce((sum, l) => sum + l.repaymentAmount, 0)
        const btcToUnlock = maturingLoans.reduce((sum, l) => sum + l.lockedBtc, 0)
        unencumberedBtc += btcToUnlock
        const currentActiveLoans = activeLoans.filter((l) => l.maturityMonth !== month)

        // 2. Define factors
        const interestFactor = 1 + (currentParams.annualInterestRate / 100) * (currentParams.loanTermMonths / 12)
        const feeFactor = 1 - currentParams.loanOriginationFeePercent / 100

        // 3. Determine total loan principal based on strategy (Reinvest ON or OFF)
        let targetTotalPrincipal = 0
        const requiredLiquidity = loanRepayments + currentParams.monthlyWithdrawalAmount
        const requiredPrincipalForNeeds = feeFactor > 0 ? requiredLiquidity / feeFactor : Number.POSITIVE_INFINITY

        if (currentParams.reinvestmentEnabled) {
          // MODE: AGGRESSIVE ACCUMULATION
          const currentDebt = currentActiveLoans.reduce((sum, l) => sum + l.repaymentAmount, 0)
          const worstCaseCollateralValue =
            (unencumberedBtc + currentActiveLoans.reduce((sum, l) => sum + l.lockedBtc, 0)) * supportPrice
          const secureDebtLimit = worstCaseCollateralValue * (riskManagement.liquidationLtv / 100)
          const debtCapacityInRepaymentValue = Math.max(0, secureDebtLimit - currentDebt)
          const debtCapacityInPrincipal = debtCapacityInRepaymentValue / interestFactor

          // Target is the HIGHER of what's needed vs. what the capacity allows
          targetTotalPrincipal = Math.max(debtCapacityInPrincipal, requiredPrincipalForNeeds)
        } else {
          // MODE: CONSERVATIVE WITHDRAWAL
          // Target is ONLY what is needed for repayments and withdrawal.
          targetTotalPrincipal = requiredPrincipalForNeeds
        }

        // 4. Cap the target principal by what's actually possible with available collateral
        const maxPrincipalFromCollateral =
          (unencumberedBtc * supportPrice * (riskManagement.initialLoanLtv / 100)) / interestFactor
        const actualTotalPrincipalToTake = Math.min(targetTotalPrincipal, maxPrincipalFromCollateral)

        // 5. Chunk the total principal into smaller loans
        let remainingPrincipalToTake = actualTotalPrincipalToTake
        let totalNewLoanPrincipalThisMonth = 0

        while (remainingPrincipalToTake >= MIN_LOAN_AMOUNT) {
          const loanPrincipalForThisChunk = Math.min(remainingPrincipalToTake, MAX_LOAN_AMOUNT)
          const newLoanRepaymentAmount = loanPrincipalForThisChunk * interestFactor
          const btcToLockForThisChunk =
            supportPrice > 0
              ? newLoanRepaymentAmount / (supportPrice * (riskManagement.initialLoanLtv / 100))
              : Number.POSITIVE_INFINITY

          if (unencumberedBtc >= btcToLockForThisChunk) {
            unencumberedBtc -= btcToLockForThisChunk
            const newLoan: Loan = {
              month,
              principal: loanPrincipalForThisChunk,
              maturityMonth: month + currentParams.loanTermMonths,
              repaymentAmount: newLoanRepaymentAmount,
              lockedBtc: btcToLockForThisChunk,
            }
            currentActiveLoans.push(newLoan)
            totalNewLoanPrincipalThisMonth += loanPrincipalForThisChunk
            remainingPrincipalToTake -= loanPrincipalForThisChunk
          } else {
            break // Not enough collateral for the next chunk
          }
        }
        activeLoans = currentActiveLoans

        // 6. Calculate final liquidity, withdrawal, and reinvestment
        const feeAmount = totalNewLoanPrincipalThisMonth * (currentParams.loanOriginationFeePercent / 100)
        const liquidityFromNewLoan = totalNewLoanPrincipalThisMonth - feeAmount
        const liquidityAfterRepayments = Math.max(0, liquidityFromNewLoan - loanRepayments)
        const withdrawalAmount = Math.min(liquidityAfterRepayments, currentParams.monthlyWithdrawalAmount)
        const surplus = liquidityAfterRepayments - withdrawalAmount
        let reinvestmentAmount = 0
        // Reinvestment only happens if the flag is on
        if (currentParams.reinvestmentEnabled && surplus > 0) {
          reinvestmentAmount = surplus
          if (btcPrice > 0) {
            unencumberedBtc += reinvestmentAmount / btcPrice
          }
        }

        // --- END OF NEW LOGIC ---

        // Final calculations for the month's results
        const finalLockedBtc = activeLoans.reduce((sum, l) => sum + l.lockedBtc, 0)
        const finalTotalBtc = unencumberedBtc + finalLockedBtc
        const finalTotalOutstandingDebt = activeLoans.reduce((sum, l) => sum + l.repaymentAmount, 0)
        const finalCollateralValue = finalTotalBtc * btcPrice
        const lockedCollateralValue = finalLockedBtc * btcPrice
        const worstCaseCollateralValueForLimit = (unencumberedBtc + finalLockedBtc) * supportPrice
        const secureDebtLimit = worstCaseCollateralValueForLimit * (riskManagement.liquidationLtv / 100)
        const finalTotalLtv = finalCollateralValue > 0 ? finalTotalOutstandingDebt / finalCollateralValue : 0
        const ltvStatus: "OK" | "Überschritten" = finalTotalOutstandingDebt <= secureDebtLimit ? "OK" : "Überschritten"
        const highestIndividualLtv =
          activeLoans.length > 0
            ? Math.max(...activeLoans.map((l) => (l.repaymentAmount / (l.lockedBtc * btcPrice)) * 100))
            : 0

        tempResults.push({
          month,
          year: currentDate.getFullYear(),
          dateString,
          btcPrice: Math.round(btcPrice),
          collateralValue: Math.round(finalCollateralValue),
          lockedCollateralValue: Math.round(lockedCollateralValue),
          withdrawalAmount: Math.round(withdrawalAmount),
          reinvestmentAmount: Math.round(reinvestmentAmount),
          newLoanAmount: Math.round(totalNewLoanPrincipalThisMonth),
          loanRepayments: Math.round(loanRepayments),
          totalOutstandingDebt: Math.round(finalTotalOutstandingDebt),
          secureDebtLimit: Math.round(secureDebtLimit),
          ltvStatus,
          activeLoans: [...activeLoans],
          isLiquidated: liquidatedBtcThisMonth > 0,
          currentBtcAmount: finalTotalBtc,
          unencumberedBtc: unencumberedBtc,
          lockedBtc: finalLockedBtc,
          liquidatedBtc: liquidatedBtcThisMonth,
          controlledSaleBtc,
          highestIndividualLtv: isFinite(highestIndividualLtv) ? Math.round(highestIndividualLtv) : 0,
          totalLtv: isFinite(finalTotalLtv) ? Math.round(finalTotalLtv * 100) : 0,
        })
      }
      setResults(tempResults)
    } catch (error) {
      console.error("Simulationsfehler:", error)
      setErrors(["Fehler bei der Simulation. Bitte Parameter überprüfen."])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const initializeSimulation = async () => {
      setIsLoading(true)
      setErrors([])
      const fetchedPrice = await loadCurrentBtcPrice()
      if (fetchedPrice !== null) {
        runSimulation(fetchedPrice)
      } else {
        runSimulation()
      }
    }
    initializeSimulation()
  }, [])

  const summary = useMemo(() => {
    if (results.length === 0) return null
    const firstLtvBreach = results.find((r) => r.ltvStatus === "Überschritten")
    const maxDebt = Math.max(...results.map((r) => r.totalOutstandingDebt))
    const firstLiquidation = results.find((r) => r.isLiquidated)
    const finalResult = results[results.length - 1]
    return {
      firstLtvBreachMonth: firstLtvBreach?.month || null,
      firstLiquidationMonth: firstLiquidation?.month || null,
      maxDebt,
      finalBtcPrice: finalResult.btcPrice,
      finalCollateralValue: finalResult.collateralValue,
      finalDebt: finalResult.totalOutstandingDebt,
    }
  }, [results])

  const chartData = useMemo(() => {
    if (!results) return []
    return results.map((r) => ({
      date: r.dateString,
      totalDebt: r.totalOutstandingDebt,
      secureDebtLimit: r.secureDebtLimit,
      btcPrice: r.btcPrice,
      liquidationLevel: r.collateralValue * (params.riskManagement.liquidationLtv / 100),
      collateralValue: r.collateralValue,
      lockedCollateralValue: r.lockedCollateralValue,
    }))
  }, [results, params.riskManagement.liquidationLtv])

  const CustomLegend = ({ payload = [] }: { payload?: any[] }) => {
    if (!payload.length) return null
    return (
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
        {payload.map((entry, index) => (
          <li key={`item-${index}`} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span>{entry.value}</span>
          </li>
        ))}
      </ul>
    )
  }

  const exportToCsv = () => {
    if (results.length === 0) return
    const headers = [
      "Monat",
      "Datum",
      "BTC-Preis (€)",
      "Collateral-Wert (€)",
      "Gesperrtes Collateral (€)",
      "Gesamt-LTV (%)",
      "Entnahme (€)",
      "Reinvestition (€)",
      "Neuer Kredit (€)",
      "Rückzahlungen (€)",
      "Gesamtschuld (€)",
      "Sichere Kreditgrenze (€)",
      "Höchster Einzel-LTV (%)",
      "BTC-Menge (Total)",
      "BTC (Frei)",
      "BTC (Gesperrt)",
      "BTC (Liquidiert)",
      "BTC (Verkauft)",
    ]
    const csvContent = [
      headers.join(","),
      ...results.map((r) =>
        [
          r.month,
          r.dateString,
          r.btcPrice,
          r.collateralValue,
          r.lockedCollateralValue,
          r.totalLtv,
          r.withdrawalAmount,
          r.reinvestmentAmount,
          r.newLoanAmount,
          r.loanRepayments,
          r.totalOutstandingDebt,
          r.secureDebtLimit,
          r.highestIndividualLtv,
          r.currentBtcAmount.toFixed(6),
          r.unencumberedBtc.toFixed(6),
          r.lockedBtc.toFixed(6),
          r.liquidatedBtc.toFixed(6),
          r.controlledSaleBtc.toFixed(6),
        ].join(","),
      ),
    ].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "bitcoin-credit-simulation.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetParams = () => {
    setParams(DEFAULT_PARAMS)
    setResults([])
    setErrors([])
    runSimulation()
  }

  useEffect(() => {
    if (params.priceModel === "manual") {
      const requiredYears = Math.ceil(params.simulationMonths / 12)
      if (params.annualGrowthRates.length !== requiredYears) {
        const newRates = Array(requiredYears)
          .fill(0)
          .map((_, i) => params.annualGrowthRates[i] || 20)
        setParams((prev) => ({ ...prev, annualGrowthRates: newRates }))
      }
    }
  }, [params.simulationMonths, params.priceModel])

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex-1"></div>
          <div className="flex-1 text-center">
            <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-2">
              <Bitcoin className="w-8 h-8 text-orange-500" />
              Bitcoin Bullet-Kredit Simulator
            </h1>
            <p className="text-muted-foreground">
              Simulation rollierender endfälliger Kredite mit Bitcoin als Sicherheit
            </p>
          </div>
          <div className="flex-1 flex justify-end">
            <ModeToggle />
          </div>
        </div>

        <Tabs defaultValue="parameters" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="parameters">Parameter</TabsTrigger>
            <TabsTrigger value="results">Ergebnisse</TabsTrigger>
            <TabsTrigger value="chart">Diagramm</TabsTrigger>
            <TabsTrigger value="how-it-works">So funktioniert's</TabsTrigger>
          </TabsList>

          <TabsContent value="parameters" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Grundparameter</CardTitle>
                  <CardDescription>Bitcoin und Kredit-Grundeinstellungen</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="btcAmount" className="flex items-center gap-1">
                        BTC-Menge
                        <ShadcnTooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Die anfängliche Menge an Bitcoin, die als Sicherheit für die Kredite hinterlegt wird.</p>
                          </TooltipContent>
                        </ShadcnTooltip>
                      </Label>
                      <Input
                        id="btcAmount"
                        type="number"
                        value={params.btcAmount}
                        onChange={(e) => setParams((prev) => ({ ...prev, btcAmount: Number(e.target.value) }))}
                        min="0"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="initialBtcPrice" className="flex items-center gap-1">
                        Initialer BTC-Preis (€)
                        <ShadcnTooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>
                              Der Startpreis von Bitcoin in Euro für die Simulation. Kann automatisch abgerufen werden.
                            </p>
                          </TooltipContent>
                        </ShadcnTooltip>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="initialBtcPrice"
                          type="number"
                          value={params.initialBtcPrice}
                          onChange={(e) => setParams((prev) => ({ ...prev, initialBtcPrice: Number(e.target.value) }))}
                          min="0"
                        />
                        <Button variant="outline" size="sm" onClick={loadCurrentBtcPrice} disabled={loadingBtcPrice}>
                          {loadingBtcPrice ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="loanTermMonths" className="flex items-center gap-1">
                        Kreditlaufzeit (Monate)
                        <ShadcnTooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Die Laufzeit jedes einzelnen Bullet-Kredits in Monaten.</p>
                          </TooltipContent>
                        </ShadcnTooltip>
                      </Label>
                      <Input
                        id="loanTermMonths"
                        type="number"
                        value={params.loanTermMonths}
                        onChange={(e) => setParams((prev) => ({ ...prev, loanTermMonths: Number(e.target.value) }))}
                        min="1"
                        max="120"
                      />
                    </div>
                    <div>
                      <Label htmlFor="simulationMonths" className="flex items-center gap-1">
                        Simulationsdauer (Monate)
                        <ShadcnTooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Die Gesamtdauer der Simulation in Monaten.</p>
                          </TooltipContent>
                        </ShadcnTooltip>
                      </Label>
                      <Input
                        id="simulationMonths"
                        type="number"
                        value={params.simulationMonths}
                        onChange={(e) => setParams((prev) => ({ ...prev, simulationMonths: Number(e.target.value) }))}
                        min="1"
                        max="240"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="annualInterestRate" className="flex items-center gap-1">
                        Zinssatz p.a. (%)
                        <ShadcnTooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Der jährliche Zinssatz für die aufgenommenen Bullet-Kredite.</p>
                          </TooltipContent>
                        </ShadcnTooltip>
                      </Label>
                      <Input
                        id="annualInterestRate"
                        type="number"
                        value={params.annualInterestRate}
                        onChange={(e) => setParams((prev) => ({ ...prev, annualInterestRate: Number(e.target.value) }))}
                        min="0"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="loanOriginationFeePercent" className="flex items-center gap-1">
                        Kreditgebühr (%)
                        <ShadcnTooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Die prozentuale Gebühr, die bei jeder Kreditaufnahme anfällt (z.B. 1.5% bei Fidor).</p>
                          </TooltipContent>
                        </ShadcnTooltip>
                      </Label>
                      <Input
                        id="loanOriginationFeePercent"
                        type="number"
                        value={params.loanOriginationFeePercent}
                        onChange={(e) =>
                          setParams((prev) => ({ ...prev, loanOriginationFeePercent: Number(e.target.value) }))
                        }
                        min="0"
                        step="0.1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Strategie: Sichere Akkumulation & Entnahme</CardTitle>
                  <CardDescription>
                    Maximaler Kredit basierend auf Worst-Case-Szenario (Power-Law Support).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="monthlyWithdrawalAmount" className="flex items-center gap-1">
                      Monatlicher Entnahmebetrag (€)
                      <ShadcnTooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            Der Betrag, der monatlich als Liquidität für Lebenshaltungskosten entnommen werden soll. Die
                            Strategie versucht, diesen Betrag sicher zur Verfügung zu stellen.
                          </p>
                        </TooltipContent>
                      </ShadcnTooltip>
                    </Label>
                    <Input
                      id="monthlyWithdrawalAmount"
                      type="number"
                      value={params.monthlyWithdrawalAmount}
                      onChange={(e) =>
                        setParams((prev) => ({ ...prev, monthlyWithdrawalAmount: Number(e.target.value) }))
                      }
                      min="0"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <Checkbox
                      id="reinvestmentEnabled"
                      checked={params.reinvestmentEnabled}
                      onCheckedChange={(checked) =>
                        setParams((prev) => ({ ...prev, reinvestmentEnabled: Boolean(checked) }))
                      }
                    />
                    <Label htmlFor="reinvestmentEnabled" className="flex items-center gap-1">
                      Überschuss reinvestieren
                      <ShadcnTooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            Wenn aktiviert, wird die gesamte Liquidität, die nach Abzug der Kredittilgungen und Ihrer
                            Entnahme übrig bleibt, automatisch in mehr Bitcoin reinvestiert, um das Collateral zu
                            erhöhen.
                          </p>
                        </TooltipContent>
                      </ShadcnTooltip>
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Risikomanagement & Aggressivität</CardTitle>
                <CardDescription>
                  Definieren Sie Ihre persönlichen Risikogrenzen und die Kreditauslastung.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="initialLoanLtv" className="flex items-center gap-1">
                    Anfangs-LTV neuer Kredite (%)
                    <ShadcnTooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Bestimmt, wie viel Collateral für einen neuen Kredit gesperrt wird. Ein höherer Wert bedeutet
                        mehr Kredit pro BTC, aber auch höheres Anfangsrisiko.
                      </TooltipContent>
                    </ShadcnTooltip>
                  </Label>
                  <Input
                    id="initialLoanLtv"
                    type="number"
                    value={params.riskManagement.initialLoanLtv}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        riskManagement: { ...p.riskManagement, initialLoanLtv: Number(e.target.value) },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="warningLtv" className="flex items-center gap-1">
                    Warngrenze Gesamt-LTV (%)
                    <ShadcnTooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Wenn der Gesamt-LTV diesen Wert überschreitet, wird dies in den Ergebnissen markiert. Ihre
                        Komfortzone.
                      </TooltipContent>
                    </ShadcnTooltip>
                  </Label>
                  <Input
                    id="warningLtv"
                    type="number"
                    value={params.riskManagement.warningLtv}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        riskManagement: { ...p.riskManagement, warningLtv: Number(e.target.value) },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="deleveragingLtv" className="flex items-center gap-1">
                    Verkaufsgrenze Gesamt-LTV (%)
                    <ShadcnTooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Wenn der Gesamt-LTV diesen Wert überschreitet, wird proaktiv freies BTC verkauft, um den LTV
                        wieder auf die Warngrenze zu senken.
                      </TooltipContent>
                    </ShadcnTooltip>
                  </Label>
                  <Input
                    id="deleveragingLtv"
                    type="number"
                    value={params.riskManagement.deleveragingLtv}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        riskManagement: { ...p.riskManagement, deleveragingLtv: Number(e.target.value) },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="liquidationLtv" className="flex items-center gap-1">
                    Persönl. Liquidationsgrenze (%)
                    <ShadcnTooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Ihre persönliche "rote Linie". Wenn der LTV eines EINZELNEN Kredits diesen Wert erreicht, wird
                        dessen Collateral als liquidiert betrachtet.
                      </TooltipContent>
                    </ShadcnTooltip>
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
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Preismodell</CardTitle>
                <CardDescription>
                  Wähle das Modell für die Bitcoin-Preisprognose und die Sicherheitsberechnung.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div className="md:col-span-1">
                    <Label htmlFor="priceModel">Modell auswählen</Label>
                    <Select
                      value={params.priceModel}
                      onValueChange={(value: PriceModel) => setParams((p) => ({ ...p, priceModel: value }))}
                    >
                      <SelectTrigger id="priceModel">
                        <SelectValue placeholder="Modell wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manuelle Wachstumsraten</SelectItem>
                        <SelectItem value="powerLaw">Power Law Modell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {params.priceModel === "powerLaw" && (
                    <div className="md:col-span-2 grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="prognosisLine" className="flex items-center gap-1">
                          Prognose-Linie (Preis)
                          <ShadcnTooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3" />
                            </TooltipTrigger>
                            <TooltipContent>Der BTC-Preis in der Simulation wird dieser Linie folgen.</TooltipContent>
                          </ShadcnTooltip>
                        </Label>
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
                            <SelectValue placeholder="Linie wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fit">Fit (Grün)</SelectItem>
                            <SelectItem value="support">Support (Rot)</SelectItem>
                            <SelectItem value="resistance">Resistance (Lila)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="liquidationLine" className="flex items-center gap-1">
                          Sicherheits-Linie (Kredit)
                          <ShadcnTooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Die "Sichere Kreditgrenze" wird IMMER basierend auf dieser Linie (Worst-Case) berechnet.
                            </TooltipContent>
                          </ShadcnTooltip>
                        </Label>
                        <Select
                          value={params.powerLawSettings.liquidationLine}
                          onValueChange={(value: PowerLawLine) =>
                            setParams((p) => ({
                              ...p,
                              powerLawSettings: { ...p.powerLawSettings, liquidationLine: value },
                            }))
                          }
                        >
                          <SelectTrigger id="liquidationLine">
                            <SelectValue placeholder="Linie wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="support">Support (Rot)</SelectItem>
                            <SelectItem value="fit">Fit (Grün)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
                {params.priceModel === "powerLaw" && (
                  <div className="mt-4">
                    <PriceModelChart simulationMonths={params.simulationMonths} />
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-4">
              <Button onClick={() => runSimulation()} disabled={isLoading} className="flex items-center gap-2">
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                {isLoading ? "Berechne..." : "Simulation starten"}
              </Button>
              <Button variant="outline" onClick={resetParams}>
                Parameter zurücksetzen
              </Button>
              {results.length > 0 && (
                <Button variant="outline" onClick={exportToCsv} className="flex items-center gap-2 bg-transparent">
                  <Download className="w-4 h-4" />
                  CSV Export
                </Button>
              )}
            </div>

            {params.priceModel === "manual" && (
              <Card>
                <CardHeader>
                  <CardTitle>Einstellungen für manuelles Modell</CardTitle>
                  <CardDescription>
                    Definieren Sie die jährlichen Wachstumsraten und einen Sicherheitsabschlag für die Kreditgrenze.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="manualSafetyDiscount" className="flex items-center gap-1">
                      Sicherheitsabschlag (%)
                      <ShadcnTooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            Der prozentuale Abschlag vom prognostizierten Preis, um den "Support-Preis" für die sichere
                            Kreditgrenze zu berechnen. Ein Wert von 50% bedeutet, dass der angenommene Worst-Case-Preis
                            50% unter dem prognostizierten Preis liegt.
                          </p>
                        </TooltipContent>
                      </ShadcnTooltip>
                    </Label>
                    <Input
                      id="manualSafetyDiscount"
                      type="number"
                      value={params.manualModeSafetyDiscount}
                      onChange={(e) =>
                        setParams((prev) => ({ ...prev, manualModeSafetyDiscount: Number(e.target.value) }))
                      }
                      min="0"
                      max="99"
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {params.annualGrowthRates.map((rate, index) => (
                      <div key={index}>
                        <Label htmlFor={`growth-${index}`} className="flex items-center gap-1">
                          Jahr {index + 1} (%)
                          <ShadcnTooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>
                                Die erwartete jährliche Wachstumsrate des Bitcoin-Preises für dieses spezifische Jahr.
                              </p>
                            </TooltipContent>
                          </ShadcnTooltip>
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
                          step="0.1"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
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
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Erste Liquidation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {summary.firstLiquidationMonth ? `Monat ${summary.firstLiquidationMonth}` : "Keine"}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Maximale Verschuldung</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.maxDebt.toLocaleString("de-DE")} €</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-medium text-sm">Finaler Collateral-Wert</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.finalCollateralValue.toLocaleString("de-DE")} €</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-medium text-sm">Finales Nettovermögen</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(summary.finalCollateralValue - summary.finalDebt).toLocaleString("de-DE")} €
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {results.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Monatliche Ergebnisse</CardTitle>
                  <CardDescription>Detaillierte Aufschlüsselung der Simulation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <div className="max-h-[60vh] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b sticky top-0 bg-background z-10">
                            <th className="text-left p-2">Monat</th>
                            <th className="text-left p-2">Datum</th>
                            <th className="text-right p-2">BTC-Preis (€)</th>
                            <th className="text-right p-2">Collateral (€)</th>
                            <th className="text-right p-2">Gesperrtes Collateral (€)</th>
                            <th className="text-right p-2">Entnahme (€)</th>
                            <th className="text-right p-2">Reinvestition (€)</th>
                            <th className="text-right p-2">Neuer Kredit (€)</th>
                            <th className="text-right p-2">Rückzahlungen (€)</th>
                            <th className="text-right p-2">Gesamtschuld (€)</th>
                            <th className="text-right p-2">Sichere Kreditgrenze (€)</th>
                            <th className="text-center p-2">Höchster LTV (%)</th>
                            <th className="text-right p-2">BTC-Menge</th>
                            <th className="text-right p-2">Liquidiert (BTC)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentResults.map((result) => (
                            <tr
                              key={result.month}
                              className={`border-b hover:bg-muted/50 ${result.isLiquidated ? "bg-red-900/20" : ""}`}
                            >
                              <td className="p-2">{result.month}</td>
                              <td className="p-2">{result.dateString}</td>
                              <td className="p-2 text-right">{result.btcPrice.toLocaleString("de-DE")}</td>
                              <td className="p-2 text-right">{result.collateralValue.toLocaleString("de-DE")}</td>
                              <td className="p-2 text-right">{result.lockedCollateralValue.toLocaleString("de-DE")}</td>
                              <td className="p-2 text-right">{result.withdrawalAmount.toLocaleString("de-DE")}</td>
                              <td className="p-2 text-right">{result.reinvestmentAmount.toLocaleString("de-DE")}</td>
                              <td className="p-2 text-right">{result.newLoanAmount.toLocaleString("de-DE")}</td>
                              <td className="p-2 text-right">{result.loanRepayments.toLocaleString("de-DE")}</td>
                              <td className="p-2 text-right">{result.totalOutstandingDebt.toLocaleString("de-DE")}</td>
                              <td className="p-2 text-right">{result.secureDebtLimit.toLocaleString("de-DE")}</td>
                              <td className="p-2 text-center">
                                <span
                                  className={
                                    result.highestIndividualLtv >= params.riskManagement.liquidationLtv
                                      ? "text-red-600 font-bold"
                                      : result.highestIndividualLtv >= params.riskManagement.warningLtv
                                        ? "text-yellow-600"
                                        : ""
                                  }
                                >
                                  {result.highestIndividualLtv}%
                                </span>
                              </td>
                              <td className="p-2 text-right">{result.currentBtcAmount.toFixed(6)}</td>
                              <td
                                className={`p-2 text-right ${result.liquidatedBtc > 0 ? "text-red-500 font-bold" : ""}`}
                              >
                                {result.liquidatedBtc > 0 ? result.liquidatedBtc.toFixed(6) : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {results.length > itemsPerPage && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Zeige {startIndex + 1} bis {Math.min(endIndex, results.length)} von {results.length} Monaten
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          Zurück
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum
                            if (totalPages <= 5) {
                              pageNum = i + 1
                            } else if (currentPage <= 3) {
                              pageNum = i + 1
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i
                            } else {
                              pageNum = currentPage - 2 + i
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className="w-8 h-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                        >
                          Weiter
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
                  <CardTitle>Verschuldung vs. Collateral</CardTitle>
                  <CardDescription>
                    Vergleich von Schulden, Sicherheiten und Risikogrenzen im Zeitverlauf.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" minTickGap={30} />
                        <YAxis
                          label={{ value: "Betrag (€)", angle: -90, position: "insideLeft" }}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => [`${value.toLocaleString("de-DE")} €`, name]}
                          labelFormatter={(date) => `Datum: ${date}`}
                        />
                        {lineVisibility.collateralValue && (
                          <Line
                            type="monotone"
                            dataKey="collateralValue"
                            stroke={lineConfig.collateralValue.color}
                            strokeWidth={2}
                            name={lineConfig.collateralValue.name}
                            dot={false}
                          />
                        )}
                        {lineVisibility.lockedCollateralValue && (
                          <Line
                            type="monotone"
                            dataKey="lockedCollateralValue"
                            stroke={lineConfig.lockedCollateralValue.color}
                            strokeWidth={2}
                            name={lineConfig.lockedCollateralValue.name}
                            dot={false}
                          />
                        )}
                        {lineVisibility.totalDebt && (
                          <Line
                            type="monotone"
                            dataKey="totalDebt"
                            stroke={lineConfig.totalDebt.color}
                            strokeWidth={2.5}
                            name={lineConfig.totalDebt.name}
                            dot={false}
                          />
                        )}
                        {lineVisibility.secureDebtLimit && (
                          <Line
                            type="monotone"
                            dataKey="secureDebtLimit"
                            stroke={lineConfig.secureDebtLimit.color}
                            strokeWidth={2.5}
                            name={lineConfig.secureDebtLimit.name}
                            dot={false}
                          />
                        )}
                        {lineVisibility.liquidationLevel && (
                          <Line
                            type="monotone"
                            dataKey="liquidationLevel"
                            stroke={lineConfig.liquidationLevel.color}
                            strokeWidth={2}
                            name={lineConfig.liquidationLevel.name}
                            dot={false}
                            strokeDasharray="5 5"
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 mt-4 pt-4 border-t">
                    {Object.entries(lineConfig).map(([key, { name, color }]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`toggle-${key}`}
                          checked={lineVisibility[key as keyof typeof lineVisibility]}
                          onCheckedChange={() => handleLineVisibilityChange(key as keyof typeof lineVisibility)}
                        />
                        <label
                          htmlFor={`toggle-${key}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center cursor-pointer"
                        >
                          <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }}></span>
                          {name}
                        </label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {chartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Bitcoin-Preisentwicklung</CardTitle>
                  <CardDescription>BTC-Preis über die Simulationsdauer</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" minTickGap={30} />
                        <YAxis
                          label={{ value: "BTC-Preis (€)", angle: -90, position: "insideLeft" }}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          formatter={(value: number) => [`${value.toLocaleString("de-DE")} €`, "BTC-Preis"]}
                          labelFormatter={(date) => `Datum: ${date}`}
                        />
                        <Line type="monotone" dataKey="btcPrice" stroke="#f59e0b" strokeWidth={2} dot={false} />
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
                <CardTitle>So funktioniert's: Die Sichere Akkumulations- & Entnahmestrategie</CardTitle>
                <CardDescription>
                  Diese Strategie zielt darauf ab, Ihr Bitcoin-Collateral maximal und sicher zu nutzen, um Liquidität zu
                  generieren und gleichzeitig Ihr Vermögen zu mehren.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-base">
                <h3 className="text-lg font-semibold">Das Kernprinzip: Isolierte Kredite & Collateral-Management</h3>
                <p>
                  Im Gegensatz zu Plattformen, die Ihr gesamtes Bitcoin-Vermögen als eine einzige Sicherheitspool
                  betrachten, simuliert dieses Tool ein Modell, bei dem **jeder Kredit einzeln durch einen spezifischen
                  Betrag Bitcoin besichert ist**. Das bedeutet:
                </p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>
                    Ihr gesamtes Bitcoin-Vermögen wird in **"freies" (unverpfändetes) BTC** und **"gesperrtes"
                    (verpfändetes) BTC** unterteilt.
                  </li>
                  <li>
                    Jeder neue Kredit, den Sie aufnehmen, erfordert, dass ein entsprechender Betrag Ihres **freien BTC**
                    als Sicherheit für diesen spezifischen Kredit gesperrt wird.
                  </li>
                  <li>
                    Eine Liquidation betrifft nur den **einzelnen Kredit**, dessen LTV (Loan-to-Value) die kritische
                    Grenze überschreitet. Das Collateral der anderen Kredite bleibt unberührt.
                  </li>
                </ul>

                <h3 className="text-lg font-semibold mt-4">Die "Sichere Kreditgrenze" als Strategie-Ziel</h3>
                <p>
                  Der Simulator berechnet Ihre **"Sichere Kreditgrenze"** basierend auf einem angenommenen
                  "Support-Preis" (Worst-Case-Szenario). Diese Grenze ist Ihre **operative Zielgröße** für die
                  Kreditaufnahme im Normalbetrieb.
                </p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>
                    <strong>Beim Power-Law-Modell:</strong> Der Support-Preis entspricht dem Wert der von Ihnen
                    ausgewählten unteren "Liquidations-Linie" (typischerweise die rote Support-Linie).
                  </li>
                  <li>
                    <strong>Beim manuellen Modell:</strong> Der Support-Preis wird berechnet, indem vom prognostizierten
                    Preis ein von Ihnen definierter "Sicherheitsabschlag" abgezogen wird.
                  </li>
                </ul>
                <p className="mt-2">
                  Die Formel lautet dann:
                  <br />
                  <code>Sichere Kreditgrenze = (Aktueller BTC-Bestand * Support-Preis) * 0.95</code>
                  <br />
                  Diese Grenze ist die Obergrenze für Ihre Gesamtverschuldung, die Sie im Rahmen Ihrer strategischen
                  Planung nicht überschreiten möchten.
                </p>

                <h3 className="text-lg font-semibold mt-4">Kreditaufnahme & Liquiditätsfluss</h3>
                <p>
                  In jedem Monat der Simulation wird versucht, den maximal möglichen neuen Kredit aufzunehmen, um den
                  sicheren Kreditrahmen voll auszuschöpfen. Die durch diesen neuen Kredit generierte Liquidität wird
                  dann nach folgenden Prioritäten verteilt:
                </p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    <strong>Fällige Rückzahlungen:</strong> Zuerst werden alle in diesem Monat fällig werdenden
                    Kreditrückzahlungen bedient. Dies ist eine Umschuldung, um die Strategie am Laufen zu halten.
                    **Wichtig:** Um einen fälligen Kredit abzulösen, muss ein neuer Kredit mit **freiem BTC** besichert
                    werden. Erst nach erfolgreicher Ablösung wird das Collateral des alten Kredits wieder freigegeben.
                  </li>
                  <li>
                    <strong>Monatlicher Entnahmebetrag:</strong> Danach wird der von Ihnen definierte monatliche
                    Entnahmebetrag ausgezahlt. Dies ist Ihr "Gehalt" aus dem Collateral.
                  </li>
                  <li>
                    <strong>Überschuss reinvestieren:</strong> Alles, was nach Abzug der Rückzahlungen und Ihrer
                    Entnahme vom neuen Kredit noch übrig ist, wird als "Überschuss" betrachtet. Wenn die Option
                    "Überschuss reinvestieren" aktiviert ist, wird dieser Betrag sofort genutzt, um weitere Bitcoin zu
                    kaufen und somit Ihr **freies BTC-Collateral** zu erhöhen.
                  </li>
                </ol>
                <p className="mt-2">
                  **Notfall-Kreditaufnahme:** Sollte in einem fallenden Markt die "Sichere Kreditgrenze" nicht
                  ausreichen, um fällige Rückzahlungen zu decken, wird die Kreditaufnahme nicht begrenzt, solange noch
                  genügend **freies BTC** vorhanden ist, um den benötigten Not-Kredit zu besichern. Dies ermöglicht es,
                  kurzfristige Liquiditätsengpässe zu überbrücken, auch wenn die strategische Grenze überschritten wird.
                </p>

                <h3 className="text-lg font-semibold mt-4">Vorteile dieser Strategie</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li>
                    <strong>Granulares Risikomanagement:</strong> Durch die isolierte Besicherung ist das Risiko auf
                    einzelne Kredite begrenzt. Ein Problem bei einem Kredit gefährdet nicht Ihr gesamtes Portfolio.
                  </li>
                  <li>
                    <strong>Praxisnähe:</strong> Sie können einen stabilen, monatlichen Cashflow generieren, der sich
                    dynamisch an die Möglichkeiten Ihres Collaterals anpasst.
                  </li>
                  <li>
                    <strong>Automatischer Vermögensaufbau:</strong> Der Überschuss wird automatisch reinvestiert,
                    wodurch Ihr Bitcoin-Bestand und somit Ihr Nettovermögen über die Zeit wachsen kann.
                  </li>
                  <li>
                    <strong>Realistische Liquidationsabbildung:</strong> Die Simulation zeigt genau, wann und welche
                    Teile Ihres Collaterals bei einem Preisverfall liquidiert werden würden.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}
