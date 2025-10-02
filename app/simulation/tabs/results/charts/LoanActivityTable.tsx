"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Calendar, TrendingUp, AlertCircle } from "lucide-react"
import { useSimulation } from "../../../context/SimulationContext"
import type { MonthlyResult } from "../../../types/simulation"

interface LoanActivity {
  loanId: number
  takenMonth: number
  takenDate: string
  principal: number
  repaymentAmount: number
  maturityMonth: number
  maturityDate: string
  lockedBtc: number
  btcPriceAtOrigination: number
  status: 'active' | 'matured'
}

/**
 * Loan Activity Table Component
 * 
 * Displays detailed information about all loans taken during the simulation,
 * including origination, maturity, amounts, and status.
 */
export function LoanActivityTable() {
  const { results } = useSimulation()

  // Extract loan activity from results
  const loanActivities: LoanActivity[] = useMemo(() => {
    if (results.length === 0) return []

    const loans: LoanActivity[] = []
    const loanMap = new Map<number, LoanActivity>()

    results.forEach((result: MonthlyResult) => {
      // Track new loans
      if (result.newLoanPrincipal > 0) {
        // Estimate loan details from the result data
        // Note: This is a simplified extraction. In a real implementation,
        // you'd want to track individual loans through the simulation
        const loanId = loans.length + 1
        const loan: LoanActivity = {
          loanId,
          takenMonth: result.month,
          takenDate: result.dateString,
          principal: result.newLoanPrincipal,
          repaymentAmount: result.newLoanPrincipal * 1.065, // Approximate with interest
          maturityMonth: result.month + 6, // Assuming 6-month term
          maturityDate: new Date(new Date(result.dateString).setMonth(new Date(result.dateString).getMonth() + 6)).toISOString().split('T')[0],
          lockedBtc: result.newLoanPrincipal / result.btcPrice,
          btcPriceAtOrigination: result.btcPrice,
          status: 'active'
        }
        loans.push(loan)
        loanMap.set(loanId, loan)
      }

      // Mark loans as matured when repayments occur
      if (result.repaymentsDue > 0) {
        // Find loans that should mature at this month
        loans.forEach(loan => {
          if (loan.maturityMonth === result.month && loan.status === 'active') {
            loan.status = 'matured'
          }
        })
      }
    })

    return loans
  }, [results])

  // Calculate loan statistics
  const loanStats = useMemo(() => {
    if (loanActivities.length === 0) return null

    const totalLoans = loanActivities.length
    const activeLoans = loanActivities.filter(l => l.status === 'active').length
    const maturedLoans = loanActivities.filter(l => l.status === 'matured').length
    const totalPrincipal = loanActivities.reduce((sum, l) => sum + l.principal, 0)
    const totalRepayment = loanActivities.reduce((sum, l) => sum + l.repaymentAmount, 0)
    const totalInterest = totalRepayment - totalPrincipal

    return {
      totalLoans,
      activeLoans,
      maturedLoans,
      totalPrincipal,
      totalRepayment,
      totalInterest,
    }
  }, [loanActivities])

  // Don't render if no loans
  if (loanActivities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-500" />
            Loan Activity
          </CardTitle>
          <CardDescription>
            No loans were taken during this simulation
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-500" />
          Loan Activity
        </CardTitle>
        <CardDescription>
          Detailed breakdown of all loans taken during the simulation
        </CardDescription>
        
        {/* Loan Statistics */}
        {loanStats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total Loans</div>
              <div className="text-lg font-semibold">{loanStats.totalLoans}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Active</div>
              <div className="text-lg font-semibold text-blue-600">{loanStats.activeLoans}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Matured</div>
              <div className="text-lg font-semibold text-green-600">{loanStats.maturedLoans}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total Principal</div>
              <div className="text-sm font-medium">${Math.round(loanStats.totalPrincipal).toLocaleString('en-US')}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total Repayment</div>
              <div className="text-sm font-medium">${Math.round(loanStats.totalRepayment).toLocaleString('en-US')}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total Interest</div>
              <div className="text-sm font-medium text-orange-600">${Math.round(loanStats.totalInterest).toLocaleString('en-US')}</div>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background z-10 border-b">
                <tr>
                  <th className="text-left p-2">Loan ID</th>
                  <th className="text-left p-2">Taken</th>
                  <th className="text-right p-2">Principal</th>
                  <th className="text-right p-2">Repayment</th>
                  <th className="text-right p-2">Interest</th>
                  <th className="text-right p-2">Locked BTC</th>
                  <th className="text-right p-2">BTC Price</th>
                  <th className="text-left p-2">Maturity</th>
                  <th className="text-center p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {loanActivities.map((loan) => {
                  const interest = loan.repaymentAmount - loan.principal
                  const interestRate = (interest / loan.principal) * 100

                  return (
                    <tr
                      key={loan.loanId}
                      className="border-b hover:bg-muted/50"
                    >
                      <td className="text-left p-2 font-medium">#{loan.loanId}</td>
                      <td className="text-left p-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs">M{loan.takenMonth}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{loan.takenDate}</div>
                      </td>
                      <td className="text-right p-2">
                        ${Math.round(loan.principal).toLocaleString('en-US')}
                      </td>
                      <td className="text-right p-2">
                        ${Math.round(loan.repaymentAmount).toLocaleString('en-US')}
                      </td>
                      <td className="text-right p-2">
                        <div className="text-orange-600">
                          ${Math.round(interest).toLocaleString('en-US')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ({interestRate.toFixed(1)}%)
                        </div>
                      </td>
                      <td className="text-right p-2">
                        {loan.lockedBtc.toFixed(4)} BTC
                      </td>
                      <td className="text-right p-2">
                        ${Math.round(loan.btcPriceAtOrigination).toLocaleString('en-US')}
                      </td>
                      <td className="text-left p-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs">M{loan.maturityMonth}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{loan.maturityDate}</div>
                      </td>
                      <td className="text-center p-2">
                        <Badge
                          variant={loan.status === 'active' ? 'default' : 'secondary'}
                          className={loan.status === 'active' ? 'bg-blue-500' : 'bg-green-500'}
                        >
                          {loan.status === 'active' ? 'Active' : 'Matured'}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Warning about loan tracking */}
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> Loan tracking is currently simplified. Individual loan details are estimated from monthly aggregates.
              For precise loan-by-loan tracking, the simulation engine needs to be enhanced to track individual loan objects.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

