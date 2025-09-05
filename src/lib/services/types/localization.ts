/**
 * Types for the localization system
 */

export interface HardcodedString {
  /** The actual text content found */
  text: string
  /** Type of string detected */
  type: DetectionType
  /** File path where the string was found */
  filePath: string
  /** Line number in the file */
  line: number
  /** Column position in the line */
  column: number
  /** Suggested translation key */
  suggestedKey: string
  /** Context around the string for better understanding */
  context?: string
}

export type DetectionType = 
  | 'jsx_text'           // Text content in JSX elements
  | 'button_label'       // Button text content
  | 'tooltip'           // Tooltip content
  | 'placeholder'       // Input placeholder text
  | 'error_message'     // Error messages
  | 'validation_message' // Form validation messages
  | 'chart_label'       // Chart titles, legends, axis labels
  | 'alert_message'     // Alert and notification content
  | 'modal_content'     // Modal titles and content
  | 'form_label'        // Form field labels

export interface DetectionPattern {
  /** Regex pattern to match */
  pattern: RegExp
  /** Type of detection this pattern represents */
  type: DetectionType
  /** Function to extract the actual text from the match */
  extractor: (match: RegExpMatchArray) => string | null
  /** Function to generate context information */
  contextExtractor?: (match: RegExpMatchArray, fullContent: string) => string
}

export interface ScanResult {
  /** List of files scanned */
  files: FileScanResult[]
  /** Total number of hardcoded strings found */
  totalStrings: number
  /** Breakdown by detection type */
  byType: Record<DetectionType, number>
  /** Summary statistics */
  summary: ScanSummary
}

export interface FileScanResult {
  /** File path */
  filePath: string
  /** List of hardcoded strings found in this file */
  strings: HardcodedString[]
  /** Whether the file uses useTranslation hook */
  usesTranslation: boolean
  /** Whether the file has safeT fallback function */
  hasSafeTFallback: boolean
  /** Component name extracted from file */
  componentName: string
}

export interface ScanSummary {
  /** Files that need localization updates */
  filesNeedingUpdate: string[]
  /** Files already properly localized */
  filesAlreadyLocalized: string[]
  /** Most common types of hardcoded strings */
  commonTypes: Array<{ type: DetectionType; count: number }>
  /** Suggested translation keys that might conflict */
  potentialKeyConflicts: string[]
}

export interface TranslationKeyConfig {
  /** Component name (extracted from filename) */
  componentName: string
  /** Element description (derived from text content) */
  elementDescription: string
  /** Type suffix (label, tooltip, button, etc.) */
  typeSuffix: string
}

export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean
  /** List of validation errors */
  errors: ValidationError[]
  /** List of warnings (non-blocking) */
  warnings: ValidationWarning[]
}

export interface ValidationError {
  /** Type of validation error */
  type: 'missing_translation' | 'hardcoded_string' | 'key_conflict' | 'invalid_pattern' | 'insufficient_parts' | 'empty_parts' | 'invalid_format'
  /** Error message */
  message: string
  /** File path where error occurred */
  filePath: string
  /** Line number (if applicable) */
  line?: number
  /** Suggested fix */
  suggestedFix?: string
}

export interface ValidationWarning {
  /** Type of warning */
  type: 'missing_german_translation' | 'unused_key' | 'inconsistent_naming' | 'missing_translation_hook' | 'extra_translation'
  /** Warning message */
  message: string
  /** File path where warning occurred */
  filePath?: string
  /** Suggested action */
  suggestedAction?: string
}

export interface TranslationUpdate {
  /** Locale code (en, de, etc.) */
  locale: string
  /** Translation keys to add/update */
  updates: Record<string, string>
  /** Keys to remove */
  removals: string[]
}

export interface LocalizationConfig {
  /** Supported locales */
  supportedLocales: string[]
  /** Default locale */
  defaultLocale: string
  /** Path to locale files */
  localesPath: string
  /** File extensions to scan */
  scanExtensions: string[]
  /** Directories to exclude from scanning */
  excludeDirectories: string[]
  /** Patterns to exclude from detection */
  excludePatterns: RegExp[]
}

export interface FileValidationResult {
  /** File path */
  filePath: string
  /** Whether validation passed */
  isValid: boolean
  /** List of validation errors */
  errors: ValidationError[]
  /** List of warnings */
  warnings: ValidationWarning[]
  /** Number of hardcoded strings found */
  hardcodedStringsCount: number
}

export interface BatchValidationResult {
  /** Individual file results */
  files: FileValidationResult[]
  /** Overall validation result */
  isValid: boolean
  /** Summary statistics */
  summary: ValidationSummary
}

export interface ValidationSummary {
  /** Total number of files validated */
  totalFiles: number
  /** Number of files with errors */
  filesWithErrors: number
  /** Number of files with warnings */
  filesWithWarnings: number
  /** Total number of errors across all files */
  totalErrors: number
  /** Total number of warnings across all files */
  totalWarnings: number
  /** Total number of hardcoded strings found */
  totalHardcodedStrings: number
  /** Most common error types */
  commonErrorTypes: Array<{ type: string; count: number }>
}

export interface HardcodedStringsReport {
  /** Report metadata */
  metadata: {
    generatedAt: string
    totalStrings: number
    scannedFiles: number
  }
  /** Summary statistics */
  summary: {
    totalStrings: number
    byType: Record<string, number>
    byFile: Record<string, number>
  }
  /** List of hardcoded strings */
  strings: HardcodedString[]
}

export interface ValidationReport {
  /** Whether validation passed */
  isValid: boolean
  /** Summary statistics */
  summary: {
    totalErrors: number
    totalWarnings: number
    errorsByType: Record<string, number>
    warningsByType: Record<string, number>
  }
  /** Validation errors */
  errors: ValidationError[]
  /** Validation warnings */
  warnings: ValidationWarning[]
}

export interface ProgressReport {
  /** Report metadata */
  metadata: {
    generatedAt: string
    totalFiles: number
  }
  /** Summary statistics */
  summary: {
    totalFiles: number
    localizedFiles: number
    unlocalizedFiles: number
    localizationPercentage: number
    totalHardcodedStrings: number
  }
  /** File-by-file progress */
  files: Array<{
    path: string
    localized: boolean
    hardcodedCount: number
    progress: number
  }>
}

export interface ReportStatistics {
  totalStrings: number
  totalFiles: number
  averageStringsPerFile: number
  mostCommonType: string
  fileWithMostStrings: string
}

export interface TrendAnalysis {
  totalStringsChange: number
  localizedStringsChange: number
  localizationProgress: number
  trend: 'improving' | 'declining' | 'stable'
}

export interface BuildResult {
  success: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  reportPath?: string
}

export interface CIResult {
  success: boolean
  exitCode: number
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface LSPConfig {
  capabilities: string[]
  commands: string[]
}

export interface Diagnostic {
  range: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
  message: string
  severity: number
  source: string
}
