import React, { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useSimulation } from '../../../context/SimulationContext'
import type { MonthlyResult } from '../../../../types/simulation'

interface LoanEvent {
  month: number
  date: string
  eventType: 'new_loan' | 'rollover' | 'repayment' | 'liquidation'
  amount: number
  description: string
  loanId?: number
  btcPrice: number
}

export function LoanHistoryTable() {
  const { results, params } = useSimulation()

  // Only render for rolling loan strategy
  if (params.investmentStrategy !== 'rollingLoan') {
    return null
  }

  const loanEvents = useMemo(() => {
    if (results.length === 0) return []

    const events: LoanEvent[] = []

    results.forEach((result: MonthlyResult, index: number) => {
      const previousResult = index > 0 ? results[index - 1] : null

      // Check for liquidation events
      result.events.forEach(event => {
        if (event.type === 'liquidated') {
          events.push({
            month: result.month,
            date: result.date,
            eventType: 'liquidation',
            amount: 0,
            description: `Loan ID ${(event as any).id} liquidated`,
            loanId: (event as any).id,
            btcPrice: result.btcPrice
          })
        }
      })

      // Check for new loans (new active loans that weren't in previous month)
      result.activeLoans.forEach(loan => {
        const wasActivePreviously = previousResult?.activeLoans.some(prevLoan => prevLoan.id === loan.id)
        
        if (!wasActivePreviously && loan.month === result.month) {
          events.push({
            month: result.month,
            date: result.date,
            eventType: 'new_loan',
            amount: loan.principal,
            description: `New loan taken`,
            loanId: loan.id,
            btcPrice: result.btcPrice
          })
        }
      })

      // Check for loan rollovers (repayment due > 0 and new loan in same month)
      if (result.repaymentDue > 0) {
        const newLoanThisMonth = result.activeLoans.find(loan => loan.month === result.month)
        
        if (newLoanThisMonth) {
          events.push({
            month: result.month,
            date: result.date,
            eventType: 'rollover',
            amount: newLoanThisMonth.principal,
            description: `Loan rollover (repaid $${result.repaymentDue.toLocaleString()})`,
            loanId: newLoanThisMonth.id,
            btcPrice: result.btcPrice
          })
        } else {
          events.push({
            month: result.month,
            date: result.date,
            eventType: 'repayment',
            amount: result.repaymentDue,
            description: `Loan repayment`,
            btcPrice: result.btcPrice
          })
        }
      }
    })

    // Sort events chronologically
    return events.sort((a, b) => a.month - b.month)
  }, [results])

  const getEventBadgeVariant = (eventType: LoanEvent['eventType']) => {
    switch (eventType) {
      case 'new_loan':
        return 'default'
      case 'rollover':
        return 'secondary'
      case 'repayment':
        return 'outline'
      case 'liquidation':
        return 'destructive'
      default:
        return 'default'
    }
  }

  const getEventTypeLabel = (eventType: LoanEvent['eventType']) => {
    switch (eventType) {
      case 'new_loan':
        return 'New Loan'
      case 'rollover':
        return 'Loan Rollover'
      case 'repayment':
        return 'Repayment'
      case 'liquidation':
        return 'Liquidation'
      default:
        return 'Unknown'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loan History</CardTitle>
        <CardDescription>
          Month-by-month loan events and transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loanEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No loan events to display
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>BTC Price</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loanEvents.map((event, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {event.month}
                    </TableCell>
                    <TableCell>
                      {new Date(event.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getEventBadgeVariant(event.eventType)}>
                        {getEventTypeLabel(event.eventType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {event.eventType === 'liquidation' ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        <span className="font-medium">
                          ${event.amount.toLocaleString()}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        ${event.btcPrice.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {event.description}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
