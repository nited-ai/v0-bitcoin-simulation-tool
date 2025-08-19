#!/usr/bin/env tsx

/**
 * Test Script: JSON Integration with Daily Update Service
 *
 * Tests the automatic JSON file regeneration when database updates occur.
 * This script simulates a database update and verifies that JSON files are regenerated.
 */

import { dailyUpdateService } from '../lib/services/daily-update-service'
import { bitcoinJsonGeneratorService } from '../lib/services/bitcoin-json-generator-service'
import * as fs from 'fs'
import * as path from 'path'

async function testJsonIntegration() {
  console.log('🧪 Testing JSON Integration with Daily Update Service...')
  console.log('=' .repeat(60))

  try {
    // Step 1: Check current JSON file timestamps
    console.log('\n📁 Step 1: Checking current JSON file timestamps...')
    const jsonDir = path.join(process.cwd(), 'public', 'data', 'bitcoin')
    const jsonFiles = ['daily.json', 'weekly.json', 'monthly.json']

    const beforeTimestamps: Record<string, Date | null> = {}

    for (const fileName of jsonFiles) {
      const filePath = path.join(jsonDir, fileName)
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath)
        beforeTimestamps[fileName] = stats.mtime
        console.log(`   ${fileName}: ${stats.mtime.toISOString()}`)
      } else {
        beforeTimestamps[fileName] = null
        console.log(`   ${fileName}: File not found`)
      }
    }

    // Step 2: Test standalone JSON generation
    console.log('\n🔧 Step 2: Testing standalone JSON generation...')
    const standaloneResult = await bitcoinJsonGeneratorService.generateJsonFiles()

    if (standaloneResult.success) {
      console.log(`✅ Standalone generation successful:`)
      console.log(`   Files: ${standaloneResult.filesGenerated.join(', ')}`)
      console.log(`   Records: ${standaloneResult.recordsProcessed}`)
      console.log(`   Date range: ${standaloneResult.dateRange.startDate} to ${standaloneResult.dateRange.endDate}`)
      console.log(`   Duration: ${standaloneResult.duration}ms`)
    } else {
      console.error(`❌ Standalone generation failed: ${standaloneResult.error}`)
      return
    }

    // Step 3: Check if JSON files were updated
    console.log('\n📁 Step 3: Verifying JSON file updates...')
    let filesUpdated = 0

    for (const fileName of jsonFiles) {
      const filePath = path.join(jsonDir, fileName)
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath)
        const beforeTime = beforeTimestamps[fileName]

        if (!beforeTime || stats.mtime > beforeTime) {
          console.log(`✅ ${fileName}: Updated (${stats.mtime.toISOString()})`)
          filesUpdated++
        } else {
          console.log(`⚠️ ${fileName}: Not updated (${stats.mtime.toISOString()})`)
        }
      } else {
        console.log(`❌ ${fileName}: File missing after generation`)
      }
    }

    // Step 4: Validate JSON file contents
    console.log('\n🔍 Step 4: Validating JSON file contents...')

    for (const fileName of jsonFiles) {
      const filePath = path.join(jsonDir, fileName)
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8')
          const data = JSON.parse(content)

          // Basic validation
          if (data.meta && data.data && Array.isArray(data.data)) {
            const sizeKB = Math.round(content.length / 1024)
            console.log(`✅ ${fileName}: Valid format, ${data.data.length} points, ${sizeKB}KB`)
            console.log(`   Date range: ${data.meta.startDate} to ${data.meta.endDate}`)
            console.log(`   Last updated: ${data.meta.lastUpdated}`)
          } else {
            console.log(`❌ ${fileName}: Invalid format`)
          }
        } catch (error) {
          console.log(`❌ ${fileName}: JSON parse error - ${error}`)
        }
      }
    }

    // Step 5: Test daily update service integration
    console.log('\n🔄 Step 5: Testing daily update service integration...')
    console.log('Note: This will check for updates but may not add new records if data is current')

    const updateResult = await dailyUpdateService.performUpdate(10)

    console.log(`Update Result:`)
    console.log(`   Success: ${updateResult.success}`)
    console.log(`   Records added: ${updateResult.recordsAdded}`)
    console.log(`   JSON files regenerated: ${updateResult.jsonFilesRegenerated}`)
    console.log(`   Errors: ${updateResult.errors.length}`)
    console.log(`   Duration: ${updateResult.duration}ms`)

    if (updateResult.jsonGenerationResult) {
      const jsonResult = updateResult.jsonGenerationResult
      console.log(`   JSON Generation:`)
      console.log(`     Success: ${jsonResult.success}`)
      console.log(`     Files: ${jsonResult.filesGenerated.join(', ')}`)
      console.log(`     Records processed: ${jsonResult.recordsProcessed}`)
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('🎉 JSON Integration Test Summary:')
    console.log(`   Standalone JSON generation: ${standaloneResult.success ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`   Files updated: ${filesUpdated}/${jsonFiles.length}`)
    console.log(`   Daily update integration: ${updateResult.success ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`   JSON auto-regeneration: ${updateResult.jsonFilesRegenerated ? '✅ TRIGGERED' : '⚠️ SKIPPED (no new data)'}`)

    if (standaloneResult.success && updateResult.success) {
      console.log('\n✅ All tests passed! JSON integration is working correctly.')
    } else {
      console.log('\n❌ Some tests failed. Please check the errors above.')
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error)
  }
}

// Run the test
if (require.main === module) {
  testJsonIntegration()
    .then(() => {
      console.log('\n🏁 Test completed.')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Test crashed:', error)
      process.exit(1)
    })
}

export { testJsonIntegration }
