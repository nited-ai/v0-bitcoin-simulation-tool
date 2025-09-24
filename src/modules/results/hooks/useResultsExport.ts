/**
 * Results Export Hook
 * 
 * React hook for exporting simulation results in various formats.
 * Provides functionality to export data as CSV, JSON, TXT, or PDF files.
 */

import { useState, useCallback } from "react"
import { resultsAnalysisService } from "../services/ResultsAnalysisService"
import type { 
  ExportFormat, 
  ExportData, 
  ResultsAnalysis,
  MonthlyResult
} from "../types"

/**
 * Export status
 */
interface ExportStatus {
  format: ExportFormat | null
  status: 'idle' | 'exporting' | 'success' | 'error'
  message?: string
}

/**
 * Hook parameters
 */
interface UseResultsExportParams {
  results: MonthlyResult[]
  analysis?: ResultsAnalysis
  simulationParams?: Record<string, any>
}

/**
 * Hook return type
 */
interface UseResultsExportReturn {
  exportStatus: ExportStatus
  exportResults: (format: ExportFormat) => Promise<boolean>
  prepareExportData: () => ExportData | null
  downloadFile: (data: string, filename: string, mimeType: string) => void
  isExporting: boolean
  canExport: boolean
}

/**
 * Hook for exporting simulation results
 */
export function useResultsExport({
  results,
  analysis,
  simulationParams = {}
}: UseResultsExportParams): UseResultsExportReturn {
  
  const [exportStatus, setExportStatus] = useState<ExportStatus>({
    format: null,
    status: 'idle'
  })

  /**
   * Prepare export data with metadata and analysis
   */
  const prepareExportData = useCallback((): ExportData | null => {
    if (!analysis || results.length === 0) return null

    const exportData: ExportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        simulationParams,
        totalMonths: results.length,
        btcAmount: results[0]?.totalBtcAmount || 0,
        initialBtcPrice: results[0]?.btcPrice || 0,
        strategyUsed: simulationParams.investmentStrategy || 'Unknown'
      },
      summary: {
        finalPortfolioValue: analysis.finalPortfolioValue,
        finalNetWorth: analysis.finalNetWorth,
        totalReturn: analysis.totalReturn,
        totalReturnPercent: analysis.totalReturnPercent,
        annualizedReturn: analysis.annualizedReturn,
        maxDrawdown: analysis.maxDrawdown,
        maxDrawdownPercent: analysis.maxDrawdownPercent,
        liquidationCount: analysis.liquidationCount,
        riskLevel: analysis.riskLevel,
        performanceRating: analysis.performanceRating
      },
      monthlyResults: results,
      analysis
    }

    return exportData
  }, [results, analysis, simulationParams])

  /**
   * Convert data to CSV format
   */
  const convertToCSV = useCallback((data: ExportData): string => {
    const headers = [
      'Month',
      'Date',
      'BTC Price',
      'BTC Amount',
      'Portfolio Value',
      'Total Debt',
      'Net Worth',
      'LTV (%)',
      'Monthly Withdrawal',
      'Principal for Needs',
      'Principal for Reinvestment',
      'Active Loans',
      'Repayment Due',
      'Events'
    ]

    const csvRows = [
      headers.join(','),
      ...data.monthlyResults.map(result => [
        result.month,
        result.date,
        result.btcPrice.toFixed(2),
        result.totalBtcAmount.toFixed(8),
        result.collateralValue.toFixed(2),
        result.totalDebt.toFixed(2),
        (result.collateralValue - result.totalDebt).toFixed(2),
        result.ltv.toFixed(2),
        result.monthlyWithdrawal.toFixed(2),
        result.principalForNeeds.toFixed(2),
        result.principalForReinvestment.toFixed(2),
        result.activeLoans.length,
        result.repaymentDue.toFixed(2),
        result.events.map(e => e.type).join(';')
      ].join(','))
    ]

    return csvRows.join('\n')
  }, [])

  /**
   * Convert data to JSON format
   */
  const convertToJSON = useCallback((data: ExportData): string => {
    return JSON.stringify(data, null, 2)
  }, [])

  /**
   * Convert data to text format
   */
  const convertToTXT = useCallback((data: ExportData): string => {
    const lines = [
      '='.repeat(60),
      'BITCOIN SIMULATION RESULTS',
      '='.repeat(60),
      '',
      'METADATA:',
      `---------`,
      `Export Date: ${data.metadata.exportDate}`,
      `Strategy Used: ${data.metadata.strategyUsed}`,
      `Total Months: ${data.metadata.totalMonths}`,
      `Initial BTC Amount: ${data.metadata.btcAmount.toFixed(8)} BTC`,
      `Initial BTC Price: $${data.metadata.initialBtcPrice.toFixed(2)}`,
      '',
      'SUMMARY:',
      '--------',
      `Final Portfolio Value: $${data.summary.finalPortfolioValue.toLocaleString()}`,
      `Final Net Worth: $${data.summary.finalNetWorth.toLocaleString()}`,
      `Total Return: $${data.summary.totalReturn.toLocaleString()} (${data.summary.totalReturnPercent.toFixed(2)}%)`,
      `Annualized Return: ${(data.summary.annualizedReturn * 100).toFixed(2)}%`,
      `Maximum Drawdown: $${data.summary.maxDrawdown.toLocaleString()} (${data.summary.maxDrawdownPercent.toFixed(2)}%)`,
      `Liquidation Count: ${data.summary.liquidationCount}`,
      `Risk Level: ${data.summary.riskLevel}`,
      `Performance Rating: ${data.summary.performanceRating}`,
      '',
      'MONTHLY RESULTS:',
      '---------------',
      'Month | Date       | BTC Price | Portfolio Value | Total Debt | LTV%  | Events',
      '-'.repeat(80)
    ]

    data.monthlyResults.forEach(result => {
      const events = result.events.map(e => e.type).join(', ') || 'None'
      lines.push(
        `${result.month.toString().padStart(5)} | ${result.date} | $${result.btcPrice.toFixed(2).padStart(8)} | $${result.collateralValue.toFixed(0).padStart(13)} | $${result.totalDebt.toFixed(0).padStart(9)} | ${result.ltv.toFixed(1).padStart(4)} | ${events}`
      )
    })

    return lines.join('\n')
  }, [])

  /**
   * Download file to user's device
   */
  const downloadFile = useCallback((data: string, filename: string, mimeType: string) => {
    const blob = new Blob([data], { type: mimeType })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  }, [])

  /**
   * Export results in specified format
   */
  const exportResults = useCallback(async (format: ExportFormat): Promise<boolean> => {
    setExportStatus({ format, status: 'exporting' })

    try {
      const exportData = prepareExportData()
      if (!exportData) {
        throw new Error('No data available for export')
      }

      let fileContent: string
      let filename: string
      let mimeType: string

      const timestamp = new Date().toISOString().split('T')[0]
      const baseFilename = `bitcoin-simulation-${timestamp}`

      switch (format) {
        case 'csv':
          fileContent = convertToCSV(exportData)
          filename = `${baseFilename}.csv`
          mimeType = 'text/csv'
          break

        case 'json':
          fileContent = convertToJSON(exportData)
          filename = `${baseFilename}.json`
          mimeType = 'application/json'
          break

        case 'txt':
          fileContent = convertToTXT(exportData)
          filename = `${baseFilename}.txt`
          mimeType = 'text/plain'
          break

        case 'pdf':
          // PDF export would require additional library (e.g., jsPDF)
          throw new Error('PDF export not yet implemented')

        default:
          throw new Error(`Unsupported export format: ${format}`)
      }

      // Download the file
      downloadFile(fileContent, filename, mimeType)

      setExportStatus({
        format,
        status: 'success',
        message: `Successfully exported results as ${format.toUpperCase()}`
      })

      // Reset status after 3 seconds
      setTimeout(() => {
        setExportStatus({ format: null, status: 'idle' })
      }, 3000)

      return true

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed'
      
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
      return false
    }
  }, [prepareExportData, convertToCSV, convertToJSON, convertToTXT, downloadFile])

  const isExporting = exportStatus.status === 'exporting'
  const canExport = results.length > 0 && analysis !== undefined

  return {
    exportStatus,
    exportResults,
    prepareExportData,
    downloadFile,
    isExporting,
    canExport
  }
}
