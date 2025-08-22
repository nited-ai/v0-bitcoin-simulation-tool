import { describe, it, expect, beforeEach } from 'vitest'
import { TranslationKeyGenerator } from '../translation-key-generator'
import type { DetectionType } from '../types/localization'

describe('TranslationKeyGenerator', () => {
  let generator: TranslationKeyGenerator

  beforeEach(() => {
    generator = new TranslationKeyGenerator()
  })

  describe('Component Name Extraction', () => {
    it('should extract component name from file path', () => {
      const testCases = [
        { path: 'app/components/BasicParametersCard.tsx', expected: 'BasicParametersCard' },
        { path: 'src/ui/TabNavigation.jsx', expected: 'TabNavigation' },
        { path: 'components/forms/LoginForm.ts', expected: 'LoginForm' },
        { path: 'pages/dashboard/index.tsx', expected: 'index' }
      ]

      testCases.forEach(({ path, expected }) => {
        const componentName = generator.extractComponentName(path)
        expect(componentName).toBe(expected)
      })
    })

    it('should handle nested directory structures', () => {
      const path = 'app/simulation/components/parameters/LoanParametersCard.tsx'
      const componentName = generator.extractComponentName(path)
      expect(componentName).toBe('LoanParametersCard')
    })
  })

  describe('Text to Key Conversion', () => {
    it('should convert simple text to camelCase key', () => {
      const testCases = [
        { text: 'Save Changes', expected: 'saveChanges' },
        { text: 'Initial BTC Price', expected: 'initialBtcPrice' },
        { text: 'Monthly Amount', expected: 'monthlyAmount' },
        { text: 'Back to Landing', expected: 'backToLanding' }
      ]

      testCases.forEach(({ text, expected }) => {
        const key = generator.textToKey(text)
        expect(key).toBe(expected)
      })
    })

    it('should handle special characters and punctuation', () => {
      const testCases = [
        { text: 'Save & Continue...', expected: 'saveContinue' },
        { text: 'User\'s Profile', expected: 'usersProfile' },
        { text: 'E-mail Address', expected: 'emailAddress' },
        { text: 'Price (USD)', expected: 'priceUsd' },
        { text: 'Coming Soon!', expected: 'comingSoon' }
      ]

      testCases.forEach(({ text, expected }) => {
        const key = generator.textToKey(text)
        expect(key).toBe(expected)
      })
    })

    it('should handle numbers and mixed content', () => {
      const testCases = [
        { text: 'Step 1 of 3', expected: 'step1Of3' },
        { text: '24/7 Support', expected: '247Support' },
        { text: 'Version 2.0', expected: 'version20' }
      ]

      testCases.forEach(({ text, expected }) => {
        const key = generator.textToKey(text)
        expect(key).toBe(expected)
      })
    })

    it('should handle edge cases', () => {
      const testCases = [
        { text: '', expected: 'text' }, // Empty string fallback
        { text: '   ', expected: 'text' }, // Whitespace only
        { text: '!!!', expected: 'text' }, // Special chars only
        { text: 'a', expected: 'a' }, // Single character
        { text: 'A B C', expected: 'aBC' } // Single letters
      ]

      testCases.forEach(({ text, expected }) => {
        const key = generator.textToKey(text)
        expect(key).toBe(expected)
      })
    })
  })

  describe('Type Suffix Generation', () => {
    it('should generate correct suffixes for different types', () => {
      const testCases: Array<{ type: DetectionType; expected: string }> = [
        { type: 'jsx_text', expected: 'text' },
        { type: 'button_label', expected: 'button' },
        { type: 'tooltip', expected: 'tooltip' },
        { type: 'placeholder', expected: 'placeholder' },
        { type: 'error_message', expected: 'error' },
        { type: 'validation_message', expected: 'validation' },
        { type: 'chart_label', expected: 'label' },
        { type: 'alert_message', expected: 'alert' },
        { type: 'modal_content', expected: 'modal' },
        { type: 'form_label', expected: 'label' }
      ]

      testCases.forEach(({ type, expected }) => {
        const suffix = generator.getTypeSuffix(type)
        expect(suffix).toBe(expected)
      })
    })
  })

  describe('Full Key Generation', () => {
    it('should generate complete translation keys', () => {
      const testCases = [
        {
          filePath: 'app/components/BasicParametersCard.tsx',
          text: 'Initial BTC Price',
          type: 'form_label' as DetectionType,
          expected: 'BasicParametersCard.initialBtcPrice.label'
        },
        {
          filePath: 'src/navigation/TabNavigation.jsx',
          text: 'Coming Soon',
          type: 'jsx_text' as DetectionType,
          expected: 'TabNavigation.comingSoon.text'
        },
        {
          filePath: 'components/ui/Button.tsx',
          text: 'Save Changes',
          type: 'button_label' as DetectionType,
          expected: 'Button.saveChanges.button'
        }
      ]

      testCases.forEach(({ filePath, text, type, expected }) => {
        const key = generator.generateKey(filePath, text, type)
        expect(key).toBe(expected)
      })
    })

    it('should handle duplicate prevention with hash suffixes', () => {
      const key1 = generator.generateKey('Component.tsx', 'Loading...', 'jsx_text')
      const key2 = generator.generateKey('Component.tsx', 'Loading', 'jsx_text')
      
      // Keys should be different due to different text content
      expect(key1).not.toBe(key2)
      
      // Both should contain the component name and base key
      expect(key1).toContain('Component.loading')
      expect(key2).toContain('Component.loading')
    })
  })

  describe('Key Validation', () => {
    it('should validate key format', () => {
      const validKeys = [
        'Component.element.type',
        'BasicParametersCard.initialBtcPrice.label',
        'Navigation.parameters.shortLabel'
      ]

      const invalidKeys = [
        'component', // Missing parts
        'Component.', // Incomplete
        '.element.type', // Missing component
        'Component..type', // Empty element
        'Component.element.', // Missing type
        'Component element type' // Wrong format
      ]

      validKeys.forEach(key => {
        expect(generator.isValidKey(key)).toBe(true)
      })

      invalidKeys.forEach(key => {
        expect(generator.isValidKey(key)).toBe(false)
      })
    })

    it('should detect potential key conflicts', () => {
      const keys = [
        'Component.save.button',
        'Component.save.label',
        'Component.save.button', // Duplicate
        'OtherComponent.save.button' // Different component, OK
      ]

      const conflicts = generator.findKeyConflicts(keys)
      
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0]).toBe('Component.save.button')
    })
  })

  describe('Batch Key Generation', () => {
    it('should generate keys for multiple strings', () => {
      const strings = [
        { filePath: 'Component.tsx', text: 'Save', type: 'button_label' as DetectionType },
        { filePath: 'Component.tsx', text: 'Cancel', type: 'button_label' as DetectionType },
        { filePath: 'Component.tsx', text: 'Help text', type: 'tooltip' as DetectionType }
      ]

      const keys = generator.generateBatchKeys(strings)

      expect(keys).toHaveLength(3)
      expect(keys[0]).toBe('Component.save.button')
      expect(keys[1]).toBe('Component.cancel.button')
      expect(keys[2]).toBe('Component.helpText.tooltip')
    })

    it('should handle conflicts in batch generation', () => {
      const strings = [
        { filePath: 'Component.tsx', text: 'Save', type: 'button_label' as DetectionType },
        { filePath: 'Component.tsx', text: 'Save', type: 'jsx_text' as DetectionType }
      ]

      const keys = generator.generateBatchKeys(strings)

      expect(keys).toHaveLength(2)
      expect(keys[0]).toBe('Component.save.button')
      expect(keys[1]).toBe('Component.save.text')
      // Should be different due to different types
    })
  })

  describe('Custom Configuration', () => {
    it('should allow custom naming conventions', () => {
      const customGenerator = new TranslationKeyGenerator({
        separator: '_',
        caseStyle: 'snake_case'
      })

      const key = customGenerator.generateKey('Component.tsx', 'Save Changes', 'button_label')
      expect(key).toBe('component_save_changes_button')
    })

    it('should allow custom type suffixes', () => {
      const customGenerator = new TranslationKeyGenerator({
        typeSuffixes: {
          button_label: 'btn',
          tooltip: 'tip'
        }
      })

      const key1 = customGenerator.generateKey('Component.tsx', 'Save', 'button_label')
      const key2 = customGenerator.generateKey('Component.tsx', 'Help', 'tooltip')
      
      expect(key1).toBe('Component.save.btn')
      expect(key2).toBe('Component.help.tip')
    })
  })
})
