"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Download, FileText, FileJson, FileSpreadsheet, CheckCircle, AlertCircle, Printer, HelpCircle } from "lucide-react"
import { useSimulation } from "../../context/SimulationContext"
import { useResultsExport, type ExportFormat } from "../../hooks/useResultsExport"

/**
 * Results Export Component
 * 
 * Provides export functionality for simulation results in multiple formats
 * including CSV, JSON, and text files with comprehensive data and analysis.
 */
export function ResultsExport() {
  const { results, params } = useSimulation()
  const { exportResults, canExport } = useResultsExport(results, params)
  const [exportStatus, setExportStatus] = useState<{
    format: ExportFormat | null
    status: 'idle' | 'exporting' | 'success' | 'error'
    message?: string
  }>({ format: null, status: 'idle' })

  // Handle export with status tracking
  const handleExport = async (format: ExportFormat) => {
    setExportStatus({ format, status: 'exporting' })

    try {
      // The exportResults function returns a boolean synchronously
      const success = exportResults(format)
      if (success) {
        setExportStatus({
          format,
          status: 'success',
          message: `Successfully exported results as ${format.toUpperCase()}`
        })

        // Reset status after 3 seconds
        setTimeout(() => {
          setExportStatus({ format: null, status: 'idle' })
        }, 3000)
      } else {
        setExportStatus({
          format,
          status: 'error',
          message: 'Export failed. Please try again.'
        })

        // Reset status after 5 seconds for errors
        setTimeout(() => {
          setExportStatus({ format: null, status: 'idle' })
        }, 5000)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed due to an error.'
      setExportStatus({
        format,
        status: 'error',
        message: errorMessage
      })

      // Reset status after 5 seconds for errors
      setTimeout(() => {
        setExportStatus({ format: null, status: 'idle' })
      }, 5000)

      console.error('Export failed:', error)
    }
  }

  // Handle print
  const handlePrint = () => {
    window.print()
  }

  // Export options configuration
  const exportOptions = [
    {
      format: 'csv' as ExportFormat,
      name: 'CSV Spreadsheet',
      description: 'Excel-compatible format with monthly data and summary',
      icon: FileSpreadsheet,
      recommended: true,
    },
    {
      format: 'json' as ExportFormat,
      name: 'JSON Data',
      description: 'Structured data format for developers and analysis tools',
      icon: FileJson,
      recommended: false,
    },
    {
      format: 'txt' as ExportFormat,
      name: 'Text Report',
      description: 'Human-readable summary report with key metrics',
      icon: FileText,
      recommended: false,
    },
  ]

  // Show empty state if no results
  if (!canExport()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Results
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <div className="space-y-2">
                    <p className="font-medium">Export Options Explained:</p>
                    <ul className="text-sm space-y-1">
                      <li><strong>CSV:</strong> Excel-compatible spreadsheet with all monthly data, calculations, and summary metrics. Perfect for further analysis.</li>
                      <li><strong>JSON:</strong> Complete structured data including metadata, parameters, and results. Ideal for developers and data analysis tools.</li>
                      <li><strong>TXT:</strong> Human-readable report with key metrics and summary. Great for sharing or documentation.</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                      All exports include your simulation parameters, monthly results, and performance analysis.
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
          <CardDescription>
            Export your simulation results in various formats for analysis, sharing, or record-keeping
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <Download className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Run a simulation to enable export options</p>
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
          <Download className="h-5 w-5" />
          Export Results
        </CardTitle>
        <CardDescription>
          Export your simulation results with {results.length} months of data
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Export Status */}
        {exportStatus.status !== 'idle' && (
          <Alert className={
            exportStatus.status === 'success' ? 'border-green-200 bg-green-50' :
            exportStatus.status === 'error' ? 'border-red-200 bg-red-50' :
            'border-blue-200 bg-blue-50'
          }>
            {exportStatus.status === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : exportStatus.status === 'error' ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : (
              <Download className="h-4 w-4 text-blue-600" />
            )}
            <AlertDescription>
              {exportStatus.message || `Exporting as ${exportStatus.format?.toUpperCase()}...`}
            </AlertDescription>
          </Alert>
        )}

        {/* Export Options */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Export Formats</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {exportOptions.map((option) => (
              <div key={option.format} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <option.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{option.name}</span>
                  </div>
                  {option.recommended && (
                    <Badge variant="secondary" className="text-xs">
                      Recommended
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {option.description}
                </p>
                <Button
                  onClick={() => handleExport(option.format)}
                  disabled={exportStatus.status === 'exporting' && exportStatus.format === option.format}
                  size="sm"
                  className="w-full"
                  variant={option.recommended ? "default" : "outline"}
                >
                  {exportStatus.status === 'exporting' && exportStatus.format === option.format ? (
                    <>
                      <Download className="h-3 w-3 mr-2 animate-pulse" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3 mr-2" />
                      Export {option.format.toUpperCase()}
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Print Option */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Print Options</h4>
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Printer className="h-4 w-4" />
                  <span className="text-sm font-medium">Print Results</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Print-friendly version of your simulation results and charts
                </p>
              </div>
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="h-3 w-3 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </div>

        {/* Export Information */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <h4 className="text-sm font-medium mb-2">What's Included</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium mb-1">Simulation Data:</div>
              <ul className="text-muted-foreground space-y-1">
                <li>• Monthly results ({results.length} months)</li>
                <li>• Portfolio values and debt levels</li>
                <li>• BTC prices and amounts</li>
                <li>• Loan details and events</li>
              </ul>
            </div>
            <div>
              <div className="font-medium mb-1">Analysis & Metrics:</div>
              <ul className="text-muted-foreground space-y-1">
                <li>• Performance summary</li>
                <li>• Risk assessment</li>
                <li>• Return calculations</li>
                <li>• Simulation parameters</li>
              </ul>
            </div>
          </div>
        </div>

        {/* File Information */}
        <div className="text-xs text-muted-foreground">
          <p>
            <strong>File naming:</strong> Files are automatically named with the current date 
            (e.g., bitcoin-simulation-2024-01-15.csv)
          </p>
          <p className="mt-1">
            <strong>Data privacy:</strong> All exports are generated locally in your browser. 
            No data is sent to external servers.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
