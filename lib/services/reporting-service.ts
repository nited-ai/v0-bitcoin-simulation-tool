import type { 
  HardcodedString, 
  ValidationResult,
  HardcodedStringsReport,
  ValidationReport,
  ProgressReport,
  ReportStatistics,
  TrendAnalysis,
  DetectionType
} from './types/localization'

/**
 * Comprehensive reporting service for localization analysis
 */
export class ReportingService {
  private fileWriter?: (path: string, content: string) => Promise<void>

  /**
   * Generate comprehensive hardcoded strings report
   */
  generateHardcodedStringsReport(strings: HardcodedString[]): HardcodedStringsReport {
    const byType: Record<string, number> = {}
    const byFile: Record<string, number> = {}
    const scannedFiles = new Set<string>()

    for (const string of strings) {
      byType[string.type] = (byType[string.type] || 0) + 1
      byFile[string.filePath] = (byFile[string.filePath] || 0) + 1
      scannedFiles.add(string.filePath)
    }

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalStrings: strings.length,
        scannedFiles: scannedFiles.size
      },
      summary: {
        totalStrings: strings.length,
        byType,
        byFile
      },
      strings
    }
  }

  /**
   * Generate validation report
   */
  generateValidationReport(result: ValidationResult): ValidationReport {
    const errorsByType: Record<string, number> = {}
    const warningsByType: Record<string, number> = {}

    for (const error of result.errors) {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1
    }

    for (const warning of result.warnings) {
      warningsByType[warning.type] = (warningsByType[warning.type] || 0) + 1
    }

    return {
      isValid: result.isValid,
      summary: {
        totalErrors: result.errors.length,
        totalWarnings: result.warnings.length,
        errorsByType,
        warningsByType
      },
      errors: result.errors,
      warnings: result.warnings
    }
  }

  /**
   * Generate progress report
   */
  generateProgressReport(files: Array<{ path: string; localized: boolean; hardcodedCount: number }>): ProgressReport {
    const localizedFiles = files.filter(f => f.localized).length
    const totalHardcodedStrings = files.reduce((sum, f) => sum + f.hardcodedCount, 0)
    const localizationPercentage = Math.round((localizedFiles / files.length) * 100)

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalFiles: files.length
      },
      summary: {
        totalFiles: files.length,
        localizedFiles,
        unlocalizedFiles: files.length - localizedFiles,
        localizationPercentage,
        totalHardcodedStrings
      },
      files: files.map(file => ({
        ...file,
        progress: file.localized ? 100 : Math.max(0, 100 - (file.hardcodedCount * 10))
      }))
    }
  }

  /**
   * Format report as Markdown
   */
  formatAsMarkdown(report: HardcodedStringsReport): string {
    let markdown = '# Hardcoded Strings Report\n\n'
    
    // Summary
    markdown += '## Summary\n\n'
    markdown += `- **Total Strings**: ${report.summary.totalStrings}\n`
    markdown += `- **Files Scanned**: ${report.metadata.scannedFiles}\n`
    markdown += `- **Generated**: ${new Date(report.metadata.generatedAt).toLocaleString()}\n\n`

    // By Type
    markdown += '## Strings by Type\n\n'
    for (const [type, count] of Object.entries(report.summary.byType)) {
      markdown += `- **${type}**: ${count}\n`
    }
    markdown += '\n'

    // By File
    markdown += '## Strings by File\n\n'
    const fileGroups = this.groupStringsByFile(report.strings)
    
    for (const [filePath, strings] of Object.entries(fileGroups)) {
      markdown += `### ${filePath}\n\n`
      
      for (const string of strings) {
        markdown += `- **Line ${string.line}**: "${string.text}"\n`
        markdown += `  - **Type**: ${string.type}\n`
        markdown += `  - **Suggested Key**: \`${string.suggestedKey}\`\n`
        if (string.context) {
          markdown += `  - **Context**: \`${string.context}\`\n`
        }
        markdown += '\n'
      }
    }

    return markdown
  }

  /**
   * Format report as JSON
   */
  formatAsJSON(report: HardcodedStringsReport): string {
    return JSON.stringify(report, null, 2)
  }

  /**
   * Format report as CSV
   */
  formatAsCSV(report: HardcodedStringsReport): string {
    const headers = ['File', 'Line', 'Column', 'Text', 'Type', 'Suggested Key', 'Context']
    let csv = headers.join(',') + '\n'

    for (const string of report.strings) {
      const row = [
        string.filePath,
        string.line.toString(),
        string.column.toString(),
        `"${string.text.replace(/"/g, '""')}"`, // Escape quotes
        string.type,
        string.suggestedKey,
        `"${(string.context || '').replace(/"/g, '""')}"`
      ]
      csv += row.join(',') + '\n'
    }

    return csv
  }

  /**
   * Filter report by file pattern
   */
  filterByFilePattern(report: HardcodedStringsReport, pattern: RegExp): HardcodedStringsReport {
    const filteredStrings = report.strings.filter(s => pattern.test(s.filePath))
    return this.generateHardcodedStringsReport(filteredStrings)
  }

  /**
   * Filter report by string types
   */
  filterByType(report: HardcodedStringsReport, types: DetectionType[]): HardcodedStringsReport {
    const filteredStrings = report.strings.filter(s => types.includes(s.type))
    return this.generateHardcodedStringsReport(filteredStrings)
  }

  /**
   * Sort report by different criteria
   */
  sortBy(report: HardcodedStringsReport, criteria: 'line' | 'text' | 'type' | 'file'): HardcodedStringsReport {
    const sortedStrings = [...report.strings].sort((a, b) => {
      switch (criteria) {
        case 'line':
          return a.line - b.line
        case 'text':
          return a.text.localeCompare(b.text)
        case 'type':
          return a.type.localeCompare(b.type)
        case 'file':
          return a.filePath.localeCompare(b.filePath)
        default:
          return 0
      }
    })

    return {
      ...report,
      strings: sortedStrings
    }
  }

  /**
   * Calculate detailed statistics
   */
  calculateStatistics(report: HardcodedStringsReport): ReportStatistics {
    const totalFiles = Object.keys(report.summary.byFile).length
    const averageStringsPerFile = totalFiles > 0 ? report.summary.totalStrings / totalFiles : 0

    // Find most common type
    let mostCommonType = ''
    let maxTypeCount = 0
    for (const [type, count] of Object.entries(report.summary.byType)) {
      if (count > maxTypeCount) {
        maxTypeCount = count
        mostCommonType = type
      }
    }

    // Find file with most strings
    let fileWithMostStrings = ''
    let maxFileCount = 0
    for (const [file, count] of Object.entries(report.summary.byFile)) {
      if (count > maxFileCount) {
        maxFileCount = count
        fileWithMostStrings = file
      }
    }

    return {
      totalStrings: report.summary.totalStrings,
      totalFiles,
      averageStringsPerFile,
      mostCommonType,
      fileWithMostStrings
    }
  }

  /**
   * Generate trend analysis
   */
  generateTrendAnalysis(historicalData: Array<{ date: string; totalStrings: number; localizedStrings: number }>): TrendAnalysis {
    if (historicalData.length < 2) {
      return {
        totalStringsChange: 0,
        localizedStringsChange: 0,
        localizationProgress: 0,
        trend: 'stable'
      }
    }

    const first = historicalData[0]
    const last = historicalData[historicalData.length - 1]

    const totalStringsChange = last.totalStrings - first.totalStrings
    const localizedStringsChange = last.localizedStrings - first.localizedStrings
    
    const firstPercentage = (first.localizedStrings / first.totalStrings) * 100
    const lastPercentage = (last.localizedStrings / last.totalStrings) * 100
    const localizationProgress = lastPercentage - firstPercentage

    let trend: 'improving' | 'declining' | 'stable' = 'stable'
    if (localizationProgress > 5) trend = 'improving'
    else if (localizationProgress < -5) trend = 'declining'

    return {
      totalStringsChange,
      localizedStringsChange,
      localizationProgress,
      trend
    }
  }

  /**
   * Export report to file
   */
  async exportToFile(report: HardcodedStringsReport, filePath: string, format: 'json' | 'markdown' | 'csv'): Promise<void> {
    if (!this.fileWriter) {
      throw new Error('File writer not configured')
    }

    let content: string
    switch (format) {
      case 'json':
        content = this.formatAsJSON(report)
        break
      case 'markdown':
        content = this.formatAsMarkdown(report)
        break
      case 'csv':
        content = this.formatAsCSV(report)
        break
      default:
        throw new Error(`Unsupported format: ${format}`)
    }

    await this.fileWriter(filePath, content)
  }

  /**
   * Set file writer function for testing
   */
  setFileWriter(writer: (path: string, content: string) => Promise<void>): void {
    this.fileWriter = writer
  }

  private groupStringsByFile(strings: HardcodedString[]): Record<string, HardcodedString[]> {
    const groups: Record<string, HardcodedString[]> = {}
    
    for (const string of strings) {
      if (!groups[string.filePath]) {
        groups[string.filePath] = []
      }
      groups[string.filePath].push(string)
    }

    return groups
  }
}
