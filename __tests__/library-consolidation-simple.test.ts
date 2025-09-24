/**
 * Simple library consolidation verification
 * Tests that library consolidation was successful without using problematic test setup
 */

import fs from 'fs'
import path from 'path'

// Simple test without vitest setup
console.log('🧪 Testing library consolidation...')

const rootDir = process.cwd()

// Test consolidated lib structure
const libExists = fs.existsSync(path.join(rootDir, 'lib'))
const libDatabaseExists = fs.existsSync(path.join(rootDir, 'lib/database'))
const libPriceEngineExists = fs.existsSync(path.join(rootDir, 'lib/price-engine'))
const libServicesExists = fs.existsSync(path.join(rootDir, 'lib/services'))
const libStrategyEngineExists = fs.existsSync(path.join(rootDir, 'lib/strategy-engine'))

// Test utility files
const utilsExists = fs.existsSync(path.join(rootDir, 'lib/utils.ts'))
const fontsExists = fs.existsSync(path.join(rootDir, 'lib/fonts.ts'))
const i18nExists = fs.existsSync(path.join(rootDir, 'lib/i18n.ts'))
const loadBtcPriceExists = fs.existsSync(path.join(rootDir, 'lib/load-btc-price.ts'))

// Test old src/lib is gone
const oldSrcLibExists = fs.existsSync(path.join(rootDir, 'src/lib'))

// Test Prisma client still exists
const prismaClientExists = fs.existsSync(path.join(rootDir, 'lib/generated/prisma'))

console.log('📁 Directory structure tests:')
console.log(`  ✅ lib/ exists: ${libExists}`)
console.log(`  ✅ lib/database/ exists: ${libDatabaseExists}`)
console.log(`  ✅ lib/price-engine/ exists: ${libPriceEngineExists}`)
console.log(`  ✅ lib/services/ exists: ${libServicesExists}`)
console.log(`  ✅ lib/strategy-engine/ exists: ${libStrategyEngineExists}`)

console.log('📄 Utility files tests:')
console.log(`  ✅ lib/utils.ts exists: ${utilsExists}`)
console.log(`  ✅ lib/fonts.ts exists: ${fontsExists}`)
console.log(`  ✅ lib/i18n.ts exists: ${i18nExists}`)
console.log(`  ✅ lib/load-btc-price.ts exists: ${loadBtcPriceExists}`)

console.log('🗑️ Cleanup tests:')
console.log(`  ✅ src/lib/ removed: ${!oldSrcLibExists}`)

console.log('🔧 Generated files tests:')
console.log(`  ✅ lib/generated/prisma/ exists: ${prismaClientExists}`)

// Overall result
const allTestsPassed = libExists && libDatabaseExists && libPriceEngineExists && 
                      libServicesExists && libStrategyEngineExists && utilsExists && 
                      fontsExists && i18nExists && loadBtcPriceExists && 
                      !oldSrcLibExists && prismaClientExists

if (allTestsPassed) {
  console.log('🎉 All library consolidation tests passed!')
  process.exit(0)
} else {
  console.log('❌ Some library consolidation tests failed!')
  process.exit(1)
}
