"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Download, RefreshCw, AlertTriangle, TrendingUp, Bitcoin } from "lucide-react"

// Types
interface SimulationParams {
  btcAmount: number
  initialBtcPrice: number
  ltv: number
  annualInterestRate: number
  loanTermMonths: number
  initialMonthlyNeed: number
  annualNeedIncrease: number
  simulationMonths: number
  annualGrowthRates: number[]
}

interface Loan {
  month: number
  principal: number
  maturityMonth: number
  repaymentAmount: number
}

interface MonthlyResult {
  month: number
  year: number
  btcPrice: number
  collateralValue: number
  monthlyNeed: number
  newLoanAmount: number
  loanRepayments: number
  totalOutstandingDebt: number
  allowedLtv: number
  ltvStatus: "OK" | "Überschritten"
  activeLoans: Loan[]
  ltvBreachPercentage: number
  liquidationLevel: number
  liquidationRiskPercentage: number
  isLiquidated: boolean
}

const DEFAULT_PARAMS: SimulationParams = {
  btcAmount: 1,
  initialBtcPrice: 160000,
  ltv: 50,
  annualInterestRate: 6.5,
  loanTermMonths: 6,
  initialMonthlyNeed: 2500, // Changed from 5000 to 2500
  annualNeedIncrease: 5,
  simulationMonths: 120,
  annualGrowthRates: Array(10).fill(20),
}

export default function BitcoinBulletCreditSimulator() {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS)
  const [results, setResults] = useState<MonthlyResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [loadingBtcPrice, setLoadingBtcPrice] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 125
  const totalPages = Math.ceil(params.simulationMonths / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentResults = results.slice(startIndex, endIndex)

  // Validation
  const validateParams = (p: SimulationParams): string[] => {
    const errors: string[] = []

    if (p.btcAmount <= 0) errors.push("BTC-Menge muss positiv sein")
    if (p.initialBtcPrice <= 0) errors.push("BTC-Preis muss positiv sein")
    if (p.ltv <= 0 || p.ltv > 100) errors.push("LTV muss zwischen 0 und 100% liegen")
    if (p.annualInterestRate < 0) errors.push("Zinssatz darf nicht negativ sein")
    if (p.loanTermMonths <= 0 || p.loanTermMonths > 120)
      errors.push("Kreditlaufzeit muss zwischen 1 und 120 Monaten liegen")
    if (p.initialMonthlyNeed <= 0) errors.push("Monatlicher Bedarf muss positiv sein")
    if (p.simulationMonths <= 0 || p.simulationMonths > 240)
      errors.push("Simulationsdauer muss zwischen 1 und 240 Monaten liegen")

    const requiredYears = Math.ceil(p.simulationMonths / 12)
    if (p.annualGrowthRates.length < requiredYears) {
      errors.push(`Benötigt ${requiredYears} Wachstumsraten für ${p.simulationMonths} Monate`)
    }

    return errors
  }

  // Load current BTC price
  const loadCurrentBtcPrice = async () => {
    setLoadingBtcPrice(true)
    try {
      const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur")
      const data = await response.json()
      const currentPrice = data.bitcoin?.eur

      if (currentPrice) {
        setParams((prev) => ({ ...prev, initialBtcPrice: Math.round(currentPrice) }))
      } else {
        throw new Error("Preis nicht verfügbar")
      }
    } catch (error) {
      console.error("Fehler beim Laden des BTC-Preises:", error)
      alert("Fehler beim Laden des aktuellen BTC-Preises. Bitte manuell eingeben.")
    } finally {
      setLoadingBtcPrice(false)
    }
  }

  // Calculate bullet loan repayment amount
  const calculateRepaymentAmount = (principal: number, annualRate: number, termMonths: number): number => {
    return principal * (1 + (annualRate / 100) * (termMonths / 12))
  }

  // Main simulation calculation
  const runSimulation = () => {
    const validationErrors = validateParams(params)
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors([])
    setIsLoading(true)

    try {
      const results: MonthlyResult[] = []
      const activeLoans: Loan[] = []

      for (let month = 1; month <= params.simulationMonths; month++) {
        // Calculate BTC price with compound growth
        const year = Math.floor((month - 1) / 12) + 1
        const yearIndex = Math.min(year - 1, params.annualGrowthRates.length - 1)
        const annualGrowthRate = params.annualGrowthRates[yearIndex] / 100

        // Monthly growth rate for compound interest within the year
        const monthlyGrowthRate = Math.pow(1 + annualGrowthRate, 1 / 12) - 1

        // Calculate BTC price: each month builds on the previous month's value
        const btcPrice = month === 1 ? params.initialBtcPrice : results[month - 2].btcPrice * (1 + monthlyGrowthRate)

        // Calculate collateral value
        const collateralValue = params.btcAmount * btcPrice

        // Calculate monthly need (increases annually)
        const yearsElapsed = Math.floor((month - 1) / 12)
        const monthlyNeed = params.initialMonthlyNeed * Math.pow(1 + params.annualNeedIncrease / 100, yearsElapsed)

        // Check for maturing loans and calculate repayments
        const maturingLoans = activeLoans.filter((loan) => loan.maturityMonth === month)
        const loanRepayments = maturingLoans.reduce((sum, loan) => sum + loan.repaymentAmount, 0)

        // Remove matured loans from active loans
        maturingLoans.forEach((loan) => {
          const index = activeLoans.indexOf(loan)
          if (index > -1) activeLoans.splice(index, 1)
        })

        // Calculate new loan amount (monthly need + loan repayments)
        const newLoanAmount = monthlyNeed + loanRepayments

        // Create new loan if amount > 0
        if (newLoanAmount > 0) {
          const newLoan: Loan = {
            month,
            principal: newLoanAmount,
            maturityMonth: month + params.loanTermMonths,
            repaymentAmount: calculateRepaymentAmount(newLoanAmount, params.annualInterestRate, params.loanTermMonths),
          }
          activeLoans.push(newLoan)
        }

        // Calculate total outstanding debt
        const totalOutstandingDebt = activeLoans.reduce((sum, loan) => sum + loan.repaymentAmount, 0)

        // Calculate allowed LTV and check compliance
        const allowedLtv = (params.ltv / 100) * collateralValue
        const ltvStatus: "OK" | "Überschritten" = totalOutstandingDebt <= allowedLtv ? "OK" : "Überschritten"

        // Calculate liquidation level (95% of collateral value)
        const liquidationLevel = collateralValue * 0.95
        const isLiquidated = totalOutstandingDebt >= liquidationLevel

        // Calculate LTV breach percentage
        const ltvBreachPercentage =
          totalOutstandingDebt > allowedLtv ? Math.round((totalOutstandingDebt / allowedLtv - 1) * 100) : 0

        // Calculate liquidation risk percentage
        const liquidationRiskPercentage = Math.round((totalOutstandingDebt / liquidationLevel) * 100)

        results.push({
          month,
          year,
          btcPrice: Math.round(btcPrice),
          collateralValue: Math.round(collateralValue),
          monthlyNeed: Math.round(monthlyNeed),
          newLoanAmount: Math.round(newLoanAmount),
          loanRepayments: Math.round(loanRepayments),
          totalOutstandingDebt: Math.round(totalOutstandingDebt),
          allowedLtv: Math.round(allowedLtv),
          ltvStatus,
          activeLoans: [...activeLoans],
          ltvBreachPercentage,
          liquidationLevel: Math.round(liquidationLevel),
          liquidationRiskPercentage,
          isLiquidated,
        })
      }

      setResults(results)
    } catch (error) {
      console.error("Simulationsfehler:", error)
      setErrors(["Fehler bei der Simulation. Bitte Parameter überprüfen."])
    } finally {
      setIsLoading(false)
    }
  }

  // Summary statistics
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

  // Chart data
  const chartData = results.map((r) => ({
    month: r.month,
    totalDebt: r.totalOutstandingDebt,
    allowedLtv: r.allowedLtv,
    btcPrice: r.btcPrice,
    monthlyNeed: r.monthlyNeed,
    liquidationLevel: r.collateralValue * 0.95,
    breach: r.ltvStatus === "Überschritten",
    ltvBreachPercentage: r.ltvBreachPercentage,
  }))

  // Export to CSV
  const exportToCsv = () => {
    if (results.length === 0) return

    const headers = [
      "Monat",
      "Jahr",
      "BTC-Preis (€)",
      "Collateral-Wert (€)",
      "Monatlicher Bedarf (€)",
      "Neuer Kredit (€)",
      "Rückzahlungen (€)",
      "Gesamtschuld (€)",
      "Erlaubtes LTV (€)",
      "LTV-Status",
      "LTV Breach (%)",
      "Liquidation (%)",
    ]

    const csvContent = [
      headers.join(","),
      ...results.map((r) =>
        [
          r.month,
          r.year,
          r.btcPrice,
          r.collateralValue,
          r.monthlyNeed,
          r.newLoanAmount,
          r.loanRepayments,
          r.totalOutstandingDebt,
          r.allowedLtv,
          r.ltvStatus,
          r.ltvBreachPercentage > 0 ? `${r.ltvBreachPercentage}%` : "-",
          `${r.liquidationRiskPercentage}%`,
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

  // Reset parameters
  const resetParams = () => {
    setParams(DEFAULT_PARAMS)
    setResults([])
    setErrors([])
  }

  // Update growth rates based on simulation duration
  useEffect(() => {
    const requiredYears = Math.ceil(params.simulationMonths / 12)
    if (params.annualGrowthRates.length !== requiredYears) {
      const newRates = Array(requiredYears)
        .fill(0)
        .map((_, i) => params.annualGrowthRates[i] || 20)
      setParams((prev) => ({ ...prev, annualGrowthRates: newRates }))
    }
  }, [params.simulationMonths])

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-2">
          <Bitcoin className="w-8 h-8 text-orange-500" />
          Bitcoin Bullet-Kredit Simulator
        </h1>
        <p className="text-muted-foreground">Simulation rollierender endfälliger Kredite mit Bitcoin als Sicherheit</p>
      </div>

      <Tabs defaultValue="parameters" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="parameters">Parameter</TabsTrigger>
          <TabsTrigger value="results">Ergebnisse</TabsTrigger>
          <TabsTrigger value="chart">Diagramm</TabsTrigger>
        </TabsList>

        <TabsContent value="parameters" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Parameters */}
            <Card>
              <CardHeader>
                <CardTitle>Grundparameter</CardTitle>
                <CardDescription>Bitcoin und Kredit-Grundeinstellungen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="btcAmount">BTC-Menge</Label>
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
                    <Label htmlFor="initialBtcPrice">Initialer BTC-Preis (€)</Label>
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
                    <Label htmlFor="ltv">LTV (%)</Label>
                    <Input
                      id="ltv"
                      type="number"
                      value={params.ltv}
                      onChange={(e) => setParams((prev) => ({ ...prev, ltv: Number(e.target.value) }))}
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <Label htmlFor="annualInterestRate">Zinssatz p.a. (%)</Label>
                    <Input
                      id="annualInterestRate"
                      type="number"
                      value={params.annualInterestRate}
                      onChange={(e) => setParams((prev) => ({ ...prev, annualInterestRate: Number(e.target.value) }))}
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="loanTermMonths">Kreditlaufzeit (Monate)</Label>
                  <Input
                    id="loanTermMonths"
                    type="number"
                    value={params.loanTermMonths}
                    onChange={(e) => setParams((prev) => ({ ...prev, loanTermMonths: Number(e.target.value) }))}
                    min="1"
                    max="120"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Need Parameters */}
            <Card>
              <CardHeader>
                <CardTitle>Bedarfsparameter</CardTitle>
                <CardDescription>Monatlicher Bedarf und Steigerung</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="initialMonthlyNeed">Initialer monatlicher Bedarf (€)</Label>
                  <Input
                    id="initialMonthlyNeed"
                    type="number"
                    value={params.initialMonthlyNeed}
                    onChange={(e) => setParams((prev) => ({ ...prev, initialMonthlyNeed: Number(e.target.value) }))}
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="annualNeedIncrease">Jährliche Bedarfsteigerung (%)</Label>
                  <Input
                    id="annualNeedIncrease"
                    type="number"
                    value={params.annualNeedIncrease}
                    onChange={(e) => setParams((prev) => ({ ...prev, annualNeedIncrease: Number(e.target.value) }))}
                    min="0"
                    step="0.1"
                  />
                </div>

                <div>
                  <Label htmlFor="simulationMonths">Simulationsdauer (Monate)</Label>
                  <Input
                    id="simulationMonths"
                    type="number"
                    value={params.simulationMonths}
                    onChange={(e) => setParams((prev) => ({ ...prev, simulationMonths: Number(e.target.value) }))}
                    min="1"
                    max="240"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Growth Rates */}
          <Card>
            <CardHeader>
              <CardTitle>Bitcoin Wachstumsraten</CardTitle>
              <CardDescription>
                Jährliche Wachstumsraten für {Math.ceil(params.simulationMonths / 12)} Jahre
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {params.annualGrowthRates.map((rate, index) => (
                  <div key={index}>
                    <Label htmlFor={`growth-${index}`}>Jahr {index + 1} (%)</Label>
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

          {/* Error Display */}
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

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            <Button onClick={runSimulation} disabled={isLoading} className="flex items-center gap-2">
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
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Erste LTV-Überschreitung</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summary.firstLtvBreachMonth ? `Monat ${summary.firstLtvBreachMonth}` : "Keine"}
                  </div>
                </CardContent>
              </Card>
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
                  <CardTitle className="text-sm font-medium">Finaler Collateral-Wert</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.finalCollateralValue.toLocaleString("de-DE")} €</div>
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
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Monat</th>
                        <th className="text-left p-2">Jahr</th>
                        <th className="text-right p-2">BTC-Preis (€)</th>
                        <th className="text-right p-2">Collateral (€)</th>
                        <th className="text-right p-2">Bedarf (€)</th>
                        <th className="text-right p-2">Neuer Kredit (€)</th>
                        <th className="text-right p-2">Rückzahlungen (€)</th>
                        <th className="text-right p-2">Gesamtschuld (€)</th>
                        <th className="text-right p-2">Erlaubtes LTV (€)</th>
                        <th className="text-center p-2">Status</th>
                        <th className="text-center p-2">LTV Breach (%)</th>
                        <th className="text-center p-2">Liquidation (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentResults.map((result) => (
                        <tr key={result.month} className="border-b hover:bg-muted/50">
                          <td className="p-2">{result.month}</td>
                          <td className="p-2">{result.year}</td>
                          <td className="p-2 text-right">{result.btcPrice.toLocaleString("de-DE")}</td>
                          <td className="p-2 text-right">{result.collateralValue.toLocaleString("de-DE")}</td>
                          <td className="p-2 text-right">{result.monthlyNeed.toLocaleString("de-DE")}</td>
                          <td className="p-2 text-right">{result.newLoanAmount.toLocaleString("de-DE")}</td>
                          <td className="p-2 text-right">{result.loanRepayments.toLocaleString("de-DE")}</td>
                          <td className="p-2 text-right">{result.totalOutstandingDebt.toLocaleString("de-DE")}</td>
                          <td className="p-2 text-right">{result.allowedLtv.toLocaleString("de-DE")}</td>
                          <td className="p-2 text-center">
                            <Badge variant={result.ltvStatus === "OK" ? "default" : "destructive"}>
                              {result.ltvStatus}
                            </Badge>
                          </td>
                          <td className="p-2 text-center">
                            {result.ltvBreachPercentage > 0 ? `${result.ltvBreachPercentage}%` : "-"}
                          </td>
                          <td className="p-2 text-center">
                            <span
                              className={
                                result.liquidationRiskPercentage >= 95
                                  ? "text-red-600 font-bold"
                                  : result.liquidationRiskPercentage >= 80
                                    ? "text-yellow-600"
                                    : ""
                              }
                            >
                              {result.liquidationRiskPercentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {results.length > itemsPerPage && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Zeige {startIndex + 1} bis {Math.min(endIndex, results.length)} von {results.length} Monaten
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
                <CardTitle>Verschuldung vs. LTV-Grenze & Liquidation</CardTitle>
                <CardDescription>Liquidation erfolgt bei 95% des Bitcoin-Wertes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" label={{ value: "Monat", position: "insideBottom", offset: -5 }} />
                      <YAxis
                        label={{ value: "Betrag (€)", angle: -90, position: "insideLeft" }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          let label = ""
                          switch (name) {
                            case "totalDebt":
                              label = "Gesamtschuld"
                              break
                            case "allowedLtv":
                              label = "Erlaubtes LTV"
                              break
                            case "liquidationLevel":
                              label = "Liquidationsgrenze (95%)"
                              break
                            default:
                              label = name
                          }
                          return [`${value.toLocaleString("de-DE")} €`, label]
                        }}
                        labelFormatter={(month) => `Monat ${month}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="totalDebt"
                        stroke="#ef4444"
                        strokeWidth={2}
                        name="Gesamtschuld"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="allowedLtv"
                        stroke="#22c55e"
                        strokeWidth={2}
                        name="Erlaubtes LTV"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="liquidationLevel"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        name="Liquidationsgrenze (95%)"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
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
                      <XAxis dataKey="month" label={{ value: "Monat", position: "insideBottom", offset: -5 }} />
                      <YAxis
                        label={{ value: "BTC-Preis (€)", angle: -90, position: "insideLeft" }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${value.toLocaleString("de-DE")} €`, "BTC-Preis"]}
                        labelFormatter={(month) => `Monat ${month}`}
                      />
                      <Line type="monotone" dataKey="btcPrice" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Monatlicher Bedarf</CardTitle>
                <CardDescription>Monatlicher Bedarf über die Simulationsdauer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" label={{ value: "Monat", position: "insideBottom", offset: -5 }} />
                      <YAxis
                        label={{ value: "Bedarf (€)", angle: -90, position: "insideLeft" }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${value.toLocaleString("de-DE")} €`, "Monatlicher Bedarf"]}
                        labelFormatter={(month) => `Monat ${month}`}
                      />
                      <Line type="monotone" dataKey="monthlyNeed" stroke="#64748b" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
