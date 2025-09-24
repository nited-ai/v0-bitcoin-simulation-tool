/**
 * Agent OS Configuration Validation Tests
 * 
 * Tests to validate that the Agent OS configuration is properly updated
 * after the repository reorganization.
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Agent OS Configuration Validation', () => {
  const rootDir = process.cwd()
  
  describe('Directory Structure', () => {
    it('should have the correct modular directory structure', () => {
      const expectedDirs = [
        'src/modules/parameters',
        'src/modules/price-projection', 
        'src/modules/strategies',
        'src/modules/results',
        'src/modules/price-data',
        'src/modules/shared'
      ]
      
      expectedDirs.forEach(dir => {
        expect(fs.existsSync(path.join(rootDir, dir))).toBe(true)
      })
    })
    
    it('should have proper module index files', () => {
      const modules = ['parameters', 'price-projection', 'strategies', 'results', 'price-data', 'shared']
      
      modules.forEach(module => {
        const indexPath = path.join(rootDir, `src/modules/${module}/index.ts`)
        expect(fs.existsSync(indexPath)).toBe(true)
      })
    })
  })
  
  describe('TypeScript Configuration', () => {
    it('should have correct path mappings in tsconfig.json', () => {
      const tsconfigPath = path.join(rootDir, 'tsconfig.json')
      expect(fs.existsSync(tsconfigPath)).toBe(true)
      
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))
      const paths = tsconfig.compilerOptions.paths
      
      expect(paths['@/modules/*']).toEqual(['./src/modules/*'])
      expect(paths['@/shared/*']).toEqual(['./src/modules/shared/*'])
      expect(paths['@/components/*']).toEqual(['./src/components/*'])
      expect(paths['@/lib/*']).toEqual(['./src/lib/*'])
    })
  })
  
  describe('Module Exports', () => {
    it('should have proper barrel exports for each module', async () => {
      const modules = ['parameters', 'price-projection', 'strategies', 'results', 'price-data', 'shared']
      
      for (const module of modules) {
        const indexPath = path.join(rootDir, `src/modules/${module}/index.ts`)
        const content = fs.readFileSync(indexPath, 'utf8')
        
        // Should have export statements
        expect(content).toMatch(/export\s+/)
        
        // Should not have syntax errors (basic check)
        expect(content).not.toMatch(/import.*from\s+['"]\s*['"]/)
      }
    })
  })
  
  describe('Documentation', () => {
    it('should have architecture documentation', () => {
      const docPaths = [
        'docs/architecture/technical-spec-compliance-status.md'
      ]
      
      docPaths.forEach(docPath => {
        expect(fs.existsSync(path.join(rootDir, docPath))).toBe(true)
      })
    })
  })
  
  describe('Agent OS Files', () => {
    it('should have agent-os specification files', () => {
      const agentOsPaths = [
        '.agent-os/specs/2025-01-09-repository-reorganization/spec.md',
        '.agent-os/specs/2025-01-09-repository-reorganization/tasks.md',
        '.agent-os/specs/2025-01-09-repository-reorganization/sub-specs/technical-spec.md'
      ]
      
      agentOsPaths.forEach(agentPath => {
        expect(fs.existsSync(path.join(rootDir, agentPath))).toBe(true)
      })
    })
  })
  
  describe('Package Configuration', () => {
    it('should have valid package.json', () => {
      const packagePath = path.join(rootDir, 'package.json')
      expect(fs.existsSync(packagePath)).toBe(true)
      
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
      expect(packageJson.name).toBeDefined()
      expect(packageJson.scripts).toBeDefined()
      expect(packageJson.dependencies).toBeDefined()
    })
  })
})
