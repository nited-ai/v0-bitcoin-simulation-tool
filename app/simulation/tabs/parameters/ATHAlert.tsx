"use client"

import React, { useMemo, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react"
import { usePriceData } from "@/src/modules/price-data/hooks/usePriceData"
import { CalculationsService } from "./calculationsService"
import { useLocaleNumberFormat } from "@/shared/utils/localeNumberFormat"

interface ATHAlertProps {
  className?: string
}

/**
 * ATH Alert Component
 *
 * Displays current Bitcoin price distance from ATH using shadcn Alert component.
 * Shows risk-based color coding and appropriate messaging for loan decisions.
 * Placed above the risk level selector cards.
 *
 * **Note**: This component now relies on DataServiceProvider for data initialization.
 * The provider ensures current price data is available before this component renders.
 */
export function ATHAlert({ className = "" }: ATHAlertProps) {
  const { t } = useTranslation()
  const { ath, currentPrice: currentPriceData, isLoading, error } = usePriceData()
  const currentATH = ath?.value ?? 0
  const athLoading = isLoading
  const athError = error
  const calculationsService = useMemo(() => new CalculationsService(), [])
  const { formatCurrency, formatNumber } = useLocaleNumberFormat()

  // Get actual current Bitcoin price from centralized data service
  // Use realistic fallback if data not yet available
  const currentPrice = currentPriceData?.value || 114209

  // Calculate ATH distance metrics
  const athDistanceMetrics = useMemo(() => {
    return calculationsService.calculateATHDistance(currentPrice, currentATH)
  }, [calculationsService, currentPrice, currentATH])

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
        <AlertTitle>{t('ATHAlert.errorTitle', 'Could not load ATH data')}</AlertTitle>
        <AlertDescription>
          {t('ATHAlert.errorDescription', 'Try refreshing the page. The cron heartbeat is checking for updates.')}
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
                  {formatNumber(athDistanceMetrics.distancePercent, { decimals: 1 })}%
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
