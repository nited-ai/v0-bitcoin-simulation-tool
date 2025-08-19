"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, XCircle, Info } from "lucide-react"
import { useSimulation } from "../../context/SimulationContext"
import { useParameterValidation, type ValidationError } from "../../hooks/useParameterValidation"

interface ValidationAlertProps {
  /** Field name(s) to show validation for */
  fields: string | string[]
  /** Optional severity filter - if not provided, shows all severities */
  severity?: 'error' | 'warning' | 'info'
  /** Optional className for styling */
  className?: string
}

/**
 * ValidationAlert Component
 * 
 * Displays validation errors/warnings for specific fields directly in the component
 * where they belong. Non-dismissible - alerts disappear when issues are fixed.
 */
export function ValidationAlert({ fields, severity, className = "" }: ValidationAlertProps) {
  const { params } = useSimulation()
  const validation = useParameterValidation(params)

  // Normalize fields to array
  const fieldArray = Array.isArray(fields) ? fields : [fields]

  // Filter validation results to only include specified fields
  const relevantErrors = validation.errors.filter(error => 
    fieldArray.includes(error.field as string)
  )
  const relevantWarnings = validation.warnings.filter(warning => 
    fieldArray.includes(warning.field as string)
  )
  const relevantInfos = validation.infos.filter(info => 
    fieldArray.includes(info.field as string)
  )

  // Apply severity filter if specified
  let alertsToShow: ValidationError[] = []
  if (!severity) {
    // Show all severities
    alertsToShow = [...relevantErrors, ...relevantWarnings, ...relevantInfos]
  } else if (severity === 'error') {
    alertsToShow = relevantErrors
  } else if (severity === 'warning') {
    alertsToShow = relevantWarnings
  } else if (severity === 'info') {
    alertsToShow = relevantInfos
  }

  // Don't render if no relevant alerts
  if (alertsToShow.length === 0) {
    return null
  }

  /**
   * Get icon for validation error type
   */
  const getIcon = (severity: ValidationError['severity']) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  /**
   * Get color classes for validation error type
   */
  const getColorClasses = (severity: ValidationError['severity']) => {
    switch (severity) {
      case 'error':
        return "border-red-200 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-200"
      case 'warning':
        return "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-200"
      case 'info':
        return "border-blue-200 bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-200"
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {alertsToShow.map((alert, index) => (
        <Alert key={`${alert.field}-${alert.severity}-${index}`} className={getColorClasses(alert.severity)}>
          {getIcon(alert.severity)}
          <AlertDescription>
            {alert.message}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  )
}

/**
 * Hook for checking if specific fields have validation issues
 * Useful for conditional rendering or styling
 */
export function useFieldValidationStatus(fields: string | string[]) {
  const { params } = useSimulation()
  const validation = useParameterValidation(params)

  const fieldArray = Array.isArray(fields) ? fields : [fields]

  const hasErrors = validation.errors.some(error => 
    fieldArray.includes(error.field as string)
  )
  const hasWarnings = validation.warnings.some(warning => 
    fieldArray.includes(warning.field as string)
  )
  const hasInfos = validation.infos.some(info => 
    fieldArray.includes(info.field as string)
  )

  return {
    hasErrors,
    hasWarnings,
    hasInfos,
    hasAnyIssues: hasErrors || hasWarnings || hasInfos,
    errorCount: validation.errors.filter(error => fieldArray.includes(error.field as string)).length,
    warningCount: validation.warnings.filter(warning => fieldArray.includes(warning.field as string)).length,
    infoCount: validation.infos.filter(info => fieldArray.includes(info.field as string)).length
  }
}
