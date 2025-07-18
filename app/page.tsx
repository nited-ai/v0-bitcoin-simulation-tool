"use client"

import { useEffect, useMemo, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip as ShadcnTooltip, TooltipTrigger, TooltipProvider, TooltipContent } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from "recharts"
import { RefreshCw, Bitcoin, Download, AlertTriangle, TrendingUp, Info } from "lucide-react"
import { PriceModelChart } from "@/components/price-model-chart"
import { getPowerLawPrice, type PowerLawLine } from "@/lib/price-models"
import { ModeToggle } from "@/components/mode-toggle"

/* --------------------------------------------------------------------- */
/* ------------------------------ TYPES -------------------------------- */
/* --------------------------------------------------------------------- */

type PriceModel = "manual" | "powerLaw"

interface PowerLawSettings {
  prognosisLine: PowerLawLine
}

interface RiskManagementSettings {
  maxToleratedPriceDropPercent: number
  platformLtvForNewLoans: number
  warningLtv: number
  deleveragingLtv: number
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
  annualGrowthRates: number[]
  reinvestmentEnabled: boolean
  priceModel: PriceModel
  powerLawSettings: PowerLawSettings
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
  collateralTopUpBtc: number
  highestIndividualLtv: number
  totalLtv: number
}

/* --------------------------------------------------------------------- */
/* --------------------------- DEFAULTS -------------------------------- */
/* --------------------------------------------------------------------- */

const DEFAULT_PARAMS: SimulationParams = {
  btcAmount: 1,
  initialBtcPrice: 100_000,
  monthlyWithdrawalAmount: 1_000,
  annualInterestRate: 6.5,
  loanOriginationFeePercent: 1.5,
  loanTermMonths: 6,
  simulationMonths: 144,
  annualGrowthRates: [50, -60, 30, 60, 80, -50, 20, 60, 90, -50, 20, 60],
  reinvestmentEnabled: true,
  priceModel: "manual",
  powerLawSettings: { prognosisLine: "fit" },
  riskManagement: {
    maxToleratedPriceDropPercent: 80,
    platformLtvForNewLoans: 50,
    warningLtv: 60,
    deleveragingLtv: 75,
    liquidationLtv: 90,
    liquidationFeePercent: 5,
  },
}

const lineConfig = {
  collateralValue: { name: "Collateral-Wert (Gesamt)", color: "#8884d8" },
  lockedCollateralValue: { name: "Gesperrtes Collateral", color: "#facc15" },
  totalDebt: { name: "Gesamtschuld", color: "#ef4444" },
  secureDebtLimit: { name: "Sichere Kreditgrenze", color: "#22c55e" },
  liquidationLevel: { name: "Persönl. Liquidationsgrenze", color: "#06b6d4" },
}

const PARAMS_STORAGE_KEY = "btc-simulator-params"

/* --------------------------------------------------------------------- */
/* --------------------------- COMPONENT -------------------------------- */
/* --------------------------------------------------------------------- */

export default function BitcoinBulletCreditSimulator() {
  /* ---------------- STATE ---------------- */
  const [params, setParams] = useState<SimulationParams>(() => {
    if (typeof window === "undefined") return DEFAULT_PARAMS
    try {
      const saved = localStorage.getItem(PARAMS_STORAGE_KEY)
      if (!saved) return DEFAULT_PARAMS
      const parsed = JSON.parse(saved)
      return {
        ...DEFAULT_PARAMS,
        ...parsed,
        riskManagement: {
          ...DEFAULT_PARAMS.riskManagement,
          ...parsed.riskManagement,
        },
      }
    } catch {
      return DEFAULT_PARAMS
    }
  })

  const [results, setResults] = useState<MonthlyResult[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingPrice, setLoadingPrice] = useState(false)

  /* ------------- PERSIST PARAMS ---------- */
  useEffect(() => {
    try {
      localStorage.setItem(PARAMS_STORAGE_KEY, JSON.stringify(params))
    } catch {
      /* ignore */
    }
  }, [params])

  /* -------------- PARAM VALIDATION ------- */
  const validateParams = (p: SimulationParams) => {
    const errs: string[] = []
    if (p.btcAmount <= 0) errs.push("BTC-Menge muss positiv sein.")
    if (p.initialBtcPrice <= 0) errs.push("BTC-Preis muss positiv sein.")
    if (p.riskManagement.maxToleratedPriceDropPercent >= 100)
      errs.push("Maximaler Preisverfall muss unter 100 % liegen.")
    return errs
  }

  /* ---------------- BTC PRICE ------------- */
  const fetchCurrentPrice = async () => {
    setLoadingPrice(true)
    try {
      const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur")
      const json = await res.json()
      const price = json?.bitcoin?.eur
      if (price) {
        setParams((p) => ({ ...p, initialBtcPrice: Math.round(price) }))
        return price
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingPrice(false)
    }
    return null
  }

  /* ---------------- SIMULATION ------------ */
  const runSimulation = async () => {
    const errs = validateParams(params)
    if (errs.length) {
      setErrors(errs)
      return
    }
    setErrors([])
    setIsLoading(true)

    const MIN_LOAN = 1_000
    const MAX_LOAN = 15_000
    const {
      loanTermMonths,
      annualInterestRate,
      loanOriginationFeePercent,
      monthlyWithdrawalAmount,
      reinvestmentEnabled,
      riskManagement,
      annualGrowthRates,
      priceModel,
      powerLawSettings,
    } = params

    let unencBtc = params.btcAmount
    let activeLoans: Loan[] = []
    const temp: MonthlyResult[] = []
    const start = new Date()

    const calcRepayment = (principal: number) => principal * (1 + (annualInterestRate / 100) * (loanTermMonths / 12))

    for (let m = 1; m <= params.simulationMonths; m++) {
      const date = new Date(start)
      date.setMonth(date.getMonth() + m - 1)

      /* --- BTC PRICE MODEL --- */
      let btcPrice: number
      if (priceModel === "powerLaw") {
        btcPrice = m === 1 ? params.initialBtcPrice : getPowerLawPrice(date, powerLawSettings.prognosisLine)
      } else {
        if (m === 1) btcPrice = params.initialBtcPrice
        else {
          const prev = temp[m - 2].btcPrice
          const yrIdx = Math.min(Math.floor((m - 1) / 12), annualGrowthRates.length - 1)
          const monthlyGrowth = Math.pow(1 + annualGrowthRates[yrIdx] / 100, 1 / 12) - 1
          btcPrice = prev * (1 + monthlyGrowth)
        }
      }

      /* ---------- REPAY MATURING LOANS -------- */
      const due = activeLoans.filter((l) => l.maturityMonth === m)
      const repayAmt = due.reduce((s, l) => s + l.repaymentAmount, 0)
      const unlocked = due.reduce((s, l) => s + l.lockedBtc, 0)
      unencBtc += unlocked
      activeLoans = activeLoans.filter((l) => l.maturityMonth !== m)

      /* ---------- NEW LOANS ------------------- */
      const intFactor = 1 + (annualInterestRate / 100) * (loanTermMonths / 12)
      const feeFactor = 1 - loanOriginationFeePercent / 100

      const requiredLiquidity = repayAmt + monthlyWithdrawalAmount
      const principalNeeded = requiredLiquidity / feeFactor

      const maxPrincipal = (unencBtc * btcPrice * (riskManagement.platformLtvForNewLoans / 100)) / intFactor

      let principalToBorrow = Math.min(principalNeeded, maxPrincipal)
      let newLoanPrincipalTotal = 0

      while (principalToBorrow >= MIN_LOAN) {
        const chunk = Math.min(principalToBorrow, MAX_LOAN)
        const repayment = calcRepayment(chunk)
        const btcToLock = repayment / (btcPrice * (riskManagement.platformLtvForNewLoans / 100))

        if (unencBtc >= btcToLock) {
          unencBtc -= btcToLock
          activeLoans.push({
            month: m,
            principal: chunk,
            maturityMonth: m + loanTermMonths,
            repaymentAmount: repayment,
            lockedBtc: btcToLock,
          })
          newLoanPrincipalTotal += chunk
          principalToBorrow -= chunk
        } else break
      }

      /* ---------- CASH FLOWS ------------------ */
      const fee = newLoanPrincipalTotal * (loanOriginationFeePercent / 100)
      const liquidity = newLoanPrincipalTotal - fee - repayAmt
      const withdrawal = Math.min(liquidity, monthlyWithdrawalAmount)
      const surplus = liquidity - withdrawal

      if (reinvestmentEnabled && surplus > 0) {
        unencBtc += surplus / btcPrice
      }

      /* ---------- METRICS --------------------- */
      const lockedBtc = activeLoans.reduce((s, l) => s + l.lockedBtc, 0)
      const totalBtc = unencBtc + lockedBtc
      const totalDebt = activeLoans.reduce((s, l) => s + l.repaymentAmount, 0)
      const collateralValue = totalBtc * btcPrice
      const lockedCollateralValue = lockedBtc * btcPrice
      const secureDebtLimit = collateralValue * (riskManagement.liquidationLtv / 100)
      const totalLtv = collateralValue ? (totalDebt / collateralValue) * 100 : 0

      temp.push({
        month: m,
        year: date.getFullYear(),
        dateString: `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getFullYear()).slice(-2)}`,
        btcPrice: Math.round(btcPrice),
        collateralValue: Math.round(collateralValue),
        lockedCollateralValue: Math.round(lockedCollateralValue),
        withdrawalAmount: Math.round(withdrawal),
        reinvestmentAmount: Math.round(reinvestmentEnabled ? surplus : 0),
        newLoanAmount: Math.round(newLoanPrincipalTotal),
        loanRepayments: Math.round(repayAmt),
        totalOutstandingDebt: Math.round(totalDebt),
        secureDebtLimit: Math.round(secureDebtLimit),
        ltvStatus: totalDebt <= secureDebtLimit ? "OK" : "Überschritten",
        activeLoans: [...activeLoans],
        isLiquidated: false,
        currentBtcAmount: totalBtc,
        unencumberedBtc: unencBtc,
        lockedBtc,
        liquidatedBtc: 0,
        controlledSaleBtc: 0,
        collateralTopUpBtc: 0,
        highestIndividualLtv: 0,
        totalLtv: Math.round(totalLtv),
      })
    }

    setResults(temp)
    setIsLoading(false)
  }

  /* ---------- INITIAL LOAD --------------- */
  useEffect(() => {
    runSimulation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- PAGINATION ----------------- */
  const itemsPerPage = 125
  const totalPages = Math.ceil(results.length / itemsPerPage)
  const [currentPage, setCurrentPage] = useState(1)
  const currentResults = results.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  /* ---------- SUMMARY -------------------- */
  const summary = useMemo(() => {
    if (!results.length) return null
    const last = results[results.length - 1]
    return {
      finalBtcPrice: last.btcPrice,
      finalCollateralValue: last.collateralValue,
      finalDebt: last.totalOutstandingDebt,
    }
  }, [results])

  /* --------------------------------------------------------------------- */
  /* ------------------------------ RENDER ------------------------------- */
  /* --------------------------------------------------------------------- */

  return (
    <TooltipProvider>
      <div className="container mx-auto max-w-7xl p-4">
        {/* HEADER */}
        <header className="mb-8 flex items-center justify-between">
          <div />
          <div className="text-center">
            <h1 className="mb-2 flex items-center justify-center gap-2 text-4xl font-bold">
              <Bitcoin className="h-8 w-8 text-orange-500" />
              Bitcoin Bullet-Kredit Simulator
            </h1>
            <p className="text-muted-foreground">
              Simulation rollierender endfälliger Kredite mit Bitcoin als Sicherheit
            </p>
          </div>
          <ModeToggle />
        </header>

        {/* TABS */}
        <Tabs defaultValue="parameters">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="parameters">Parameter</TabsTrigger>
            <TabsTrigger value="results">Ergebnisse</TabsTrigger>
            <TabsTrigger value="chart">Diagramm</TabsTrigger>
          </TabsList>

          {/* PARAMETER TAB */}
          <TabsContent value="parameters" className="space-y-6">
            {/* BASIC PARAMS */}
            <Card>
              <CardHeader>
                <CardTitle>Grundparameter</CardTitle>
                <CardDescription>Bitcoin- und Kredit-Grundeinstellungen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Row 1 */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="btcAmount" className="flex items-center gap-1">
                      BTC-Menge
                      <ShadcnTooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 cursor-help text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>Die anfängliche Menge an BTC als Collateral.</TooltipContent>
                      </ShadcnTooltip>
                    </Label>
                    <Input
                      id="btcAmount"
                      type="number"
                      min={0}
                      step={0.1}
                      value={params.btcAmount}
                      onChange={(e) => setParams({ ...params, btcAmount: +e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="initialBtcPrice" className="flex items-center gap-1">
                      Initialer BTC-Preis (€)
                      <ShadcnTooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 cursor-help text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>Startpreis von Bitcoin in Euro.</TooltipContent>
                      </ShadcnTooltip>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="initialBtcPrice"
                        type="number"
                        min={0}
                        value={params.initialBtcPrice}
                        onChange={(e) =>
                          setParams({
                            ...params,
                            initialBtcPrice: +e.target.value,
                          })
                        }
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const p = await fetchCurrentPrice()
                          if (p) alert(`Aktueller BTC-Preis: €${Math.round(p)}`)
                        }}
                        disabled={loadingPrice}
                      >
                        {loadingPrice ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="loanTermMonths" className="flex items-center gap-1">
                      Kreditlaufzeit (Monate)
                    </Label>
                    <Input
                      id="loanTermMonths"
                      type="number"
                      min={1}
                      max={120}
                      value={params.loanTermMonths}
                      onChange={(e) =>
                        setParams({
                          ...params,
                          loanTermMonths: +e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="simulationMonths" className="flex items-center gap-1">
                      Simulationsdauer (Monate)
                    </Label>
                    <Input
                      id="simulationMonths"
                      type="number"
                      min={1}
                      max={240}
                      value={params.simulationMonths}
                      onChange={(e) =>
                        setParams({
                          ...params,
                          simulationMonths: +e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Row 3 */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="annualInterestRate" className="flex items-center gap-1">
                      Zinssatz p.a. (%)
                    </Label>
                    <Input
                      id="annualInterestRate"
                      type="number"
                      step={0.1}
                      min={0}
                      value={params.annualInterestRate}
                      onChange={(e) =>
                        setParams({
                          ...params,
                          annualInterestRate: +e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="loanOriginationFeePercent" className="flex items-center gap-1">
                      Kreditgebühr (%)
                    </Label>
                    <Input
                      id="loanOriginationFeePercent"
                      type="number"
                      step={0.1}
                      min={0}
                      value={params.loanOriginationFeePercent}
                      onChange={(e) =>
                        setParams({
                          ...params,
                          loanOriginationFeePercent: +e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Withdrawal / Reinvest */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="monthlyWithdrawalAmount" className="flex items-center gap-1">
                      Monatliche Entnahme (€)
                    </Label>
                    <Input
                      id="monthlyWithdrawalAmount"
                      type="number"
                      min={0}
                      value={params.monthlyWithdrawalAmount}
                      onChange={(e) =>
                        setParams({
                          ...params,
                          monthlyWithdrawalAmount: +e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6 md:pt-0">
                    <Checkbox
                      id="reinvest"
                      checked={params.reinvestmentEnabled}
                      onCheckedChange={(c) =>
                        setParams({
                          ...params,
                          reinvestmentEnabled: Boolean(c),
                        })
                      }
                    />
                    <Label htmlFor="reinvest">Überschuss reinvestieren</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PRICE MODEL */}
            <Card>
              <CardHeader>
                <CardTitle>Preismodell</CardTitle>
                <CardDescription>Bitcoin-Preis über die Zeit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="priceModel">Modell wählen</Label>
                    <Select
                      value={params.priceModel}
                      onValueChange={(v: PriceModel) => setParams({ ...params, priceModel: v })}
                    >
                      <SelectTrigger id="priceModel">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manuelle Wachstumsraten</SelectItem>
                        <SelectItem value="powerLaw">Power-Law-Modell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {params.priceModel === "powerLaw" && (
                    <div>
                      <Label htmlFor="prognosisLine" className="flex items-center gap-1">
                        Prognose-Linie
                      </Label>
                      <Select
                        value={params.powerLawSettings.prognosisLine}
                        onValueChange={(v: PowerLawLine) =>
                          setParams({
                            ...params,
                            powerLawSettings: { prognosisLine: v },
                          })
                        }
                      >
                        <SelectTrigger id="prognosisLine">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fit">Fit (Grün)</SelectItem>
                          <SelectItem value="support">Support (Rot)</SelectItem>
                          <SelectItem value="resistance">Resistance (Lila)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {params.priceModel === "powerLaw" && <PriceModelChart simulationMonths={params.simulationMonths} />}

                {params.priceModel === "manual" && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Jährliche Wachstumsraten (%)</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
                      {params.annualGrowthRates.map((rate, idx) => (
                        <Input
                          key={idx}
                          type="number"
                          className="text-center"
                          value={rate}
                          onChange={(e) => {
                            const next = [...params.annualGrowthRates]
                            next[idx] = +e.target.value
                            setParams({ ...params, annualGrowthRates: next })
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ACTIONS */}
            <div className="flex flex-wrap gap-4">
              <Button disabled={isLoading} onClick={runSimulation} className="flex items-center gap-2">
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                {isLoading ? "Berechne …" : "Simulation starten"}
              </Button>

              <Button variant="outline" onClick={() => setParams(DEFAULT_PARAMS)}>
                Parameter zurücksetzen
              </Button>
            </div>

            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* RESULTS TAB */}
          <TabsContent value="results" className="space-y-6">
            {summary && (
              <Card>
                <CardHeader>
                  <CardTitle>Zusammenfassung</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Finaler BTC-Preis</p>
                    <p className="text-xl font-bold">{summary.finalBtcPrice.toLocaleString("de-DE")} €</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Collateral-Wert</p>
                    <p className="text-xl font-bold">{summary.finalCollateralValue.toLocaleString("de-DE")} €</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gesamtschuld</p>
                    <p className="text-xl font-bold">{summary.finalDebt.toLocaleString("de-DE")} €</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nettovermögen</p>
                    <p className="text-xl font-bold">
                      {(summary.finalCollateralValue - summary.finalDebt).toLocaleString("de-DE")}
                      &nbsp;€
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {results.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Monatliche Ergebnisse</CardTitle>
                </CardHeader>
                <CardContent className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background text-xs">
                      <tr>
                        <th className="p-2 text-left">Monat</th>
                        <th className="p-2 text-left">Datum</th>
                        <th className="p-2 text-right">BTC-Preis</th>
                        <th className="p-2 text-right">Collateral</th>
                        <th className="p-2 text-right">Schuld</th>
                        <th className="p-2 text-right">LTV (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentResults.map((r) => (
                        <tr key={r.month} className="border-b">
                          <td className="p-2">{r.month}</td>
                          <td className="p-2">{r.dateString}</td>
                          <td className="p-2 text-right">{r.btcPrice.toLocaleString("de-DE")}</td>
                          <td className="p-2 text-right">{r.collateralValue.toLocaleString("de-DE")}</td>
                          <td className="p-2 text-right">{r.totalOutstandingDebt.toLocaleString("de-DE")}</td>
                          <td className="p-2 text-right">{r.totalLtv}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Pagination */}
                  {results.length > itemsPerPage && (
                    <div className="mt-4 flex items-center justify-between">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      >
                        ←
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Seite {currentPage} / {totalPages}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      >
                        →
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {results.length > 0 && (
              <Button
                variant="outline"
                className="flex items-center gap-2 bg-transparent"
                onClick={() => {
                  const headers = "Monat,Datum,BTC-Preis,Collateral,Schuld,LTV"
                  const rows = results
                    .map((r) =>
                      [r.month, r.dateString, r.btcPrice, r.collateralValue, r.totalOutstandingDebt, r.totalLtv].join(
                        ",",
                      ),
                    )
                    .join("\n")
                  const blob = new Blob([headers + "\n" + rows], {
                    type: "text/csv",
                  })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = "simulation.csv"
                  a.click()
                  URL.revokeObjectURL(url)
                }}
              >
                <Download className="h-4 w-4" />
                CSV-Export
              </Button>
            )}
          </TabsContent>

          {/* CHART TAB */}
          <TabsContent value="chart">
            {results.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Collateral vs. Schuld</CardTitle>
                </CardHeader>
                <CardContent className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={results.map((r) => ({
                        date: r.dateString,
                        collateralValue: r.collateralValue,
                        totalDebt: r.totalOutstandingDebt,
                        secureDebtLimit: r.secureDebtLimit,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" hide />
                      <YAxis />
                      <Tooltip formatter={(v: number) => v.toLocaleString("de-DE") + " €"} />
                      <Line
                        type="monotone"
                        dataKey="collateralValue"
                        stroke={lineConfig.collateralValue.color}
                        dot={false}
                      />
                      <Line type="monotone" dataKey="totalDebt" stroke={lineConfig.totalDebt.color} dot={false} />
                      <Line
                        type="monotone"
                        dataKey="secureDebtLimit"
                        stroke={lineConfig.secureDebtLimit.color}
                        dot={false}
                        strokeDasharray="4 4"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}
