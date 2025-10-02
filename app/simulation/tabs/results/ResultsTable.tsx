"use client"

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSimulation } from "../../context/SimulationContext"
import type { MonthlyResult } from "../../types/simulation"

/**
 * Format currency in German locale with Euro symbol
 * @param value - The value to format
 * @returns Formatted string like "€95.234"
 */
function formatCurrency(value: number): string {
  return `€${Math.round(value).toLocaleString("de-DE")}`
}

/**
 * Format BTC amount with 4 decimal places
 * @param value - The BTC amount to format
 * @returns Formatted string like "1.2345 BTC"
 */
function formatBtc(value: number): string {
  return `${value.toFixed(4)} BTC`
}

/**
 * Format percentage with 2 decimal places
 * @param value - The percentage value (0-1 or 0-100)
 * @returns Formatted string like "15.75%"
 */
function formatPercentage(value: number): string {
  // Assume value is already in percentage form (0-100)
  return `${value.toFixed(2)}%`
}

/**
 * Format date in MM/YYYY format
 * @param dateString - The date string to format
 * @returns Formatted string like "01/2025"
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${month}/${year}`
}

/**
 * Results Table Component
 *
 * Displays comprehensive monthly simulation results in a 9-column table format
 * matching the HTML prototype structure with German localization.
 *
 * Columns:
 * 1. Datum (Date) - MM/YYYY
 * 2. BTC Preis (€) - BTC Price in Euros
 * 3. BTC Bestand - Total BTC Holdings
 * 4. Wert (€) - Portfolio Value (BTC Bestand × BTC Preis)
 * 5. Gekaufte BTC - BTC Purchased from loan proceeds
 * 6. Spar./Entn. d. Zyklus (€) - Savings/Withdrawals of the cycle
 * 7. Akt. LTV (%) - Current LTV percentage
 * 8. Schulden (€) - Total Debt
 * 9. Netto BTC - Net BTC (BTC Bestand - locked collateral)
 */
export function ResultsTable() {
  const { t } = useTranslation()
  const { results, currentPage, setCurrentPage } = useSimulation()

  // Calculate Netto BTC for each result (memoized for performance)
  const enrichedResults = useMemo(() => {
    return results.map(r => {
      // Use totalBtcAmount if available, otherwise fall back to currentBtcAmount
      const btcAmount = r.totalBtcAmount ?? r.currentBtcAmount
      // Use date if available, otherwise fall back to dateString
      const dateStr = r.date ?? r.dateString
      // Calculate LTV if not provided
      const ltvValue = r.ltv ?? (btcAmount * r.btcPrice > 0 ? r.totalDebt / (btcAmount * r.btcPrice) : 0)

      return {
        ...r,
        totalBtcAmount: btcAmount,
        date: dateStr,
        ltv: ltvValue,
        portfolioValue: btcAmount * r.btcPrice,
        nettoBtc: btcAmount - (r.totalDebt / r.btcPrice)
      }
    })
  }, [results])

  // Check for liquidation events
  const hasLiquidation = useMemo(() => {
    return results.some(r => r.events.some(e => e.type === "liquidated"))
  }, [results])

  // Find liquidation month if any
  const liquidationMonth = useMemo(() => {
    const liquidatedResult = results.find(r => r.events.some(e => e.type === "liquidated"))
    return liquidatedResult?.month
  }, [results])

  // Filter results up to liquidation if it occurred
  const displayResults = useMemo(() => {
    if (liquidationMonth !== undefined) {
      return enrichedResults.filter(r => r.month <= liquidationMonth)
    }
    return enrichedResults
  }, [enrichedResults, liquidationMonth])

  // Don't render if no results
  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detailergebnisse</CardTitle>
          <CardDescription>Monatliche Simulationsergebnisse</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Bitte starten Sie die Simulation.
          </div>
        </CardContent>
      </Card>
    )
  }

  const itemsPerPage = 12
  const totalPages = Math.ceil(displayResults.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(currentPage * itemsPerPage, displayResults.length)
  const currentResults = displayResults.slice(startIndex, endIndex)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detailergebnisse</CardTitle>
        <CardDescription>Monatliche Simulationsergebnisse im Detail</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-700 z-10 text-xs text-gray-300 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left rounded-l-lg">Datum</th>
                  <th scope="col" className="px-4 py-3 text-right">BTC Preis (€)</th>
                  <th scope="col" className="px-4 py-3 text-right">BTC Bestand</th>
                  <th scope="col" className="px-4 py-3 text-right">Wert (€)</th>
                  <th scope="col" className="px-4 py-3 text-right">Gekaufte BTC</th>
                  <th scope="col" className="px-4 py-3 text-right">Spar./Entn. d. Zyklus (€)</th>
                  <th scope="col" className="px-4 py-3 text-right">Akt. LTV (%)</th>
                  <th scope="col" className="px-4 py-3 text-right">Schulden (€)</th>
                  <th scope="col" className="px-4 py-3 text-right rounded-r-lg">Netto BTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {currentResults.map((r, index) => {
                  // Check if this row has a liquidation event
                  const isLiquidated = r.events.some(e => e.type === "liquidated")

                  if (isLiquidated) {
                    return (
                      <tr key={r.month} className="bg-red-900/80 text-red-200 font-bold">
                        <td colSpan={9} className="text-center p-4">
                          LIQUIDATION am {formatDate(r.date)}
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr
                      key={r.month}
                      className={`${
                        index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/50'
                      } hover:bg-gray-700/50 transition-colors`}
                    >
                      {/* Column 1: Datum */}
                      <td className="px-4 py-3 font-medium text-left">
                        {formatDate(r.date)}
                      </td>

                      {/* Column 2: BTC Preis (€) */}
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(r.btcPrice)}
                      </td>

                      {/* Column 3: BTC Bestand */}
                      <td className="px-4 py-3 text-right">
                        {formatBtc(r.totalBtcAmount)}
                      </td>

                      {/* Column 4: Wert (€) - Calculated */}
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(r.portfolioValue)}
                      </td>

                      {/* Column 5: Gekaufte BTC - Green */}
                      <td className="px-4 py-3 text-right text-green-400">
                        {r.btcPurchased && r.btcPurchased > 0
                          ? `+${formatBtc(r.btcPurchased)}`
                          : '-'}
                      </td>

                      {/* Column 6: Spar./Entn. d. Zyklus (€) - Color coded */}
                      <td className={`px-4 py-3 text-right ${
                        r.monthlySavingsApplied
                          ? r.monthlySavingsApplied > 0
                            ? 'text-green-400'
                            : 'text-red-400'
                          : ''
                      }`}>
                        {r.monthlySavingsApplied
                          ? formatCurrency(r.monthlySavingsApplied)
                          : formatCurrency(0)}
                      </td>

                      {/* Column 7: Akt. LTV (%) */}
                      <td className="px-4 py-3 text-right">
                        {formatPercentage(r.ltv * 100)}
                      </td>

                      {/* Column 8: Schulden (€) */}
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(r.totalDebt)}
                      </td>

                      {/* Column 9: Netto BTC - Teal */}
                      <td className="px-4 py-3 text-right font-semibold text-teal-300">
                        {formatBtc(r.nettoBtc)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {displayResults.length > itemsPerPage && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Zeige Monate {startIndex + 1}-{endIndex} von {displayResults.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
              >
                Zurück
              </Button>
              <span className="text-sm text-muted-foreground">
                Seite {currentPage} von {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage >= totalPages}
              >
                Weiter
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
