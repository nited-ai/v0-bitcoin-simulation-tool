"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { AlertTriangle, TrendingDown, Shield, DollarSign, Calendar, Activity } from "lucide-react"
import { useSimulation } from "../../context/SimulationContext"
import type { MonthlyResult, MonthlyEvent } from "../../types/simulation"

interface EventWithContext {
  month: number
  date: string
  event: MonthlyEvent
  btcPrice: number
  ltv: number
  collateralValue: number
  totalDebt: number
}

interface EventSummary {
  type: string
  count: number
  firstOccurrence: number
  lastOccurrence: number
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  icon: React.ComponentType<{ className?: string }>
}

/**
 * Events Analysis Component
 * 
 * Analyzes and displays all simulation events including liquidations,
 * deleveraging, collateral top-ups, and withdrawal skips.
 */
export function EventsAnalysis() {
  const { results } = useSimulation()

  // Extract and contextualize all events
  const eventsWithContext: EventWithContext[] = useMemo(() => {
    if (results.length === 0) return []

    const events: EventWithContext[] = []

    results.forEach((result: MonthlyResult) => {
      const ltv = result.collateralValue > 0 
        ? (result.totalDebt / result.collateralValue) * 100 
        : 0

      result.events.forEach((event: MonthlyEvent) => {
        events.push({
          month: result.month,
          date: result.dateString,
          event,
          btcPrice: result.btcPrice,
          ltv,
          collateralValue: result.collateralValue,
          totalDebt: result.totalDebt,
        })
      })
    })

    return events.sort((a, b) => a.month - b.month)
  }, [results])

  // Summarize events by type
  const eventSummaries: EventSummary[] = useMemo(() => {
    if (eventsWithContext.length === 0) return []

    const summaryMap = new Map<string, EventSummary>()

    eventsWithContext.forEach(({ event, month }) => {
      const type = event.type
      
      if (!summaryMap.has(type)) {
        summaryMap.set(type, {
          type,
          count: 0,
          firstOccurrence: month,
          lastOccurrence: month,
          description: getEventDescription(event),
          severity: getEventSeverity(event),
          icon: getEventIcon(event),
        })
      }

      const summary = summaryMap.get(type)!
      summary.count++
      summary.lastOccurrence = Math.max(summary.lastOccurrence, month)
    })

    return Array.from(summaryMap.values()).sort((a, b) => {
      // Sort by severity first, then by count
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
      return severityDiff !== 0 ? severityDiff : b.count - a.count
    })
  }, [eventsWithContext])

  // Show empty state if no events
  if (eventsWithContext.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Events Analysis
          </CardTitle>
          <CardDescription>
            Timeline and analysis of simulation events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No events occurred during the simulation</p>
              <p className="text-sm mt-2">This indicates a stable simulation with no liquidations or issues</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Events Analysis
        </CardTitle>
        <CardDescription>
          {eventsWithContext.length} events occurred across {results.length} months
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Event Summary */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Event Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {eventSummaries.map((summary, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <summary.icon className="h-4 w-4" />
                    <span className="text-sm font-medium capitalize">
                      {summary.type.replace('_', ' ')}
                    </span>
                  </div>
                  <Badge className={getSeverityBadgeColor(summary.severity)}>
                    {summary.count}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {summary.description}
                </p>
                <div className="text-xs text-muted-foreground">
                  First: Month {summary.firstOccurrence}
                  {summary.count > 1 && ` • Last: Month ${summary.lastOccurrence}`}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Events Timeline */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Events Timeline</h4>
          <div className="h-64 w-full border rounded-lg p-3 overflow-y-auto">
            <div className="space-y-3">
              {eventsWithContext.map((eventContext, index) => (
                <div key={index} className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded">
                  <div className="flex-shrink-0 mt-1">
                    {(() => {
                      const IconComponent = getEventIcon(eventContext.event)
                      return <IconComponent className="h-4 w-4" />
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        Month {eventContext.month}
                      </span>
                      <Badge
                        variant="outline"
                        className={getSeverityBadgeColor(getEventSeverity(eventContext.event))}
                      >
                        {eventContext.event.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {formatEventDetails(eventContext.event)}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>BTC: ${eventContext.btcPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                      <span>LTV: {eventContext.ltv.toFixed(1)}%</span>
                      <span>Debt: ${eventContext.totalDebt.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Event Statistics */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <h4 className="text-sm font-medium mb-3">Event Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Total Events</div>
              <div className="font-medium">{eventsWithContext.length}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Event Types</div>
              <div className="font-medium">{eventSummaries.length}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Critical Events</div>
              <div className="font-medium text-red-600">
                {eventSummaries.filter(s => s.severity === 'critical').reduce((sum, s) => sum + s.count, 0)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Event Rate</div>
              <div className="font-medium">
                {((eventsWithContext.length / results.length) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Helper functions
function getEventDescription(event: MonthlyEvent): string {
  switch (event.type) {
    case 'liquidated':
      return 'Loan was liquidated due to high LTV ratio'
    case 'deleveraged':
      return 'Position was deleveraged to reduce risk'
    case 'collateral_topped_up':
      return 'Additional collateral was added to loan'
    case 'withdrawal_skipped':
      return 'Monthly withdrawal was skipped due to insufficient funds'
    default:
      return 'Unknown event type'
  }
}

function getEventSeverity(event: MonthlyEvent): 'low' | 'medium' | 'high' | 'critical' {
  switch (event.type) {
    case 'liquidated':
      return 'critical'
    case 'deleveraged':
      return 'high'
    case 'collateral_topped_up':
      return 'medium'
    case 'withdrawal_skipped':
      return 'low'
    default:
      return 'low'
  }
}

function getEventIcon(event: MonthlyEvent) {
  switch (event.type) {
    case 'liquidated':
      return AlertTriangle
    case 'deleveraged':
      return TrendingDown
    case 'collateral_topped_up':
      return Shield
    case 'withdrawal_skipped':
      return DollarSign
    default:
      return Activity
  }
}

function getSeverityBadgeColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function formatEventDetails(event: MonthlyEvent): string {
  switch (event.type) {
    case 'liquidated':
      return `Loan ID ${(event as any).id} was liquidated`
    case 'deleveraged':
      return `Deleveraged by $${(event as any).amount?.toLocaleString("en-US", { maximumFractionDigits: 0 }) || 'N/A'}`
    case 'collateral_topped_up':
      return `Added $${(event as any).amount?.toLocaleString("en-US", { maximumFractionDigits: 0 }) || 'N/A'} to loan ${(event as any).loanId}`
    case 'withdrawal_skipped':
      return 'Monthly withdrawal was skipped'
    default:
      return 'Event details not available'
  }
}
