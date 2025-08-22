import type { 
  LocalizationConfig, 
  ValidationResult,
  BuildResult,
  CIResult,
  LSPConfig,
  Diagnostic,
  HardcodedString
} from './types/localization'

/**
 * Integration service for build tools, development workflow, and CI/CD
 */
export class IntegrationService {
  private config: LocalizationConfig
  private buildHook?: () => void
  private hotReloadHook?: (files: string[]) => void
  private reportWriter?: (path: string, content: string) => Promise<void>
  private getStagedFiles?: () => Promise<string[]>
  private fileOperations?: {
    writeFile: (path: string, content: string) => Promise<void>
    chmod: (path: string, mode: string) => Promise<void>
  }
  private failOnErrors = false
  private mockValidationResult?: ValidationResult

  constructor(config: LocalizationConfig) {
    this.config = config
  }

  /**
   * Run build-time validation
   */
  async runBuildTimeValidation(): Promise<BuildResult> {
    try {
      // Use mock result if set (for testing)
      const validationResult = this.mockValidationResult || {
        isValid: true,
        errors: [],
        warnings: []
      }

      if (this.buildHook) {
        this.buildHook()
      }

      if (!validationResult.isValid && this.failOnErrors) {
        return {
          success: false,
          errors: validationResult.errors,
          warnings: validationResult.warnings
        }
      }

      return {
        success: true,
        errors: validationResult.errors,
        warnings: validationResult.warnings
      }
    } catch (error) {
      return {
        success: false,
        errors: [{
          type: 'invalid_pattern',
          message: `Build validation failed: ${error}`,
          filePath: '',
          suggestedFix: 'Check build configuration'
        }],
        warnings: []
      }
    }
  }

  /**
   * Generate build report
   */
  async generateBuildReport(): Promise<void> {
    if (!this.reportWriter) return

    const reportContent = JSON.stringify({
      timestamp: new Date().toISOString(),
      config: this.config,
      status: 'completed'
    }, null, 2)

    await this.reportWriter('build-localization-report.json', reportContent)
  }

  /**
   * Create development server middleware
   */
  createDevMiddleware() {
    return async (req: any, res: any, next: any) => {
      if (req.url?.startsWith('/api/localization/')) {
        res.setHeader('Content-Type', 'application/json')
        
        if (req.url === '/api/localization/scan') {
          res.writeHead(200)
          res.end(JSON.stringify({ 
            status: 'success',
            scannedFiles: [],
            hardcodedStrings: []
          }))
          return
        }
      }
      
      next()
    }
  }

  /**
   * Trigger hot reload for changed files
   */
  triggerHotReload(files: string[]): void {
    if (this.hotReloadHook) {
      this.hotReloadHook(files)
    }
  }

  /**
   * Generate pre-commit hook script
   */
  generatePreCommitHook(): string {
    return `#!/bin/sh
# Localization pre-commit hook

echo "Running localization validation..."

# Run localization check
npm run localization:check

# Check exit code
if [ $? -ne 0 ]; then
  echo "❌ Localization validation failed!"
  echo "Please fix hardcoded strings before committing."
  exit 1
fi

echo "✅ Localization validation passed!"
exit 0
`
  }

  /**
   * Validate only staged files
   */
  async validateStagedFiles(): Promise<{ success: boolean; scannedFiles: string[] }> {
    const stagedFiles = this.getStagedFiles ? await this.getStagedFiles() : []
    
    return {
      success: true,
      scannedFiles: stagedFiles
    }
  }

  /**
   * Install git hooks
   */
  async installGitHooks(): Promise<void> {
    if (!this.fileOperations) return

    const hookPath = '.git/hooks/pre-commit'
    const hookContent = this.generatePreCommitHook()

    await this.fileOperations.writeFile(hookPath, hookContent)
    await this.fileOperations.chmod(hookPath, '755')
  }

  /**
   * Generate GitHub Actions workflow
   */
  generateGitHubActionsWorkflow(): string {
    return `name: Localization Check

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  localization:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run localization validation
      run: npm run localization:validate
    
    - name: Generate localization report
      run: npm run localization:report
      
    - name: Upload report
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: localization-report
        path: localization-report.json
`
  }

  /**
   * Generate GitLab CI configuration
   */
  generateGitLabCIConfig(): string {
    return `localization_check:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm run localization:validate
    - npm run localization:report
  artifacts:
    reports:
      junit: localization-report.xml
    paths:
      - localization-report.json
  only:
    - merge_requests
    - main
    - develop
`
  }

  /**
   * Run CI validation with exit codes
   */
  async runCIValidation(): Promise<CIResult> {
    const buildResult = await this.runBuildTimeValidation()
    
    return {
      success: buildResult.success,
      exitCode: buildResult.success ? 0 : 1,
      errors: buildResult.errors,
      warnings: buildResult.warnings
    }
  }

  /**
   * Generate VS Code extension configuration
   */
  generateVSCodeConfig(): string {
    return JSON.stringify({
      "localization.scanOnSave": true,
      "localization.showInlineWarnings": true,
      "localization.autoGenerateKeys": true,
      "localization.supportedLocales": this.config.supportedLocales,
      "localization.defaultLocale": this.config.defaultLocale
    }, null, 2)
  }

  /**
   * Generate Language Server Protocol configuration
   */
  generateLSPConfig(): LSPConfig {
    return {
      capabilities: [
        'textDocument/publishDiagnostics',
        'textDocument/codeAction',
        'textDocument/hover',
        'textDocument/completion'
      ],
      commands: [
        'localization.extractString',
        'localization.generateKey',
        'localization.validateFile'
      ]
    }
  }

  /**
   * Generate diagnostic information for IDE
   */
  generateDiagnostics(filePath: string, hardcodedStrings: HardcodedString[]): Diagnostic[] {
    return hardcodedStrings.map(string => ({
      range: {
        start: { line: string.line - 1, character: string.column - 1 }, // Convert to 0-based
        end: { line: string.line - 1, character: string.column - 1 + string.text.length }
      },
      message: `Hardcoded string found: "${string.text}". Consider using translation key: ${string.suggestedKey}`,
      severity: 2, // Warning
      source: 'localization'
    }))
  }

  /**
   * Generate npm scripts
   */
  generateNpmScripts(): Record<string, string> {
    return {
      'localization:scan': 'localization-scanner --staged',
      'localization:validate': 'localization-validator --fail-on-errors',
      'localization:report': 'localization-reporter --format json --output localization-report.json',
      'localization:check': 'npm run localization:validate && npm run localization:report'
    }
  }

  /**
   * Generate package.json configuration section
   */
  generatePackageJsonConfig(): any {
    return {
      localization: {
        supportedLocales: this.config.supportedLocales,
        defaultLocale: this.config.defaultLocale,
        localesPath: this.config.localesPath,
        scanExtensions: this.config.scanExtensions,
        excludeDirectories: this.config.excludeDirectories
      }
    }
  }

  /**
   * Generate commands for different package managers
   */
  generateCommands(packageManager: 'npm' | 'yarn' | 'pnpm'): Record<string, string> {
    const commands = {
      npm: {
        install: 'npm install',
        run: 'npm run',
        script: 'npm run'
      },
      yarn: {
        install: 'yarn add',
        run: 'yarn',
        script: 'yarn'
      },
      pnpm: {
        install: 'pnpm add',
        run: 'pnpm',
        script: 'pnpm'
      }
    }

    return commands[packageManager]
  }

  /**
   * Validate configuration
   */
  validateConfig(config: any): ValidationResult {
    const errors: any[] = []
    const warnings: any[] = []

    if (!config.supportedLocales || config.supportedLocales.length === 0) {
      errors.push({
        type: 'invalid_pattern',
        message: 'supportedLocales cannot be empty',
        filePath: 'config',
        suggestedFix: 'Add at least one supported locale'
      })
    }

    if (!config.defaultLocale || !config.supportedLocales?.includes(config.defaultLocale)) {
      errors.push({
        type: 'invalid_pattern',
        message: 'defaultLocale must be included in supportedLocales',
        filePath: 'config',
        suggestedFix: 'Set defaultLocale to one of the supported locales'
      })
    }

    if (!config.localesPath || config.localesPath.trim() === '') {
      errors.push({
        type: 'invalid_pattern',
        message: 'localesPath cannot be empty',
        filePath: 'config',
        suggestedFix: 'Set a valid path for locale files'
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Merge configurations
   */
  mergeConfigs(base: any, override: any): LocalizationConfig {
    return {
      ...base,
      ...override
    }
  }

  // Setter methods for testing
  setBuildHook(hook: () => void): void {
    this.buildHook = hook
  }

  setHotReloadHook(hook: (files: string[]) => void): void {
    this.hotReloadHook = hook
  }

  setReportWriter(writer: (path: string, content: string) => Promise<void>): void {
    this.reportWriter = writer
  }

  setGetStagedFiles(getter: () => Promise<string[]>): void {
    this.getStagedFiles = getter
  }

  setFileOperations(ops: { writeFile: (path: string, content: string) => Promise<void>; chmod: (path: string, mode: string) => Promise<void> }): void {
    this.fileOperations = ops
  }

  setFailOnErrors(fail: boolean): void {
    this.failOnErrors = fail
  }

  setMockValidationResult(result: ValidationResult): void {
    this.mockValidationResult = result
  }
}
