/**
 * Component reorganization tests
 * These tests verify component organization works correctly during tab-based restructure
 */

import fs from 'fs'
import path from 'path'

// Simple test without vitest setup to avoid test configuration issues
console.log('🧪 Testing component reorganization...')

const rootDir = process.cwd()

// Test current component structure before reorganization
const currentComponentsDir = path.join(rootDir, 'app/simulation/components')
const currentComponentsExist = fs.existsSync(currentComponentsDir)

console.log('📁 Current component structure tests:')
console.log(`  ✅ app/simulation/components/ exists: ${currentComponentsExist}`)

if (currentComponentsExist) {
  // Check current subdirectories
  const parametersDir = fs.existsSync(path.join(currentComponentsDir, 'parameters'))
  const priceModelsDir = fs.existsSync(path.join(currentComponentsDir, 'price-models'))
  const resultsDir = fs.existsSync(path.join(currentComponentsDir, 'results'))
  const chartsDir = fs.existsSync(path.join(currentComponentsDir, 'charts'))
  const navigationDir = fs.existsSync(path.join(currentComponentsDir, 'navigation'))
  const layoutDir = fs.existsSync(path.join(currentComponentsDir, 'layout'))

  console.log(`  📂 parameters/ exists: ${parametersDir}`)
  console.log(`  📂 price-models/ exists: ${priceModelsDir}`)
  console.log(`  📂 results/ exists: ${resultsDir}`)
  console.log(`  📂 charts/ exists: ${chartsDir}`)
  console.log(`  📂 navigation/ exists: ${navigationDir}`)
  console.log(`  📂 layout/ exists: ${layoutDir}`)

  // Check key component files
  const tabNavigation = fs.existsSync(path.join(currentComponentsDir, 'navigation/TabNavigation.tsx'))
  const simulationHeader = fs.existsSync(path.join(currentComponentsDir, 'layout/SimulationHeader.tsx'))
  
  console.log('📄 Key component files:')
  console.log(`  ✅ TabNavigation.tsx exists: ${tabNavigation}`)
  console.log(`  ✅ SimulationHeader.tsx exists: ${simulationHeader}`)
}

// Test that we have the main simulation page
const simulationPage = fs.existsSync(path.join(rootDir, 'app/simulation/SimulationPage.tsx'))
console.log(`  ✅ SimulationPage.tsx exists: ${simulationPage}`)

// Test new tab-based structure
const tabsDir = path.join(rootDir, 'app/simulation/tabs')
const tabsExist = fs.existsSync(tabsDir)

console.log('🎯 Tab-based reorganization tests:')
console.log(`  ✅ app/simulation/tabs/ exists: ${tabsExist}`)

if (tabsExist) {
  // Test tab directories
  const parametersTab = fs.existsSync(path.join(tabsDir, 'parameters'))
  const priceProjectionTab = fs.existsSync(path.join(tabsDir, 'price-projection'))
  const resultsTab = fs.existsSync(path.join(tabsDir, 'results'))

  console.log(`  📂 tabs/parameters/ exists: ${parametersTab}`)
  console.log(`  📂 tabs/price-projection/ exists: ${priceProjectionTab}`)
  console.log(`  📂 tabs/results/ exists: ${resultsTab}`)

  // Test shared directory
  const sharedDir = fs.existsSync(path.join(rootDir, 'app/simulation/shared'))
  console.log(`  📂 shared/ exists: ${sharedDir}`)

  // Test barrel exports
  const parametersIndex = fs.existsSync(path.join(tabsDir, 'parameters/index.ts'))
  const priceProjectionIndex = fs.existsSync(path.join(tabsDir, 'price-projection/index.ts'))
  const resultsIndex = fs.existsSync(path.join(tabsDir, 'results/index.ts'))
  const sharedIndex = fs.existsSync(path.join(rootDir, 'app/simulation/shared/index.ts'))

  console.log('📄 Barrel export files:')
  console.log(`  ✅ parameters/index.ts exists: ${parametersIndex}`)
  console.log(`  ✅ price-projection/index.ts exists: ${priceProjectionIndex}`)
  console.log(`  ✅ results/index.ts exists: ${resultsIndex}`)
  console.log(`  ✅ shared/index.ts exists: ${sharedIndex}`)

  // Test key component files moved
  const basicParametersCard = fs.existsSync(path.join(tabsDir, 'parameters/BasicParametersCard.tsx'))
  const priceModelSelector = fs.existsSync(path.join(tabsDir, 'price-projection/PriceModelSelector.tsx'))
  const resultsPage = fs.existsSync(path.join(tabsDir, 'results/ResultsPage.tsx'))
  const tabNavigation = fs.existsSync(path.join(rootDir, 'app/simulation/shared/navigation/TabNavigation.tsx'))

  console.log('🔧 Key components moved:')
  console.log(`  ✅ BasicParametersCard.tsx: ${basicParametersCard}`)
  console.log(`  ✅ PriceModelSelector.tsx: ${priceModelSelector}`)
  console.log(`  ✅ ResultsPage.tsx: ${resultsPage}`)
  console.log(`  ✅ TabNavigation.tsx: ${tabNavigation}`)

  const allTestsPassed = tabsExist && parametersTab && priceProjectionTab && resultsTab &&
                         sharedDir && parametersIndex && priceProjectionIndex && resultsIndex &&
                         sharedIndex && basicParametersCard && priceModelSelector && resultsPage &&
                         tabNavigation

  if (allTestsPassed) {
    console.log('🎉 All tab-based reorganization tests passed!')
    console.log('✨ Components successfully organized by feature/tab!')
    process.exit(0)
  } else {
    console.log('❌ Some tab-based reorganization tests failed!')
    process.exit(1)
  }
} else {
  console.log('❌ Tab-based structure not found!')
  process.exit(1)
}
