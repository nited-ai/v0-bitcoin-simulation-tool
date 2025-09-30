import React, { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'
import { useSimulation } from '../../../context/SimulationContext'
import type { MonthlyResult, MonthlyEvent } from '../../../types/simulation'

interface LoanEvent {
  month: number
  date: string
  eventType: 'new_loan' | 'rollover' | 'repayment' | 'liquidation' | 'collateral_topup' | 'deleveraged' | 'withdrawal_skipped'
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

      // Process MonthlyEvent types from app/simulation
      result.events.forEach(event => {
        if (event.type === 'liquidated') {
          events.push({
            month: result.month,
            date: result.dateString,
            eventType: 'liquidation',
            amount: 0,
            description: `Loan ID ${event.id} liquidated`,
            loanId: event.id,
            btcPrice: result.btcPrice
          })
        } else if (event.type === 'collateral_topped_up') {
          events.push({
            month: result.month,
            date: result.dateString,
            eventType: 'collateral_topup',
            amount: event.amount,
            description: `Collateral topped up for loan ID ${event.loanId}`,
            loanId: event.loanId,
            btcPrice: result.btcPrice
          })
        } else if (event.type === 'deleveraged') {
          events.push({
            month: result.month,
            date: result.dateString,
            eventType: 'deleveraged',
            amount: event.amount,
            description: `Deleveraged $${event.amount.toLocaleString()}`,
            btcPrice: result.btcPrice
          })
        } else if (event.type === 'withdrawal_skipped') {
          events.push({
            month: result.month,
            date: result.dateString,
            eventType: 'withdrawal_skipped',
            amount: 0,
            description: `Withdrawal skipped due to risk management`,
            btcPrice: result.btcPrice
          })
        }
      })

      // Infer loan activity from data changes (since no activeLoans array available)
      if (previousResult) {
        const loanCountChange = result.loanCount - previousResult.loanCount
        const newLoanAmount = result.newLoanPrincipal
        const repaymentAmount = result.repaymentsDue

        // Handle repayments first
        if (repaymentAmount > 0) {
          events.push({
            month: result.month,
            date: result.dateString,
            eventType: 'repayment',
            amount: repaymentAmount,
            description: `Loan repayment: $${repaymentAmount.toLocaleString()}`,
            btcPrice: result.btcPrice
          })
        }

        // Handle new loans
        if (newLoanAmount > 0) {
          events.push({
            month: result.month,
            date: result.dateString,
            eventType: 'new_loan',
            amount: newLoanAmount,
            description: `New loan taken: $${newLoanAmount.toLocaleString()}`,
            btcPrice: result.btcPrice
          })
        }
      }
      // First month - check for initial loan
      else if (result.newLoanPrincipal > 0) {
        events.push({
          month: result.month,
          date: result.dateString,
          eventType: 'new_loan',
          amount: result.newLoanPrincipal,
          description: `Initial loan taken: $${result.newLoanPrincipal.toLocaleString()}`,
          btcPrice: result.btcPrice
        })
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
      case 'collateral_topup':
        return 'secondary'
      case 'deleveraged':
        return 'destructive'
      case 'withdrawal_skipped':
        return 'outline'
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
      case 'collateral_topup':
        return 'Collateral Top-up'
      case 'deleveraged':
        return 'Deleveraged'
      case 'withdrawal_skipped':
        return 'Withdrawal Skipped'
      default:
        return 'Unknown'
    }
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Loan History
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs">
                  <p className="font-semibold mb-2">Event Detection Logic:</p>
                  <ul className="text-sm space-y-1">
                    <li><strong>New Loan:</strong> Detected when newLoanPrincipal &gt; 0</li>
                    <li><strong>Rollover:</strong> New loan + repayment in same month</li>
                    <li><strong>Repayment:</strong> repaymentsDue &gt; 0 without new loan</li>
                    <li><strong>Liquidation:</strong> From monthly events</li>
                    <li><strong>Collateral Top-up:</strong> From monthly events</li>
                    <li><strong>Deleveraged:</strong> Risk management forced sale</li>
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
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
    </TooltipProvider>
  )
}
