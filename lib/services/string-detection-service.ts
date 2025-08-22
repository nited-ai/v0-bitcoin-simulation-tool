import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import type { 
  HardcodedString, 
  DetectionPattern, 
  DetectionType, 
  ScanResult, 
  FileScanResult,
  ScanSummary 
} from './types/localization'

/**
 * Service for detecting hardcoded strings in staged files
 * Focuses on git staged files only for pre-commit workflow
 */
export class StringDetectionService {
  private readonly detectionPatterns: DetectionPattern[]

  constructor() {
    this.detectionPatterns = this.initializePatterns()
  }

  /**
   * Get list of staged files that should be scanned for hardcoded strings
   * Only returns .tsx and .ts files
   */
  getStagedFiles(): string[] {
    try {
      const output = execSync('git diff --cached --name-only', { encoding: 'utf8' })
      return output
        .split('\n')
        .map(file => file.trim())
        .filter(file => file)
        .filter(file => /\.(tsx?|jsx?)$/.test(file))
        .filter(file => !file.includes('node_modules'))
        .filter(file => !file.includes('.test.'))
        .filter(file => !file.includes('.spec.'))
    } catch (error) {
      console.warn('Failed to get staged files:', error)
      return []
    }
  }

  /**
   * Detect hardcoded strings in file content
   */
  detectHardcodedStrings(content: string, filePath: string): HardcodedString[] {
    const detected: HardcodedString[] = []
    const componentName = this.extractComponentName(filePath)

    for (const pattern of this.detectionPatterns) {
      const matches = content.matchAll(pattern.pattern)
      
      for (const match of matches) {
        const text = pattern.extractor(match)
        if (!text || this.shouldExcludeString(text, content)) {
          continue
        }

        const line = this.getLineNumber(content, match.index || 0)
        const column = this.getColumnNumber(content, match.index || 0)
        const context = pattern.contextExtractor?.(match, content)
        const suggestedKey = this.generateTranslationKey(filePath, text, pattern.type)

        detected.push({
          text,
          type: pattern.type,
          filePath,
          line,
          column,
          suggestedKey,
          context
        })
      }
    }

    return detected
  }

  /**
   * Generate consistent translation key for a string
   */
  generateTranslationKey(filePath: string, text: string, type: DetectionType): string {
    const componentName = this.extractComponentName(filePath)
    const elementDescription = this.textToKey(text)
    const typeSuffix = this.getTypeSuffix(type)

    // Add a hash suffix for similar texts to ensure uniqueness
    const textHash = this.generateTextHash(text)
    const baseKey = `${componentName}.${elementDescription}.${typeSuffix}`

    // Only add hash if the text contains ellipsis (indicating truncation)
    if (text.includes('...')) {
      return `${baseKey}.${textHash}`
    }

    return baseKey
  }

  /**
   * Scan all staged files and return comprehensive results
   */
  async scanStagedFiles(): Promise<ScanResult> {
    const stagedFiles = this.getStagedFiles()
    const files: FileScanResult[] = []
    let totalStrings = 0
    const byType: Record<DetectionType, number> = {} as any

    for (const filePath of stagedFiles) {
      try {
        const content = execSync(`git show :${filePath}`, { encoding: 'utf8' })
        const strings = this.detectHardcodedStrings(content, filePath)
        const usesTranslation = this.checkUsesTranslation(content)
        const hasSafeTFallback = this.checkHasSafeTFallback(content)
        const componentName = this.extractComponentName(filePath)

        files.push({
          filePath,
          strings,
          usesTranslation,
          hasSafeTFallback,
          componentName
        })

        totalStrings += strings.length

        // Count by type
        for (const string of strings) {
          byType[string.type] = (byType[string.type] || 0) + 1
        }
      } catch (error) {
        console.warn(`Failed to scan file ${filePath}:`, error)
      }
    }

    const summary = this.generateSummary(files)

    return {
      files,
      totalStrings,
      byType,
      summary
    }
  }

  private initializePatterns(): DetectionPattern[] {
    return [
      // JSX text content
      {
        pattern: />([^<>{]+)</g,
        type: 'jsx_text',
        extractor: (match) => match[1]?.trim() || null,
        contextExtractor: (match, content) => this.getContextAround(content, match.index || 0)
      },
      // Button labels
      {
        pattern: /<Button[^>]*>\s*([^<]+)\s*<\/Button>/g,
        type: 'button_label',
        extractor: (match) => match[1]?.trim() || null
      },
      // Tooltip content - more comprehensive pattern
      {
        pattern: /<TooltipContent[^>]*>[\s\S]*?<p[^>]*>\s*([^<]+)\s*<\/p>[\s\S]*?<\/TooltipContent>/g,
        type: 'tooltip',
        extractor: (match) => match[1]?.trim() || null
      },
      // Simple tooltip content
      {
        pattern: /<TooltipContent[^>]*>\s*([^<]+)\s*<\/TooltipContent>/g,
        type: 'tooltip',
        extractor: (match) => match[1]?.trim() || null
      },
      // Placeholder attributes
      {
        pattern: /placeholder=["']([^"']+)["']/g,
        type: 'placeholder',
        extractor: (match) => match[1] || null
      },
      // Error messages in throw statements
      {
        pattern: /throw new Error\(["']([^"']+)["']\)/g,
        type: 'error_message',
        extractor: (match) => match[1] || null
      }
    ]
  }

  private shouldExcludeString(text: string, content: string): boolean {
    // Exclude very short strings
    if (text.length < 2) return true

    // Exclude strings that are already using translation functions
    const translationPattern = /[{]\s*(?:t|safeT)\s*\(/
    if (translationPattern.test(text)) return true

    // Exclude technical strings
    const technicalPatterns = [
      /^[A-Z_]+$/, // ALL_CAPS constants
      /^[a-z-]+$/, // CSS class names
      /^\d+$/, // Pure numbers
      /^[./]/, // File paths
      /console\.|import |export |from |require\(/, // Code keywords
    ]

    return technicalPatterns.some(pattern => pattern.test(text))
  }

  private extractComponentName(filePath: string): string {
    const fileName = filePath.split('/').pop() || ''
    return fileName.replace(/\.(tsx?|jsx?)$/, '')
  }

  private textToKey(text: string): string {
    const cleaned = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()

    if (!cleaned) {
      // Fallback for texts with only special characters
      return 'text' + Math.random().toString(36).substr(2, 5)
    }

    return cleaned
      .split(' ')
      .map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
      .join('')
  }

  private getTypeSuffix(type: DetectionType): string {
    const suffixMap: Record<DetectionType, string> = {
      jsx_text: 'text',
      button_label: 'button',
      tooltip: 'tooltip',
      placeholder: 'placeholder',
      error_message: 'error',
      validation_message: 'validation',
      chart_label: 'label',
      alert_message: 'alert',
      modal_content: 'modal',
      form_label: 'label'
    }
    return suffixMap[type] || 'text'
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length
  }

  private getColumnNumber(content: string, index: number): number {
    const lines = content.substring(0, index).split('\n')
    return lines[lines.length - 1].length + 1
  }

  private getContextAround(content: string, index: number, contextSize = 50): string {
    const start = Math.max(0, index - contextSize)
    const end = Math.min(content.length, index + contextSize)
    return content.substring(start, end)
  }

  private checkUsesTranslation(content: string): boolean {
    return /useTranslation|from ['"]react-i18next['"]/.test(content)
  }

  private checkHasSafeTFallback(content: string): boolean {
    return /safeT\s*=/.test(content)
  }

  private generateTextHash(text: string): string {
    // Simple hash function for generating unique suffixes
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substr(0, 4)
  }

  private generateSummary(files: FileScanResult[]): ScanSummary {
    const filesNeedingUpdate = files
      .filter(f => f.strings.length > 0 && !f.usesTranslation)
      .map(f => f.filePath)

    const filesAlreadyLocalized = files
      .filter(f => f.usesTranslation && f.strings.length === 0)
      .map(f => f.filePath)

    const typeCount: Record<DetectionType, number> = {} as any
    for (const file of files) {
      for (const string of file.strings) {
        typeCount[string.type] = (typeCount[string.type] || 0) + 1
      }
    }

    const commonTypes = Object.entries(typeCount)
      .map(([type, count]) => ({ type: type as DetectionType, count }))
      .sort((a, b) => b.count - a.count)

    return {
      filesNeedingUpdate,
      filesAlreadyLocalized,
      commonTypes,
      potentialKeyConflicts: [] // TODO: Implement conflict detection
    }
  }
}
