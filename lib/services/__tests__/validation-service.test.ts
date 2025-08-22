import { describe, it, expect, beforeEach } from 'vitest'
import { ValidationService } from '../validation-service'
import type { ValidationResult, ValidationError, ValidationWarning } from '../types/localization'

describe('ValidationService', () => {
  let validator: ValidationService

  beforeEach(() => {
    validator = new ValidationService()
  })

  describe('Translation Key Validation', () => {
    it('should validate correct translation keys', () => {
      const validKeys = [
        'BasicParameters.initialBtcPrice.label',
        'Navigation.parameters.shortLabel',
        'LoanParameters.interestRate.tooltip'
      ]

      validKeys.forEach(key => {
        const result = validator.validateTranslationKey(key)
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })

    it('should detect invalid translation key formats', () => {
      const invalidKeys = [
        { key: 'invalid', expectedError: 'insufficient_parts' },
        { key: 'Component.', expectedError: 'empty_parts' },
        { key: '.element.type', expectedError: 'empty_parts' },
        { key: 'Component..type', expectedError: 'empty_parts' },
        { key: 'Component.element.', expectedError: 'empty_parts' },
        { key: 'Component element type', expectedError: 'invalid_format' }
      ]

      invalidKeys.forEach(({ key, expectedError }) => {
        const result = validator.validateTranslationKey(key)
        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
        expect(result.errors[0].type).toBe(expectedError)
      })
    })

    it('should validate key naming conventions', () => {
      const testCases = [
        { key: 'Component.validCamelCase.label', valid: true },
        { key: 'Component.invalid-kebab.label', valid: false },
        { key: 'Component.invalid_snake.label', valid: false },
        { key: 'Component.123numeric.label', valid: false },
        { key: 'Component.validAlphaNumeric123.label', valid: true }
      ]

      testCases.forEach(({ key, valid }) => {
        const result = validator.validateTranslationKey(key)
        expect(result.isValid).toBe(valid)
      })
    })
  })

  describe('Duplicate Key Detection', () => {
    it('should detect duplicate translation keys', () => {
      const keys = [
        'Component.save.button',
        'Component.cancel.button',
        'Component.save.button', // Duplicate
        'OtherComponent.save.button' // Different component, OK
      ]

      const result = validator.validateKeyUniqueness(keys)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].type).toBe('key_conflict')
      expect(result.errors[0].message).toContain('Component.save.button')
    })

    it('should allow same keys in different components', () => {
      const keys = [
        'ComponentA.save.button',
        'ComponentB.save.button',
        'ComponentC.save.button'
      ]

      const result = validator.validateKeyUniqueness(keys)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Translation File Validation', () => {
    it('should validate translation file structure', () => {
      const validTranslations = {
        Navigation: {
          parameters: { label: 'Parameters', shortLabel: 'Params' },
          results: { label: 'Results', shortLabel: 'Results' }
        },
        BasicParameters: {
          title: 'Basic Parameters',
          initialBtcPrice: { label: 'Initial BTC Price', tooltip: 'Price tooltip' }
        }
      }

      const result = validator.validateTranslationFile(validTranslations)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing nested translations', () => {
      const incompleteTranslations = {
        Navigation: {
          parameters: { label: 'Parameters' }, // Missing shortLabel
          results: { label: 'Results', shortLabel: 'Results' }
        }
      }

      const expectedStructure = {
        Navigation: {
          parameters: { label: '', shortLabel: '' },
          results: { label: '', shortLabel: '' }
        }
      }

      const result = validator.validateTranslationFile(incompleteTranslations, expectedStructure)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.message.includes('shortLabel'))).toBe(true)
    })

    it('should detect extra translations not in structure', () => {
      const translationsWithExtra = {
        Navigation: {
          parameters: { label: 'Parameters', shortLabel: 'Params', extraField: 'Extra' }
        }
      }

      const expectedStructure = {
        Navigation: {
          parameters: { label: '', shortLabel: '' }
        }
      }

      const result = validator.validateTranslationFile(translationsWithExtra, expectedStructure)
      
      expect(result.warnings.some(w => w.message.includes('extraField'))).toBe(true)
    })
  })

  describe('Hardcoded String Detection Validation', () => {
    it('should validate that components use translation functions', () => {
      const componentWithHardcodedStrings = `
        export function Component() {
          return (
            <div>
              <h1>Hardcoded Title</h1>
              <p>{t('translated.text')}</p>
            </div>
          )
        }
      `

      const result = validator.validateComponentLocalization(componentWithHardcodedStrings, 'Component.tsx')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.type === 'hardcoded_string')).toBe(true)
    })

    it('should pass validation for properly localized components', () => {
      const localizedComponent = `
        import { useTranslation } from 'react-i18next'
        
        export function Component() {
          const { t } = useTranslation()
          
          return (
            <div>
              <h1>{t('Component.title')}</h1>
              <p>{t('Component.description')}</p>
            </div>
          )
        }
      `

      const result = validator.validateComponentLocalization(localizedComponent, 'Component.tsx')
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing useTranslation hook', () => {
      const componentWithoutHook = `
        export function Component() {
          return <div>{t('some.key')}</div>
        }
      `

      const result = validator.validateComponentLocalization(componentWithoutHook, 'Component.tsx')
      
      expect(result.warnings.some(w => w.type === 'missing_translation_hook')).toBe(true)
    })
  })

  describe('Cross-Language Validation', () => {
    it('should detect missing translations between languages', () => {
      const englishTranslations = {
        Navigation: {
          parameters: { label: 'Parameters' },
          results: { label: 'Results' }
        }
      }

      const germanTranslations = {
        Navigation: {
          parameters: { label: 'Parameter' }
          // Missing results section
        }
      }

      const result = validator.validateCrossLanguageConsistency(englishTranslations, germanTranslations, 'de')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.message.includes('Navigation.results'))).toBe(true)
    })

    it('should detect structural differences', () => {
      const englishTranslations = {
        Navigation: {
          parameters: { label: 'Parameters', shortLabel: 'Params' }
        }
      }

      const germanTranslations = {
        Navigation: {
          parameters: { label: 'Parameter' } // Missing shortLabel
        }
      }

      const result = validator.validateCrossLanguageConsistency(englishTranslations, germanTranslations, 'de')
      
      expect(result.errors.some(e => e.message.includes('shortLabel'))).toBe(true)
    })
  })

  describe('Batch Validation', () => {
    it('should validate multiple files and aggregate results', () => {
      const files = [
        { path: 'Component1.tsx', content: '<div>Hardcoded</div>' },
        { path: 'Component2.tsx', content: '<div>{t("translated")}</div>' }
      ]

      const result = validator.validateMultipleFiles(files)
      
      expect(result.files).toHaveLength(2)
      expect(result.files[0].isValid).toBe(false) // Has hardcoded strings
      expect(result.files[1].isValid).toBe(true)  // Properly localized
      expect(result.summary.totalErrors).toBeGreaterThan(0)
    })

    it('should provide comprehensive summary statistics', () => {
      const files = [
        { path: 'Component1.tsx', content: '<div>Hardcoded 1</div><span>Hardcoded 2</span>' },
        { path: 'Component2.tsx', content: '<div>{t("key1")}</div><span>{t("key2")}</span>' }
      ]

      const result = validator.validateMultipleFiles(files)
      
      expect(result.summary).toHaveProperty('totalFiles', 2)
      expect(result.summary).toHaveProperty('filesWithErrors', 1)
      expect(result.summary).toHaveProperty('totalHardcodedStrings')
      expect(result.summary.totalHardcodedStrings).toBeGreaterThan(0)
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle large translation files efficiently', () => {
      const largeTranslations = {}
      
      // Generate large translation structure
      for (let i = 0; i < 100; i++) {
        largeTranslations[`Component${i}`] = {
          title: `Title ${i}`,
          description: `Description ${i}`
        }
      }

      const startTime = Date.now()
      const result = validator.validateTranslationFile(largeTranslations)
      const endTime = Date.now()
      
      expect(result.isValid).toBe(true)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle malformed input gracefully', () => {
      const malformedInputs = [
        null,
        undefined,
        '',
        {},
        { invalid: 'structure' }
      ]

      malformedInputs.forEach(input => {
        expect(() => {
          validator.validateTranslationFile(input as any)
        }).not.toThrow()
      })
    })
  })
})
