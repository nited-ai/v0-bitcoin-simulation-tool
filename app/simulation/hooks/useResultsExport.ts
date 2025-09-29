import { useCallback } from "react"
import type { MonthlyResult, SimulationParams } from "../types/simulation"
import { useResultsAnalysis } from "./useResultsAnalysis"

/**
 * Export format options
 */
export type ExportFormat = 'csv' | 'json' | 'txt'

/**
 * Export data structure
 */
export interface ExportData {
  metadata: {
    exportDate: string
    simulationParams: Partial<SimulationParams>
    totalMonths: number
    btcAmount: number
    initialBtcPrice: number
  }
  summary: {
    finalPortfolioValue: number
    finalNetWorth: number
    totalReturn: number
    totalReturnPercent: number
    annualizedReturn: number
    maxDrawdown: number
    maxDrawdownPercent: number
    liquidationCount: number
    riskLevel: string
    performanceRating: string
  }
  monthlyResults: MonthlyResult[]
}

/**
 * Hook for exporting simulation results in various formats
 * 
 * Provides functionality to export simulation data as CSV, JSON, or text files
 * with comprehensive metadata and analysis results.
 */
export function useResultsExport(results: MonthlyResult[], params: SimulationParams) {
  const analysis = useResultsAnalysis(results, params)

  /**
   * Prepare export data with metadata and analysis
   */
  const prepareExportData = useCallback((): ExportData | null => {
    if (!analysis || results.length === 0) return null

    return {
      metadata: {
        exportDate: new Date().toISOString(),
        simulationParams: {
          initialBtcAmount: params.initialBtcAmount,
          initialBtcPrice: params.initialBtcPrice,
          monthlyWithdrawalAmount: params.monthlyWithdrawalAmount,
          simulationMonths: params.simulationMonths,
          annualInterestRate: params.annualInterestRate,
          loanTermMonths: params.loanTermMonths,
          investmentStrategy: params.investmentStrategy,
          riskLevel: params.riskLevel,
          platform: params.platform,
        },
        totalMonths: results.length,
        btcAmount: params.initialBtcAmount,
        initialBtcPrice: params.initialBtcPrice,
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
        performanceRating: analysis.performanceRating,
      },
      monthlyResults: results,
    }
  }, [analysis, results, params])

  /**
   * Convert data to CSV format
   */
  const exportToCSV = useCallback(() => {
    const exportData = prepareExportData()
    if (!exportData) return null

    // CSV Headers
    const headers = [
      'Month',
      'Date',
      'BTC Price',
      'Portfolio Value',
      'Total Debt',
      'Net Worth',
      'Current BTC Amount',
      'Free BTC',
      'Locked BTC',
      'Loan Count',
      'Highest LTV',
      'New Loan Principal',
      'Repayments Due',
      'Withdrawal Amount',
      'Reinvestment',
      'Events'
    ]

    // Convert results to CSV rows
    const rows = exportData.monthlyResults.map(result => [
      result.month,
      result.dateString || result.date,
      result.btcPrice,
      result.collateralValue,
      result.totalDebt,
      result.collateralValue - result.totalDebt,
      (result.currentBtcAmount || result.totalBtcAmount || 0).toFixed(8),
      (result.freeBtc || 0).toFixed(8),
      (result.lockedBtc || (result.activeLoans?.reduce((sum, loan) => sum + loan.lockedBtc, 0) || 0)).toFixed(8),
      result.loanCount || result.activeLoans?.length || 0,
      result.highestLtv.toFixed(2),
      result.newLoanPrincipal || result.principalForNeeds || result.principalForReinvestment || 0,
      result.repaymentsDue || result.repaymentDue || 0,
      result.withdrawalAmount || result.monthlyWithdrawal || 0,
      result.reinvestment || result.principalForReinvestment || 0,
      result.events.map(e => e.type).join('; ')
    ])

    // Add summary information at the top
    const summaryRows = [
      ['=== SIMULATION SUMMARY ==='],
      ['Export Date', exportData.metadata.exportDate],
      ['BTC Amount', exportData.metadata.btcAmount],
      ['Initial BTC Price', exportData.metadata.initialBtcPrice],
      ['Simulation Months', exportData.metadata.totalMonths],
      ['Investment Strategy', exportData.metadata.simulationParams.investmentStrategy],
      ['Risk Level', exportData.metadata.simulationParams.riskLevel],
      [''],
      ['=== PERFORMANCE METRICS ==='],
      ['Final Portfolio Value', exportData.summary.finalPortfolioValue],
      ['Final Net Worth', exportData.summary.finalNetWorth],
      ['Total Return', `${exportData.summary.totalReturnPercent.toFixed(2)}%`],
      ['Annualized Return', `${exportData.summary.annualizedReturn.toFixed(2)}%`],
      ['Max Drawdown', `${exportData.summary.maxDrawdownPercent.toFixed(2)}%`],
      ['Liquidation Count', exportData.summary.liquidationCount],
      ['Risk Level', exportData.summary.riskLevel],
      ['Performance Rating', exportData.summary.performanceRating],
      [''],
      ['=== MONTHLY RESULTS ==='],
      headers
    ]

    // Combine all rows
    const allRows = [...summaryRows, ...rows]

    // Convert to CSV string
    const csvContent = allRows
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    return csvContent
  }, [prepareExportData])

  /**
   * Convert data to JSON format
   */
  const exportToJSON = useCallback(() => {
    const exportData = prepareExportData()
    if (!exportData) return null

    return JSON.stringify(exportData, null, 2)
  }, [prepareExportData])

  /**
   * Convert data to readable text format
   */
  const exportToText = useCallback(() => {
    const exportData = prepareExportData()
    if (!exportData) return null

    const lines = [
      '='.repeat(60),
      'BITCOIN SIMULATION RESULTS',
      '='.repeat(60),
      '',
      'SIMULATION PARAMETERS:',
      '-'.repeat(30),
      `Export Date: ${new Date(exportData.metadata.exportDate).toLocaleString()}`,
      `BTC Amount: ${exportData.metadata.btcAmount} BTC`,
      `Initial BTC Price: $${exportData.metadata.initialBtcPrice.toLocaleString()}`,
      `Simulation Length: ${exportData.metadata.totalMonths} months`,
      `Investment Strategy: ${exportData.metadata.simulationParams.investmentStrategy}`,
      `Risk Level: ${exportData.metadata.simulationParams.riskLevel}`,
      `Monthly Withdrawal: $${exportData.metadata.simulationParams.monthlyWithdrawalAmount?.toLocaleString() || 'N/A'}`,
      '',
      'PERFORMANCE SUMMARY:',
      '-'.repeat(30),
      `Final Portfolio Value: $${exportData.summary.finalPortfolioValue.toLocaleString()}`,
      `Final Net Worth: $${exportData.summary.finalNetWorth.toLocaleString()}`,
      `Total Return: ${exportData.summary.totalReturnPercent.toFixed(2)}%`,
      `Annualized Return: ${exportData.summary.annualizedReturn.toFixed(2)}%`,
      `Maximum Drawdown: ${exportData.summary.maxDrawdownPercent.toFixed(2)}%`,
      `Liquidation Events: ${exportData.summary.liquidationCount}`,
      `Risk Assessment: ${exportData.summary.riskLevel.toUpperCase()}`,
      `Performance Rating: ${exportData.summary.performanceRating.toUpperCase()}`,
      '',
      'MONTHLY RESULTS:',
      '-'.repeat(30),
    ]

    // Add monthly results summary
    exportData.monthlyResults.forEach((result, index) => {
      if (index < 5 || index >= exportData.monthlyResults.length - 5) {
        lines.push(
          `Month ${result.month}: BTC $${result.btcPrice.toLocaleString()}, ` +
          `Portfolio $${result.collateralValue.toLocaleString()}, ` +
          `Debt $${result.totalDebt.toLocaleString()}, ` +
          `LTV ${result.highestLtv.toFixed(1)}%`
        )
      } else if (index === 5) {
        lines.push('... (middle months omitted) ...')
      }
    })

    lines.push('')
    lines.push('='.repeat(60))
    lines.push('End of Report')

    return lines.join('\n')
  }, [prepareExportData])

  /**
   * Download file with given content and filename
   */
  const downloadFile = useCallback((content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
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
  const exportResults = useCallback((format: ExportFormat) => {
    const timestamp = new Date().toISOString().split('T')[0]
    const baseFilename = `bitcoin-simulation-${timestamp}`

    switch (format) {
      case 'csv': {
        const csvContent = exportToCSV()
        if (csvContent) {
          downloadFile(csvContent, `${baseFilename}.csv`, 'text/csv')
          return true
        }
        break
      }
      case 'json': {
        const jsonContent = exportToJSON()
        if (jsonContent) {
          downloadFile(jsonContent, `${baseFilename}.json`, 'application/json')
          return true
        }
        break
      }
      case 'txt': {
        const textContent = exportToText()
        if (textContent) {
          downloadFile(textContent, `${baseFilename}.txt`, 'text/plain')
          return true
        }
        break
      }
    }
    return false
  }, [exportToCSV, exportToJSON, exportToText, downloadFile])

  /**
   * Check if export is available
   */
  const canExport = useCallback(() => {
    return results.length > 0 && analysis !== null
  }, [results.length, analysis])

  return {
    exportResults,
    canExport,
    prepareExportData,
    exportToCSV,
    exportToJSON,
    exportToText,
  }
}
