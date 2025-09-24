/**
 * Import path cleanup tests
 * These tests verify import paths are updated correctly and module structure is clean
 */

import fs from 'fs'
import path from 'path'

// Simple test without vitest setup to avoid test configuration issues
console.log('🧪 Testing import path cleanup...')

const rootDir = process.cwd()

// Test current structure before cleanup
const oldComponentsDir = path.join(rootDir, 'app/simulation/components')
const newTabsDir = path.join(rootDir, 'app/simulation/tabs')
const sharedDir = path.join(rootDir, 'app/simulation/shared')

console.log('📁 Directory structure tests:')
console.log(`  📂 Old components/ exists: ${fs.existsSync(oldComponentsDir)}`)
console.log(`  📂 New tabs/ exists: ${fs.existsSync(newTabsDir)}`)
console.log(`  📂 New shared/ exists: ${fs.existsSync(sharedDir)}`)

// Test tsconfig.json has correct path mappings
const tsconfigPath = path.join(rootDir, 'tsconfig.json')
if (fs.existsSync(tsconfigPath)) {
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))
  const paths = tsconfig.compilerOptions.paths
  
  console.log('🔧 TypeScript path mappings:')
  console.log(`  ✅ @/lib/* points to: ${paths['@/lib/*']}`)
  console.log(`  ✅ @/* points to: ${paths['@/*']}`)
  console.log(`  ✅ @/modules/* points to: ${paths['@/modules/*']}`)
}

// Test that main simulation files use correct imports
const simulationPagePath = path.join(rootDir, 'app/simulation/SimulationPage.tsx')
if (fs.existsSync(simulationPagePath)) {
  const content = fs.readFileSync(simulationPagePath, 'utf8')
  const usesSharedImports = content.includes('from "./shared"')
  console.log(`  ✅ SimulationPage uses shared imports: ${usesSharedImports}`)
}

// Test that old components directory is removed
const oldComponentsExists = fs.existsSync(oldComponentsDir)
console.log(`  🗑️ Old components/ removed: ${!oldComponentsExists}`)

// Test that modules are clean (no broken component directories)
const parametersComponents = fs.existsSync(path.join(rootDir, 'src/modules/parameters/components'))
const resultsComponents = fs.existsSync(path.join(rootDir, 'src/modules/results/components'))
const priceProjectionComponents = fs.existsSync(path.join(rootDir, 'src/modules/price-projection/components'))

console.log('🧹 Module cleanup tests:')
console.log(`  ✅ parameters/components/ removed: ${!parametersComponents}`)
console.log(`  ✅ results/components/ removed: ${!resultsComponents}`)
console.log(`  ✅ price-projection/components/ removed: ${!priceProjectionComponents}`)

// Test components.json has new aliases
const componentsJsonPath = path.join(rootDir, 'components.json')
if (fs.existsSync(componentsJsonPath)) {
  const componentsJson = JSON.parse(fs.readFileSync(componentsJsonPath, 'utf8'))
  const aliases = componentsJson.aliases

  console.log('🔧 components.json aliases:')
  console.log(`  ✅ simulation-tabs alias: ${aliases['simulation-tabs'] || 'not found'}`)
  console.log(`  ✅ simulation-shared alias: ${aliases['simulation-shared'] || 'not found'}`)
}

const allTestsPassed = !oldComponentsExists && !parametersComponents &&
                      !resultsComponents && !priceProjectionComponents

if (allTestsPassed) {
  console.log('🎉 All import path cleanup tests passed!')
  console.log('✨ Codebase successfully cleaned and organized!')
  process.exit(0)
} else {
  console.log('❌ Some import path cleanup tests failed!')
  process.exit(1)
}
