import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { HardcodedString, DetectionPattern } from '../types/localization'

// Mock git operations
vi.mock('child_process', () => ({
  execSync: vi.fn()
}))

import { StringDetectionService } from '../string-detection-service'

describe('StringDetectionService', () => {
  let service: StringDetectionService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new StringDetectionService()
  })

  describe('getStagedFiles', () => {
    it('should return only staged .tsx and .ts files', async () => {
      const { execSync } = await import('child_process')
      const mockExecSync = vi.mocked(execSync)

      mockExecSync.mockReturnValue(`
        app/simulation/components/navigation/TabNavigation.tsx
        app/simulation/components/parameters/BasicParametersCard.tsx
        lib/utils.ts
        package.json
        README.md
      ` as any)

      const stagedFiles = service.getStagedFiles()

      expect(mockExecSync).toHaveBeenCalledWith('git diff --cached --name-only', { encoding: 'utf8' })
      expect(stagedFiles).toEqual([
        'app/simulation/components/navigation/TabNavigation.tsx',
        'app/simulation/components/parameters/BasicParametersCard.tsx',
        'lib/utils.ts'
      ])
    })

    it('should return empty array when no staged files', async () => {
      const { execSync } = await import('child_process')
      const mockExecSync = vi.mocked(execSync)

      mockExecSync.mockReturnValue('' as any)

      const stagedFiles = service.getStagedFiles()

      expect(stagedFiles).toEqual([])
    })

    it('should handle git command errors gracefully', async () => {
      const { execSync } = await import('child_process')
      const mockExecSync = vi.mocked(execSync)

      mockExecSync.mockImplementation(() => {
        throw new Error('Not a git repository')
      })

      const stagedFiles = service.getStagedFiles()

      expect(stagedFiles).toEqual([])
    })
  })

  describe('detectHardcodedStrings', () => {
    it('should detect JSX text content', () => {
      const content = `
        export function TestComponent() {
          return (
            <div>
              <h1>Hardcoded Title</h1>
              <p>Some hardcoded text</p>
            </div>
          )
        }
      `

      const detected = service.detectHardcodedStrings(content, 'TestComponent.tsx')

      expect(detected).toHaveLength(2)
      expect(detected[0]).toMatchObject({
        text: 'Hardcoded Title',
        type: 'jsx_text',
        line: expect.any(Number),
        suggestedKey: 'TestComponent.hardcodedTitle.text'
      })
      expect(detected[1]).toMatchObject({
        text: 'Some hardcoded text',
        type: 'jsx_text',
        line: expect.any(Number),
        suggestedKey: 'TestComponent.someHardcodedText.text'
      })
    })

    it('should detect button labels', () => {
      const content = `
        <Button onClick={handleClick}>
          Save Changes
        </Button>
        <Button variant="outline">Cancel</Button>
      `

      const detected = service.detectHardcodedStrings(content, 'TestComponent.tsx')

      // The JSX text pattern will also match button content, so we expect more matches
      const buttonMatches = detected.filter(d => d.type === 'button_label')
      expect(buttonMatches).toHaveLength(2)
      expect(buttonMatches[0]).toMatchObject({
        text: 'Save Changes',
        type: 'button_label',
        suggestedKey: 'TestComponent.saveChanges.button'
      })
      expect(buttonMatches[1]).toMatchObject({
        text: 'Cancel',
        type: 'button_label',
        suggestedKey: 'TestComponent.cancel.button'
      })
    })

    it('should detect tooltip content', () => {
      const content = `
        <TooltipContent>
          <p>This is helpful information</p>
        </TooltipContent>
        <Tooltip>
          <TooltipTrigger>Help</TooltipTrigger>
          <TooltipContent>More help text</TooltipContent>
        </Tooltip>
      `

      const detected = service.detectHardcodedStrings(content, 'TestComponent.tsx')

      // JSX text pattern will also match, so we expect both jsx_text and tooltip types
      const tooltipMatches = detected.filter(d => d.type === 'tooltip')
      const jsxMatches = detected.filter(d => d.type === 'jsx_text')

      // Should have at least one tooltip match
      expect(tooltipMatches.length).toBeGreaterThan(0)

      // The "This is helpful information" should be detected (either as tooltip or jsx_text)
      const helpfulInfoMatch = detected.find(d => d.text === 'This is helpful information')
      expect(helpfulInfoMatch).toBeDefined()
      expect(helpfulInfoMatch?.suggestedKey).toContain('TestComponent.')
    })

    it('should exclude technical strings', () => {
      const content = `
        console.log('Debug message')
        const className = 'flex items-center'
        throw new Error('TECHNICAL_ERROR_CODE')
        import { something } from './utils'
        
        return <div>User visible text</div>
      `

      const detected = service.detectHardcodedStrings(content, 'TestComponent.tsx')

      expect(detected).toHaveLength(1)
      expect(detected[0].text).toBe('User visible text')
    })

    it('should handle strings already using translation functions', () => {
      const content = `
        return (
          <div>
            <h1>{t('Component.title')}</h1>
            <p>Hardcoded text</p>
            <span>{safeT('Component.description', 'Fallback')}</span>
          </div>
        )
      `

      const detected = service.detectHardcodedStrings(content, 'TestComponent.tsx')

      expect(detected).toHaveLength(1)
      expect(detected[0].text).toBe('Hardcoded text')
    })
  })

  describe('generateTranslationKey', () => {
    it('should generate consistent keys for component names', () => {
      const key1 = service.generateTranslationKey('BasicParametersCard.tsx', 'Initial BTC Price', 'form_label')
      const key2 = service.generateTranslationKey('BasicParametersCard.tsx', 'BTC Amount', 'form_label')

      expect(key1).toBe('BasicParametersCard.initialBtcPrice.label')
      expect(key2).toBe('BasicParametersCard.btcAmount.label')
    })

    it('should handle special characters and spaces', () => {
      const key = service.generateTranslationKey('TestComponent.tsx', 'Save & Continue...', 'button_label')

      // Should include hash suffix because of the "..." in the text
      expect(key).toMatch(/^TestComponent\.saveContinue\.button\.[a-z0-9]+$/)
    })

    it('should generate unique keys for similar text', () => {
      const key1 = service.generateTranslationKey('Component.tsx', 'Loading', 'jsx_text')
      const key2 = service.generateTranslationKey('Component.tsx', 'Loading...', 'jsx_text')

      expect(key1).not.toBe(key2)
    })
  })

  describe('scanStagedFiles', () => {
    it('should scan all staged files and return comprehensive results', async () => {
      const { execSync } = await import('child_process')
      const mockExecSync = vi.mocked(execSync)

      mockExecSync
        .mockReturnValueOnce('app/test/Component.tsx\n' as any)
        .mockReturnValueOnce(`
          export function Component() {
            return <div>Test content</div>
          }
        ` as any)

      const results = await service.scanStagedFiles()

      expect(results).toHaveProperty('files')
      expect(results).toHaveProperty('totalStrings')
      expect(results).toHaveProperty('byType')
      expect(results.files).toHaveLength(1)
      expect(results.totalStrings).toBeGreaterThan(0)
    })
  })
})
