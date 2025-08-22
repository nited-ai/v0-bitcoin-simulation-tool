import type { 
  ValidationResult, 
  ValidationError, 
  ValidationWarning,
  FileValidationResult,
  BatchValidationResult,
  ValidationSummary
} from './types/localization'
import { PatternMatcher } from './pattern-matcher'

/**
 * Comprehensive validation service for localization
 */
export class ValidationService {
  private patternMatcher: PatternMatcher

  constructor() {
    this.patternMatcher = new PatternMatcher()
  }

  /**
   * Validate translation key format
   */
  validateTranslationKey(key: string): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Check for invalid format first (spaces indicate wrong format)
    if (key.includes(' ')) {
      errors.push({
        type: 'invalid_format',
        message: `Translation key "${key}" contains spaces - use dot notation`,
        filePath: '',
        suggestedFix: 'Replace spaces with dots or use camelCase'
      })
      return { isValid: false, errors, warnings }
    }

    // Check for empty parts
    const parts = key.split('.')
    if (parts.some(part => !part.trim())) {
      errors.push({
        type: 'empty_parts',
        message: `Translation key "${key}" contains empty parts`,
        filePath: '',
        suggestedFix: 'Remove empty parts or add content'
      })
    }

    // Check if key has minimum required parts (only if no empty parts)
    else if (parts.length < 3) {
      errors.push({
        type: 'insufficient_parts',
        message: `Translation key "${key}" must have at least 3 parts: Component.element.type`,
        filePath: '',
        suggestedFix: 'Add missing parts to the key'
      })
    }

    // Check naming convention (camelCase for element parts)
    const elementPart = parts[1]
    if (elementPart && !/^[a-z][a-zA-Z0-9]*$/.test(elementPart)) {
      errors.push({
        type: 'invalid_format',
        message: `Element part "${elementPart}" should be in camelCase format`,
        filePath: '',
        suggestedFix: 'Convert to camelCase format'
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate uniqueness of translation keys
   */
  validateKeyUniqueness(keys: string[]): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const seen = new Set<string>()

    for (const key of keys) {
      if (seen.has(key)) {
        errors.push({
          type: 'key_conflict',
          message: `Duplicate translation key found: "${key}"`,
          filePath: '',
          suggestedFix: 'Use unique keys or add distinguishing suffixes'
        })
      } else {
        seen.add(key)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate translation file structure
   */
  validateTranslationFile(
    translations: any, 
    expectedStructure?: any
  ): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    if (!translations || typeof translations !== 'object') {
      errors.push({
        type: 'invalid_pattern',
        message: 'Translation file must be a valid object',
        filePath: '',
        suggestedFix: 'Ensure the file exports a valid JSON object'
      })
      return { isValid: false, errors, warnings }
    }

    if (expectedStructure) {
      this.validateStructureRecursive(translations, expectedStructure, '', errors, warnings)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate component localization
   */
  validateComponentLocalization(content: string, filePath: string): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Check for hardcoded strings
    const hardcodedStrings = this.patternMatcher.findMatches(content, 'jsx_text')
    
    for (const hardcodedString of hardcodedStrings) {
      errors.push({
        type: 'hardcoded_string',
        message: `Hardcoded string found: "${hardcodedString.text}"`,
        filePath,
        line: hardcodedString.line,
        suggestedFix: `Replace with translation key: {t('${this.suggestTranslationKey(filePath, hardcodedString.text)}')}`
      })
    }

    // Check if component uses translation hook
    const hasTranslationHook = /useTranslation|from ['"]react-i18next['"]/.test(content)
    const hasTranslationCalls = /\bt\s*\(/.test(content)

    if (hasTranslationCalls && !hasTranslationHook) {
      warnings.push({
        type: 'missing_translation_hook',
        message: 'Component uses translation functions but missing useTranslation hook import',
        filePath,
        suggestedAction: 'Add: import { useTranslation } from "react-i18next"'
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate consistency between different language files
   */
  validateCrossLanguageConsistency(
    baseTranslations: any,
    targetTranslations: any,
    targetLanguage: string
  ): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    this.compareTranslationStructures(
      baseTranslations,
      targetTranslations,
      '',
      targetLanguage,
      errors,
      warnings
    )

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate multiple files in batch
   */
  validateMultipleFiles(files: Array<{ path: string; content: string }>): BatchValidationResult {
    const fileResults: FileValidationResult[] = []
    let totalErrors = 0
    let totalWarnings = 0
    let totalHardcodedStrings = 0

    for (const file of files) {
      const result = this.validateComponentLocalization(file.content, file.path)
      const hardcodedCount = this.patternMatcher.findMatches(file.content, 'jsx_text').length

      const fileResult: FileValidationResult = {
        filePath: file.path,
        isValid: result.isValid,
        errors: result.errors,
        warnings: result.warnings,
        hardcodedStringsCount: hardcodedCount
      }

      fileResults.push(fileResult)
      totalErrors += result.errors.length
      totalWarnings += result.warnings.length
      totalHardcodedStrings += hardcodedCount
    }

    const summary: ValidationSummary = {
      totalFiles: files.length,
      filesWithErrors: fileResults.filter(f => !f.isValid).length,
      filesWithWarnings: fileResults.filter(f => f.warnings.length > 0).length,
      totalErrors,
      totalWarnings,
      totalHardcodedStrings,
      commonErrorTypes: this.getCommonErrorTypes(fileResults)
    }

    return {
      files: fileResults,
      isValid: totalErrors === 0,
      summary
    }
  }

  private validateStructureRecursive(
    actual: any,
    expected: any,
    path: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (typeof expected === 'object' && expected !== null) {
      for (const key in expected) {
        const currentPath = path ? `${path}.${key}` : key

        if (!(key in actual)) {
          errors.push({
            type: 'missing_translation',
            message: `Missing translation key: ${currentPath}`,
            filePath: '',
            suggestedFix: `Add missing key: ${currentPath}`
          })
        } else {
          this.validateStructureRecursive(actual[key], expected[key], currentPath, errors, warnings)
        }
      }

      // Check for extra keys in actual
      for (const key in actual) {
        if (!(key in expected)) {
          const currentPath = path ? `${path}.${key}` : key
          warnings.push({
            type: 'extra_translation',
            message: `Extra translation key found: ${currentPath}`,
            suggestedAction: 'Remove unused key or add to expected structure'
          })
        }
      }
    }
  }

  private compareTranslationStructures(
    base: any,
    target: any,
    path: string,
    language: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (typeof base === 'object' && base !== null) {
      for (const key in base) {
        const currentPath = path ? `${path}.${key}` : key

        if (!(key in target)) {
          errors.push({
            type: 'missing_translation',
            message: `Missing ${language} translation for: ${currentPath}`,
            filePath: '',
            suggestedFix: `Add translation for ${currentPath} in ${language} file`
          })
        } else {
          this.compareTranslationStructures(base[key], target[key], currentPath, language, errors, warnings)
        }
      }
    }
  }

  private suggestTranslationKey(filePath: string, text: string): string {
    const componentName = filePath.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || 'Component'
    const elementKey = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
      .split(' ').map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)).join('')
    
    return `${componentName}.${elementKey}.text`
  }

  private getCommonErrorTypes(fileResults: FileValidationResult[]): Array<{ type: string; count: number }> {
    const errorCounts: Record<string, number> = {}

    for (const file of fileResults) {
      for (const error of file.errors) {
        errorCounts[error.type] = (errorCounts[error.type] || 0) + 1
      }
    }

    return Object.entries(errorCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
  }
}
