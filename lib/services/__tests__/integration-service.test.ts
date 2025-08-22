import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IntegrationService } from '../integration-service'
import type { LocalizationConfig } from '../types/localization'

describe('IntegrationService', () => {
  let integration: IntegrationService
  let mockConfig: LocalizationConfig

  beforeEach(() => {
    mockConfig = {
      supportedLocales: ['en', 'de'],
      defaultLocale: 'en',
      localesPath: 'public/locales',
      scanExtensions: ['.tsx', '.ts', '.jsx', '.js'],
      excludeDirectories: ['node_modules', '.git', 'dist'],
      excludePatterns: [/console\.log/, /import.*from/]
    }
    integration = new IntegrationService(mockConfig)
  })

  describe('Build Integration', () => {
    it('should integrate with build process', async () => {
      const mockBuildHook = vi.fn()
      integration.setBuildHook(mockBuildHook)

      const result = await integration.runBuildTimeValidation()

      expect(result.success).toBe(true)
      expect(mockBuildHook).toHaveBeenCalled()
    })

    it('should fail build on validation errors when configured', async () => {
      const mockBuildHook = vi.fn()
      integration.setBuildHook(mockBuildHook)
      integration.setFailOnErrors(true)

      // Mock validation errors
      const mockValidationResult = {
        isValid: false,
        errors: [
          {
            type: 'hardcoded_string' as const,
            message: 'Hardcoded string found',
            filePath: 'test.tsx',
            suggestedFix: 'Use translation'
          }
        ],
        warnings: []
      }

      integration.setMockValidationResult(mockValidationResult)

      const result = await integration.runBuildTimeValidation()

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should generate build reports', async () => {
      const mockReportWriter = vi.fn()
      integration.setReportWriter(mockReportWriter)

      await integration.generateBuildReport()

      expect(mockReportWriter).toHaveBeenCalledWith(
        expect.stringContaining('build-localization-report'),
        expect.any(String)
      )
    })
  })

  describe('Development Integration', () => {
    it('should provide development server middleware', () => {
      const middleware = integration.createDevMiddleware()

      expect(middleware).toBeDefined()
      expect(typeof middleware).toBe('function')
    })

    it('should handle dev server requests', async () => {
      const middleware = integration.createDevMiddleware()
      
      const mockReq = {
        url: '/api/localization/scan',
        method: 'GET'
      }
      
      const mockRes = {
        writeHead: vi.fn(),
        end: vi.fn(),
        setHeader: vi.fn()
      }

      const mockNext = vi.fn()

      await middleware(mockReq, mockRes, mockNext)

      expect(mockRes.writeHead).toHaveBeenCalledWith(200)
      expect(mockRes.end).toHaveBeenCalled()
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json')
    })

    it('should provide hot reload functionality', () => {
      const mockHotReload = vi.fn()
      integration.setHotReloadHook(mockHotReload)

      integration.triggerHotReload(['test.tsx'])

      expect(mockHotReload).toHaveBeenCalledWith(['test.tsx'])
    })
  })

  describe('Git Integration', () => {
    it('should create pre-commit hook', () => {
      const hookContent = integration.generatePreCommitHook()

      expect(hookContent).toContain('#!/bin/sh')
      expect(hookContent).toContain('npm run localization:check')
      expect(hookContent).toContain('exit 1')
    })

    it('should validate staged files only', async () => {
      const mockGetStagedFiles = vi.fn().mockResolvedValue(['test.tsx', 'other.tsx'])
      integration.setGetStagedFiles(mockGetStagedFiles)

      const result = await integration.validateStagedFiles()

      expect(mockGetStagedFiles).toHaveBeenCalled()
      expect(result.scannedFiles).toEqual(['test.tsx', 'other.tsx'])
    })

    it('should install git hooks', async () => {
      const mockWriteFile = vi.fn()
      const mockChmod = vi.fn()
      integration.setFileOperations({ writeFile: mockWriteFile, chmod: mockChmod })

      await integration.installGitHooks()

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('.git/hooks/pre-commit'),
        expect.stringContaining('#!/bin/sh')
      )
      expect(mockChmod).toHaveBeenCalledWith(
        expect.stringContaining('.git/hooks/pre-commit'),
        '755'
      )
    })
  })

  describe('CI/CD Integration', () => {
    it('should generate GitHub Actions workflow', () => {
      const workflow = integration.generateGitHubActionsWorkflow()

      expect(workflow).toContain('name: Localization Check')
      expect(workflow).toContain('runs-on: ubuntu-latest')
      expect(workflow).toContain('npm run localization:validate')
      expect(workflow).toContain('npm run localization:report')
    })

    it('should generate GitLab CI configuration', () => {
      const config = integration.generateGitLabCIConfig()

      expect(config).toContain('localization_check:')
      expect(config).toContain('stage: test')
      expect(config).toContain('npm run localization:validate')
    })

    it('should provide exit codes for CI', async () => {
      integration.setFailOnErrors(true)
      
      const mockValidationResult = {
        isValid: false,
        errors: [{ type: 'hardcoded_string' as const, message: 'Error', filePath: 'test.tsx' }],
        warnings: []
      }
      
      integration.setMockValidationResult(mockValidationResult)

      const result = await integration.runCIValidation()

      expect(result.exitCode).toBe(1)
      expect(result.success).toBe(false)
    })
  })

  describe('IDE Integration', () => {
    it('should generate VS Code extension configuration', () => {
      const config = integration.generateVSCodeConfig()

      expect(config).toContain('"localization.scanOnSave"')
      expect(config).toContain('"localization.showInlineWarnings"')
      expect(config).toContain('"localization.autoGenerateKeys"')
    })

    it('should provide language server protocol support', () => {
      const lspConfig = integration.generateLSPConfig()

      expect(lspConfig.capabilities).toContain('textDocument/publishDiagnostics')
      expect(lspConfig.capabilities).toContain('textDocument/codeAction')
      expect(lspConfig.commands).toContain('localization.extractString')
    })

    it('should generate diagnostic information', () => {
      const diagnostics = integration.generateDiagnostics('test.tsx', [
        {
          text: 'Hardcoded text',
          type: 'jsx_text',
          filePath: 'test.tsx',
          line: 10,
          column: 5,
          suggestedKey: 'test.hardcodedText.text',
          context: '<div>Hardcoded text</div>'
        }
      ])

      expect(diagnostics).toHaveLength(1)
      expect(diagnostics[0].range.start.line).toBe(9) // 0-based
      expect(diagnostics[0].range.start.character).toBe(4) // 0-based
      expect(diagnostics[0].message).toContain('Hardcoded text')
      expect(diagnostics[0].severity).toBe(2) // Warning
    })
  })

  describe('Package Manager Integration', () => {
    it('should generate npm scripts', () => {
      const scripts = integration.generateNpmScripts()

      expect(scripts['localization:scan']).toContain('localization-scanner')
      expect(scripts['localization:validate']).toContain('localization-validator')
      expect(scripts['localization:report']).toContain('localization-reporter')
      expect(scripts['localization:check']).toContain('npm run localization:validate && npm run localization:report')
    })

    it('should provide package.json configuration', () => {
      const config = integration.generatePackageJsonConfig()

      expect(config.localization).toBeDefined()
      expect(config.localization.supportedLocales).toEqual(['en', 'de'])
      expect(config.localization.scanExtensions).toEqual(['.tsx', '.ts', '.jsx', '.js'])
    })

    it('should handle different package managers', () => {
      const npmCommands = integration.generateCommands('npm')
      const yarnCommands = integration.generateCommands('yarn')
      const pnpmCommands = integration.generateCommands('pnpm')

      expect(npmCommands.install).toBe('npm install')
      expect(yarnCommands.install).toBe('yarn add')
      expect(pnpmCommands.install).toBe('pnpm add')
    })
  })

  describe('Configuration Management', () => {
    it('should validate configuration', () => {
      const validConfig = {
        supportedLocales: ['en', 'de'],
        defaultLocale: 'en',
        localesPath: 'public/locales',
        scanExtensions: ['.tsx'],
        excludeDirectories: ['node_modules'],
        excludePatterns: []
      }

      const result = integration.validateConfig(validConfig)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect configuration errors', () => {
      const invalidConfig = {
        supportedLocales: [], // Empty array
        defaultLocale: 'fr', // Not in supported locales
        localesPath: '', // Empty path
        scanExtensions: ['.txt'], // Invalid extension
        excludeDirectories: [],
        excludePatterns: []
      }

      const result = integration.validateConfig(invalidConfig)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should merge configurations', () => {
      const baseConfig = {
        supportedLocales: ['en'],
        defaultLocale: 'en',
        localesPath: 'locales',
        scanExtensions: ['.tsx'],
        excludeDirectories: ['node_modules'],
        excludePatterns: []
      }

      const overrideConfig = {
        supportedLocales: ['en', 'de', 'fr'],
        scanExtensions: ['.tsx', '.ts']
      }

      const merged = integration.mergeConfigs(baseConfig, overrideConfig)

      expect(merged.supportedLocales).toEqual(['en', 'de', 'fr'])
      expect(merged.scanExtensions).toEqual(['.tsx', '.ts'])
      expect(merged.defaultLocale).toBe('en') // Preserved from base
    })
  })
})
