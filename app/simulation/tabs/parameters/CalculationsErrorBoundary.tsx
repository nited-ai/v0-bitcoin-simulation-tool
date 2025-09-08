"use client"

import React, { Component, ReactNode } from 'react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * Error Boundary for Calculations
 * 
 * Provides graceful error handling for calculation-related components
 * with user-friendly error messages and recovery options.
 */
export class CalculationsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('CalculationsErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Calculation Error
            </CardTitle>
            <CardDescription className="text-red-600">
              An error occurred while performing financial calculations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> {this.state.error?.message || 'Unknown calculation error'}
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button 
                onClick={this.handleRetry}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Calculations
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-red-700">
                  Technical Details (Development Only)
                </summary>
                <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto max-h-40">
                  {this.state.error?.stack}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

/**
 * Hook-based Error Boundary Wrapper
 * 
 * Provides a React hook interface for wrapping components with error boundary protection.
 */
export function useCalculationsErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const ErrorBoundaryWrapper = React.useCallback(({ children }: { children: ReactNode }) => (
    <CalculationsErrorBoundary
      onError={(error) => setError(error)}
      fallback={
        error ? (
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-700 mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Calculation Error</span>
              </div>
              <p className="text-sm text-red-600 mb-4">
                {error.message || 'An error occurred during calculations'}
              </p>
              <Button onClick={resetError} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : null
      }
    >
      {children}
    </CalculationsErrorBoundary>
  ), [error, resetError])

  return {
    ErrorBoundaryWrapper,
    hasError: !!error,
    error,
    resetError
  }
}
