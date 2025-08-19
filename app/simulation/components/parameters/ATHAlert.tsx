"use client"

import { useMemo } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react"
import { useATH } from "../../hooks/useATH"
import { CalculationsService } from "./calculationsService"

interface ATHAlertProps {
  currentPrice: number
  className?: string
}

/**
 * ATH Alert Component
 * 
 * Displays current Bitcoin price distance from ATH using shadcn Alert component.
 * Shows risk-based color coding and appropriate messaging for loan decisions.
 * Placed above the risk level selector cards.
 */
export function ATHAlert({ currentPrice, className = "" }: ATHAlertProps) {
  const { ath: currentATH, loading: athLoading, error: athError } = useATH()
  const calculationsService = useMemo(() => new CalculationsService(), [])

  // Calculate ATH distance metrics
  const athDistanceMetrics = useMemo(() => {
    return calculationsService.calculateATHDistance(currentPrice, currentATH)
  }, [calculationsService, currentPrice, currentATH])

  // Format currency with proper separators
  const formatCurrency = (value: number, decimals: number = 0) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  }

  // Format percentage
  const formatPercentage = (value: number, decimals: number = 1) => {
    return `${value.toFixed(decimals)}%`
  }

  // Get appropriate icon based on risk level with color styling
  const getRiskIcon = () => {
    switch (athDistanceMetrics.riskLevel) {
      case 'low':
        return <CheckCircle2 className="h-4 w-4" style={{ color: athDistanceMetrics.riskColor }} />
      case 'medium':
        return <AlertTriangle className="h-4 w-4" style={{ color: athDistanceMetrics.riskColor }} />
      case 'high':
        return <AlertOctagon className="h-4 w-4" style={{ color: athDistanceMetrics.riskColor }} />
      default:
        return <AlertTriangle className="h-4 w-4" style={{ color: athDistanceMetrics.riskColor }} />
    }
  }

  // Get risk level label
  const getRiskLabel = () => {
    switch (athDistanceMetrics.riskLevel) {
      case 'low':
        return 'Lower Risk'
      case 'medium':
        return 'Medium Risk'
      case 'high':
        return 'Higher Risk'
      default:
        return 'Medium Risk'
    }
  }

  // Handle loading and error states
  if (athLoading) {
    return (
      <Alert className={`bg-transparent border-border ${className}`}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Loading ATH data...</AlertTitle>
        <AlertDescription>
          Fetching current All-Time High information
        </AlertDescription>
      </Alert>
    )
  }

  if (athError) {
    return (
      <Alert className={`bg-transparent border-border ${className}`}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>
          <span style={{ color: athDistanceMetrics.riskColor, fontWeight: 'medium' }}>
            {getRiskLabel()}:
          </span>{' '}
          Current price is{' '}
          <span style={{ color: athDistanceMetrics.riskColor }}>
            {formatPercentage(athDistanceMetrics.distancePercent)}
          </span>
          {' '}/{' '}
          <span style={{ color: athDistanceMetrics.riskColor }}>
            {formatCurrency(athDistanceMetrics.distanceUSD)}
          </span>
          {' '}below ATH of{' '}
          <span style={{ color: athDistanceMetrics.riskColor }}>
            {formatCurrency(124277.98)}
          </span>
        </AlertTitle>
        <AlertDescription>
          Using fallback ATH data. {athDistanceMetrics.riskDescription}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className={`bg-transparent border-border ${className}`}>
      {getRiskIcon()}
      <AlertTitle>
        <span style={{ color: athDistanceMetrics.riskColor, fontWeight: 'medium' }}>
          {getRiskLabel()}:
        </span>{' '}
        Current price is{' '}
        <span style={{ color: athDistanceMetrics.riskColor }}>
          {formatPercentage(athDistanceMetrics.distancePercent)}
        </span>
        {' '}/{' '}
        <span style={{ color: athDistanceMetrics.riskColor }}>
          {formatCurrency(athDistanceMetrics.distanceUSD)}
        </span>
        {' '}below ATH of{' '}
        <span style={{ color: athDistanceMetrics.riskColor }}>
          {formatCurrency(currentATH)}
        </span>
      </AlertTitle>
      <AlertDescription>
        {athDistanceMetrics.riskDescription}
      </AlertDescription>
    </Alert>
  )
}
