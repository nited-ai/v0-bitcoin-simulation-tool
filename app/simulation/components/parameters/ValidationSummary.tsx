"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AlertTriangle, CheckCircle, Info, XCircle, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { useSimulation } from "../../context/SimulationContext"
import { useParameterValidation, type ValidationError } from "../../hooks/useParameterValidation"
import { getComponentForField } from "./validationFieldMapping"

/**
 * Validation Summary Component
 * 
 * Displays real-time validation feedback for simulation parameters.
 * Shows errors, warnings, and informational messages in a collapsible format.
 */
export function ValidationSummary() {
  const { params } = useSimulation()
  const validation = useParameterValidation(params)
  const [isExpanded, setIsExpanded] = useState(true) // Show details directly without requiring click

  // Filter to only show validation errors that aren't handled by individual components
  const unmappedErrors = validation.errors.filter(error =>
    getComponentForField(error.field as string) === 'ValidationSummary'
  )
  const unmappedWarnings = validation.warnings.filter(warning =>
    getComponentForField(warning.field as string) === 'ValidationSummary'
  )
  const unmappedInfos = validation.infos.filter(info =>
    getComponentForField(info.field as string) === 'ValidationSummary'
  )

  // Don't render if no unmapped issues
  if (unmappedErrors.length === 0 && unmappedWarnings.length === 0 && unmappedInfos.length === 0) {
    return null
  }

  const totalIssues = unmappedErrors.length + unmappedWarnings.length + unmappedInfos.length
  const hasErrors = unmappedErrors.length > 0

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
    <Card className={hasErrors ? "border-red-200" : "border-yellow-200"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              {hasErrors ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              Parameter Validation
            </CardTitle>
            <div className="flex gap-1">
              {unmappedErrors.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unmappedErrors.length} error{unmappedErrors.length !== 1 ? 's' : ''}
                </Badge>
              )}
              {unmappedWarnings.length > 0 && (
                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                  {unmappedWarnings.length} warning{unmappedWarnings.length !== 1 ? 's' : ''}
                </Badge>
              )}
              {unmappedInfos.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {unmappedInfos.length} info
                </Badge>
              )}
            </div>
          </div>
          
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
        
        <CardDescription>
          {hasErrors 
            ? "Please fix the errors below before running the simulation"
            : "Review the warnings and suggestions below"
          }
        </CardDescription>
      </CardHeader>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Unmapped Errors */}
              {unmappedErrors.map((error, index) => (
                <Alert key={`error-${index}`} className={getColorClasses(error.severity)}>
                  {getIcon(error.severity)}
                  <AlertDescription>
                    <span className="font-medium">{error.field}:</span> {error.message}
                  </AlertDescription>
                </Alert>
              ))}

              {/* Unmapped Warnings */}
              {unmappedWarnings.map((warning, index) => (
                <Alert key={`warning-${index}`} className={getColorClasses(warning.severity)}>
                  {getIcon(warning.severity)}
                  <AlertDescription>
                    <span className="font-medium">{warning.field}:</span> {warning.message}
                  </AlertDescription>
                </Alert>
              ))}

              {/* Unmapped Info messages */}
              {unmappedInfos.map((info, index) => (
                <Alert key={`info-${index}`} className={getColorClasses(info.severity)}>
                  {getIcon(info.severity)}
                  <AlertDescription>
                    <span className="font-medium">{info.field}:</span> {info.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Quick Summary when collapsed */}
      {!isExpanded && (
        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {totalIssues} issue{totalIssues !== 1 ? 's' : ''} found
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(true)}
              className="text-xs"
            >
              Show Details
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

/**
 * Compact Validation Indicator
 * 
 * A smaller validation indicator for use in tight spaces
 */
export function ValidationIndicator() {
  const { params } = useSimulation()
  const validation = useParameterValidation(params)

  if (validation.isValid) {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span className="text-xs">Valid</span>
      </div>
    )
  }

  const hasErrors = validation.errors.length > 0

  return (
    <div className={`flex items-center gap-1 ${hasErrors ? 'text-red-600' : 'text-yellow-600'}`}>
      {hasErrors ? (
        <XCircle className="h-4 w-4" />
      ) : (
        <AlertTriangle className="h-4 w-4" />
      )}
      <span className="text-xs">
        {validation.errors.length + validation.warnings.length} issue{validation.errors.length + validation.warnings.length !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
