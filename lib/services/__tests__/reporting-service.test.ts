import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ReportingService } from '../reporting-service'
import type { HardcodedString, ValidationResult } from '../types/localization'

describe('ReportingService', () => {
  let reporter: ReportingService

  beforeEach(() => {
    reporter = new ReportingService()
  })

  describe('Report Generation', () => {
    it('should generate comprehensive hardcoded strings report', () => {
      const hardcodedStrings: HardcodedString[] = [
        {
          text: 'Save Changes',
          type: 'button_label',
          filePath: 'components/Button.tsx',
          line: 15,
          column: 10,
          suggestedKey: 'Button.saveChanges.button',
          context: '<Button>Save Changes</Button>'
        },
        {
          text: 'Enter your name',
          type: 'placeholder',
          filePath: 'components/Form.tsx',
          line: 25,
          column: 20,
          suggestedKey: 'Form.enterYourName.placeholder',
          context: 'placeholder="Enter your name"'
        }
      ]

      const report = reporter.generateHardcodedStringsReport(hardcodedStrings)

      expect(report.summary.totalStrings).toBe(2)
      expect(report.summary.byType.button_label).toBe(1)
      expect(report.summary.byType.placeholder).toBe(1)
      expect(report.summary.byFile['components/Button.tsx']).toBe(1)
      expect(report.summary.byFile['components/Form.tsx']).toBe(1)
      expect(report.strings).toHaveLength(2)
    })

    it('should generate validation report with errors and warnings', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: [
          {
            type: 'hardcoded_string',
            message: 'Hardcoded string found: "Save"',
            filePath: 'Button.tsx',
            line: 10,
            suggestedFix: 'Replace with {t("Button.save.button")}'
          }
        ],
        warnings: [
          {
            type: 'missing_translation_hook',
            message: 'Component uses translation but missing hook',
            filePath: 'Button.tsx',
            suggestedAction: 'Add useTranslation hook'
          }
        ]
      }

      const report = reporter.generateValidationReport(validationResult)

      expect(report.isValid).toBe(false)
      expect(report.summary.totalErrors).toBe(1)
      expect(report.summary.totalWarnings).toBe(1)
      expect(report.summary.errorsByType.hardcoded_string).toBe(1)
      expect(report.summary.warningsByType.missing_translation_hook).toBe(1)
    })

    it('should generate progress report showing localization status', () => {
      const files = [
        { path: 'Component1.tsx', localized: true, hardcodedCount: 0 },
        { path: 'Component2.tsx', localized: false, hardcodedCount: 3 },
        { path: 'Component3.tsx', localized: true, hardcodedCount: 0 }
      ]

      const report = reporter.generateProgressReport(files)

      expect(report.summary.totalFiles).toBe(3)
      expect(report.summary.localizedFiles).toBe(2)
      expect(report.summary.unlocalizedFiles).toBe(1)
      expect(report.summary.localizationPercentage).toBe(67) // 2/3 * 100, rounded
      expect(report.summary.totalHardcodedStrings).toBe(3)
    })
  })

  describe('Report Formatting', () => {
    it('should format report as markdown', () => {
      const hardcodedStrings: HardcodedString[] = [
        {
          text: 'Save',
          type: 'button_label',
          filePath: 'Button.tsx',
          line: 10,
          column: 5,
          suggestedKey: 'Button.save.button',
          context: '<Button>Save</Button>'
        }
      ]

      const report = reporter.generateHardcodedStringsReport(hardcodedStrings)
      const markdown = reporter.formatAsMarkdown(report)

      expect(markdown).toContain('# Hardcoded Strings Report')
      expect(markdown).toContain('## Summary')
      expect(markdown).toContain('**Total Strings**: 1')
      expect(markdown).toContain('## Strings by File')
      expect(markdown).toContain('### Button.tsx')
      expect(markdown).toContain('- **Line 10**: "Save"')
      expect(markdown).toContain('- **Type**: button_label')
      expect(markdown).toContain('- **Suggested Key**: `Button.save.button`')
    })

    it('should format report as JSON', () => {
      const hardcodedStrings: HardcodedString[] = [
        {
          text: 'Save',
          type: 'button_label',
          filePath: 'Button.tsx',
          line: 10,
          column: 5,
          suggestedKey: 'Button.save.button',
          context: '<Button>Save</Button>'
        }
      ]

      const report = reporter.generateHardcodedStringsReport(hardcodedStrings)
      const json = reporter.formatAsJSON(report)

      const parsed = JSON.parse(json)
      expect(parsed.summary.totalStrings).toBe(1)
      expect(parsed.strings).toHaveLength(1)
      expect(parsed.strings[0].text).toBe('Save')
    })

    it('should format report as CSV', () => {
      const hardcodedStrings: HardcodedString[] = [
        {
          text: 'Save',
          type: 'button_label',
          filePath: 'Button.tsx',
          line: 10,
          column: 5,
          suggestedKey: 'Button.save.button',
          context: '<Button>Save</Button>'
        },
        {
          text: 'Cancel',
          type: 'button_label',
          filePath: 'Button.tsx',
          line: 15,
          column: 5,
          suggestedKey: 'Button.cancel.button',
          context: '<Button>Cancel</Button>'
        }
      ]

      const report = reporter.generateHardcodedStringsReport(hardcodedStrings)
      const csv = reporter.formatAsCSV(report)

      expect(csv).toContain('File,Line,Column,Text,Type,Suggested Key,Context')
      expect(csv).toContain('Button.tsx,10,5,"Save",button_label,Button.save.button,"<Button>Save</Button>"')
      expect(csv).toContain('Button.tsx,15,5,"Cancel",button_label,Button.cancel.button,"<Button>Cancel</Button>"')
    })
  })

  describe('Report Filtering and Sorting', () => {
    it('should filter report by file pattern', () => {
      const hardcodedStrings: HardcodedString[] = [
        {
          text: 'Save',
          type: 'button_label',
          filePath: 'components/Button.tsx',
          line: 10,
          column: 5,
          suggestedKey: 'Button.save.button',
          context: '<Button>Save</Button>'
        },
        {
          text: 'Title',
          type: 'jsx_text',
          filePath: 'pages/Home.tsx',
          line: 20,
          column: 10,
          suggestedKey: 'Home.title.text',
          context: '<h1>Title</h1>'
        }
      ]

      const report = reporter.generateHardcodedStringsReport(hardcodedStrings)
      const filtered = reporter.filterByFilePattern(report, /components\//)

      expect(filtered.strings).toHaveLength(1)
      expect(filtered.strings[0].filePath).toBe('components/Button.tsx')
      expect(filtered.summary.totalStrings).toBe(1)
    })

    it('should filter report by string type', () => {
      const hardcodedStrings: HardcodedString[] = [
        {
          text: 'Save',
          type: 'button_label',
          filePath: 'Button.tsx',
          line: 10,
          column: 5,
          suggestedKey: 'Button.save.button',
          context: '<Button>Save</Button>'
        },
        {
          text: 'Enter name',
          type: 'placeholder',
          filePath: 'Form.tsx',
          line: 20,
          column: 10,
          suggestedKey: 'Form.enterName.placeholder',
          context: 'placeholder="Enter name"'
        }
      ]

      const report = reporter.generateHardcodedStringsReport(hardcodedStrings)
      const filtered = reporter.filterByType(report, ['button_label'])

      expect(filtered.strings).toHaveLength(1)
      expect(filtered.strings[0].type).toBe('button_label')
      expect(filtered.summary.totalStrings).toBe(1)
    })

    it('should sort report by different criteria', () => {
      const hardcodedStrings: HardcodedString[] = [
        {
          text: 'Save',
          type: 'button_label',
          filePath: 'Button.tsx',
          line: 20,
          column: 5,
          suggestedKey: 'Button.save.button',
          context: '<Button>Save</Button>'
        },
        {
          text: 'Cancel',
          type: 'button_label',
          filePath: 'Button.tsx',
          line: 10,
          column: 5,
          suggestedKey: 'Button.cancel.button',
          context: '<Button>Cancel</Button>'
        }
      ]

      const report = reporter.generateHardcodedStringsReport(hardcodedStrings)
      
      // Sort by line number
      const sortedByLine = reporter.sortBy(report, 'line')
      expect(sortedByLine.strings[0].line).toBe(10)
      expect(sortedByLine.strings[1].line).toBe(20)

      // Sort by text
      const sortedByText = reporter.sortBy(report, 'text')
      expect(sortedByText.strings[0].text).toBe('Cancel')
      expect(sortedByText.strings[1].text).toBe('Save')
    })
  })

  describe('Report Statistics', () => {
    it('should calculate detailed statistics', () => {
      const hardcodedStrings: HardcodedString[] = [
        { text: 'Save', type: 'button_label', filePath: 'Button.tsx', line: 10, column: 5, suggestedKey: 'Button.save.button', context: '' },
        { text: 'Cancel', type: 'button_label', filePath: 'Button.tsx', line: 15, column: 5, suggestedKey: 'Button.cancel.button', context: '' },
        { text: 'Title', type: 'jsx_text', filePath: 'Header.tsx', line: 5, column: 10, suggestedKey: 'Header.title.text', context: '' }
      ]

      const report = reporter.generateHardcodedStringsReport(hardcodedStrings)
      const stats = reporter.calculateStatistics(report)

      expect(stats.totalStrings).toBe(3)
      expect(stats.totalFiles).toBe(2)
      expect(stats.averageStringsPerFile).toBe(1.5)
      expect(stats.mostCommonType).toBe('button_label')
      expect(stats.fileWithMostStrings).toBe('Button.tsx')
    })

    it('should generate trend analysis', () => {
      const historicalData = [
        { date: '2024-01-01', totalStrings: 100, localizedStrings: 50 },
        { date: '2024-01-02', totalStrings: 95, localizedStrings: 60 },
        { date: '2024-01-03', totalStrings: 90, localizedStrings: 70 }
      ]

      const trend = reporter.generateTrendAnalysis(historicalData)

      expect(trend.totalStringsChange).toBe(-10) // 90 - 100
      expect(trend.localizedStringsChange).toBe(20) // 70 - 50
      expect(Math.round(trend.localizationProgress)).toBe(28) // Actual calculation: (70/90 - 50/100) * 100
      expect(trend.trend).toBe('improving')
    })
  })

  describe('Report Export', () => {
    it('should export report to file', async () => {
      const hardcodedStrings: HardcodedString[] = [
        {
          text: 'Save',
          type: 'button_label',
          filePath: 'Button.tsx',
          line: 10,
          column: 5,
          suggestedKey: 'Button.save.button',
          context: '<Button>Save</Button>'
        }
      ]

      const report = reporter.generateHardcodedStringsReport(hardcodedStrings)
      
      // Mock file system operations
      const mockWriteFile = vi.fn().mockResolvedValue(undefined)
      reporter.setFileWriter(mockWriteFile)

      await reporter.exportToFile(report, 'report.json', 'json')

      expect(mockWriteFile).toHaveBeenCalledWith(
        'report.json',
        expect.stringContaining('"totalStrings": 1')
      )
    })

    it('should handle export errors gracefully', async () => {
      const hardcodedStrings: HardcodedString[] = []
      const report = reporter.generateHardcodedStringsReport(hardcodedStrings)
      
      const mockWriteFile = vi.fn().mockRejectedValue(new Error('Write failed'))
      reporter.setFileWriter(mockWriteFile)

      await expect(reporter.exportToFile(report, 'report.json', 'json'))
        .rejects.toThrow('Write failed')
    })
  })
})
