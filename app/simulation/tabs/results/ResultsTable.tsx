"use client"

import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSimulation } from "../../context/SimulationContext"
import type { MonthlyResult, MonthlyEvent } from "../../types/simulation"

/**
 * Format event for display in the results table
 */
function formatEvent(event: MonthlyEvent): string {
  switch (event.type) {
    case "withdrawal_skipped":
      return "Withdrawal skipped"
    case "deleveraged":
      return `Deleveraged: €${event.amount.toLocaleString("de-DE")}`
    case "liquidated":
      return `Liquidated: Loan #${event.id}`
    case "collateral_topped_up":
      return `Collateral topped up: €${event.amount.toLocaleString("de-DE")}`
    default:
      return "Unknown event"
  }
}

/**
 * Results Table Component
 * 
 * Displays detailed monthly simulation results in a paginated table format.
 * Shows all key metrics including BTC price, collateral, debt, LTV, and events.
 */
export function ResultsTable() {
  const { t } = useTranslation()
  const { results, params, currentPage, setCurrentPage } = useSimulation()

  // Don't render if no results
  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("Results.monthlyResults")}</CardTitle>
          <CardDescription>{t("Results.noResults")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {t("Results.runSimulation")}
          </div>
        </CardContent>
      </Card>
    )
  }

  const itemsPerPage = 12
  const totalPages = Math.ceil(results.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(currentPage * itemsPerPage, results.length)
  const currentResults = results.slice(startIndex, endIndex)

  return (
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
                  <th className="p-2">{t("Results.tableMaxSafeDebt")}</th>
                  <th className="p-2">{t("Results.tableNewLoans")}</th>
                  <th className="p-2">{t("Results.tableRepayments")}</th>
                  <th className="p-2">{t("Results.tableWithdrawal")}</th>
                  <th className="p-2">{t("Results.tableReinvestment")}</th>
                  <th className="p-2 text-center">{t("Results.tableLoanCount")}</th>
                  <th className="p-2 text-left">{t("Results.tableEvents")}</th>
                </tr>
              </thead>
              <tbody>
                {currentResults.map((r) => (
                  <tr
                    key={r.month}
                    className={`border-b hover:bg-muted/50 ${
                      r.events.some((e) => e.type === "liquidated") ? "bg-red-900/20" : ""
                    }`}
                  >
                    <td className="text-left p-2">{r.month}</td>
                    <td className="text-left p-2">{r.dateString || r.date}</td>
                    <td className="p-2">${r.btcPrice.toLocaleString("en-US")}</td>
                    <td className="p-2">{(r.currentBtcAmount || r.totalBtcAmount || 0).toFixed(4)}</td>
                    <td className="p-2">${r.collateralValue.toLocaleString("en-US")}</td>
                    <td className="p-2">${r.totalDebt.toLocaleString("en-US")}</td>
                    <td className="p-2">${((r.lockedBtc || (r.activeLoans?.reduce((sum, loan) => sum + loan.lockedBtc, 0) || 0)) * r.btcPrice).toLocaleString("en-US")}</td>
                    <td
                      className={`p-2 text-center ${
                        r.highestLtv >= params.riskManagement.liquidationLtv ? "text-red-500" : ""
                      }`}
                    >
                      {r.highestLtv}%
                    </td>
                    <td className="p-2">
                      {r.maxSafeDebt !== undefined ? `$${r.maxSafeDebt.toLocaleString("en-US")}` : "-"}
                    </td>
                    <td className="p-2">${(r.newLoanPrincipal || r.principalForNeeds || r.principalForReinvestment || 0).toLocaleString("en-US")}</td>
                    <td className="p-2">${(r.repaymentsDue || r.repaymentDue || 0).toLocaleString("en-US")}</td>
                    <td className="p-2">${(r.withdrawalAmount || r.monthlyWithdrawal || 0).toLocaleString("en-US")}</td>
                    <td className="p-2">${(r.reinvestment || r.principalForReinvestment || 0).toLocaleString("en-US")}</td>
                    <td className="p-2 text-center">{r.loanCount || r.activeLoans?.length || 0}</td>
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

        {/* Pagination */}
        {results.length > itemsPerPage && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              {t("Results.paginationShowing", {
                start: startIndex + 1,
                end: endIndex,
                total: results.length,
              })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
              >
                {t("Results.paginationPrevious")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage >= totalPages}
              >
                {t("Results.paginationNext")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
