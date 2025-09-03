"use client"

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
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
  const { t } = useTranslation()
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
        return t('ATHAlert.lowerRisk', 'Lower Risk')
      case 'medium':
        return t('ATHAlert.mediumRisk', 'Medium Risk')
      case 'high':
        return t('ATHAlert.higherRisk', 'Higher Risk')
      default:
        return t('ATHAlert.mediumRisk', 'Medium Risk')
    }
  }

  // Get the appropriate relationship text (below/at new ATH)
  const getATHRelationship = () => {
    const actualDistancePercent = currentATH > 0 ? ((currentATH - currentPrice) / currentATH) * 100 : 0

    if (actualDistancePercent <= 0) {
      // Price is at or above ATH - this becomes the new ATH
      return t('ATHAlert.atNewAth', 'at new ATH of')
    } else {
      // Price is below ATH
      return t('ATHAlert.belowAthOf', 'below ATH of')
    }
  }

  // Handle loading and error states
  if (athLoading) {
    return (
      <Alert className={`bg-transparent border-border ${className}`}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t('ATHAlert.loadingTitle', 'Loading ATH data...')}</AlertTitle>
        <AlertDescription>
          {t('ATHAlert.loadingDescription', 'Fetching current All-Time High information')}
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
          {t('ATHAlert.currentPriceIs', 'Current price is')}{' '}
          {(() => {
            const fallbackATH = 124277.98
            const actualDistancePercent = fallbackATH > 0 ? ((fallbackATH - currentPrice) / fallbackATH) * 100 : 0
            if (actualDistancePercent <= 0) {
              // At or above ATH - show as new ATH
              return (
                <>
                  {getATHRelationship()}{' '}
                  <span style={{ color: athDistanceMetrics.riskColor }}>
                    {formatCurrency(currentPrice)}
                  </span>
                </>
              )
            } else {
              // Below ATH - show distance
              return (
                <>
                  <span style={{ color: athDistanceMetrics.riskColor }}>
                    {formatPercentage(athDistanceMetrics.distancePercent)}
                  </span>
                  {' '}/{' '}
                  <span style={{ color: athDistanceMetrics.riskColor }}>
                    {formatCurrency(athDistanceMetrics.distanceUSD)}
                  </span>
                  {' '}{getATHRelationship()}{' '}
                  <span style={{ color: athDistanceMetrics.riskColor }}>
                    {formatCurrency(fallbackATH)}
                  </span>
                </>
              )
            }
          })()}
        </AlertTitle>
        <AlertDescription>
          {t('ATHAlert.fallbackDataNotice', 'Using fallback ATH data.')} {t(`ATHAlert.riskDescriptions.${athDistanceMetrics.riskLevel}`, athDistanceMetrics.riskDescription)}
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
        {t('ATHAlert.currentPriceIs', 'Current price is')}{' '}
        {(() => {
          const actualDistancePercent = currentATH > 0 ? ((currentATH - currentPrice) / currentATH) * 100 : 0
          if (actualDistancePercent <= 0) {
            // At or above ATH - show as new ATH
            return (
              <>
                {getATHRelationship()}{' '}
                <span style={{ color: athDistanceMetrics.riskColor }}>
                  {formatCurrency(currentPrice)}
                </span>
              </>
            )
          } else {
            // Below ATH - show distance
            return (
              <>
                <span style={{ color: athDistanceMetrics.riskColor }}>
                  {formatPercentage(athDistanceMetrics.distancePercent)}
                </span>
                {' '}/{' '}
                <span style={{ color: athDistanceMetrics.riskColor }}>
                  {formatCurrency(athDistanceMetrics.distanceUSD)}
                </span>
                {' '}{getATHRelationship()}{' '}
                <span style={{ color: athDistanceMetrics.riskColor }}>
                  {formatCurrency(currentATH)}
                </span>
              </>
            )
          }
        })()}
      </AlertTitle>
      <AlertDescription>
        {t(`ATHAlert.riskDescriptions.${athDistanceMetrics.riskLevel}`, athDistanceMetrics.riskDescription)}
      </AlertDescription>
    </Alert>
  )
}
