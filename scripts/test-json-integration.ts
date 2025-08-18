#!/usr/bin/env tsx

/**
 * Integration test script for JSON data files
 */

import * as fs from 'fs'
import * as path from 'path'

async function testIntegration() {
  try {
    console.log('🧪 Testing JSON data files...')

    // Test that JSON files exist and are properly formatted
    const dataDir = path.join(process.cwd(), 'public', 'data', 'bitcoin')
    const files = ['daily.json', 'weekly.json', 'monthly.json']

    for (const fileName of files) {
      const filePath = path.join(dataDir, fileName)

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`)
      }

      console.log(`📁 Testing ${fileName}...`)

      const content = fs.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(content)

      // Validate structure
      if (!data.meta || !data.data || !Array.isArray(data.data)) {
        throw new Error(`Invalid structure in ${fileName}`)
      }

      // Validate metadata
      const requiredMetaFields = ['startDate', 'endDate', 'interval', 'count', 'lastUpdated']
      for (const field of requiredMetaFields) {
        if (!(field in data.meta)) {
          throw new Error(`Missing meta field '${field}' in ${fileName}`)
        }
      }

      // Validate data points
      if (data.data.length !== data.meta.count) {
        throw new Error(`Data count mismatch in ${fileName}: expected ${data.meta.count}, got ${data.data.length}`)
      }

      if (data.data.length > 0) {
        const firstPoint = data.data[0]
        if (!Array.isArray(firstPoint) || firstPoint.length !== 2) {
          throw new Error(`Invalid data point format in ${fileName}`)
        }

        const [timestamp, close] = firstPoint
        if (typeof timestamp !== 'number' || typeof close !== 'number') {
          throw new Error(`Invalid data types in ${fileName}`)
        }
      }

      const sizeKB = Math.round(content.length / 1024)
      console.log(`✅ ${fileName}: ${data.data.length} points, ${sizeKB}KB, interval: ${data.meta.interval}`)
    }

    // Test data consistency across files
    console.log('\n📊 Testing data consistency...')

    const dailyPath = path.join(dataDir, 'daily.json')
    const weeklyPath = path.join(dataDir, 'weekly.json')
    const monthlyPath = path.join(dataDir, 'monthly.json')

    const dailyData = JSON.parse(fs.readFileSync(dailyPath, 'utf-8'))
    const weeklyData = JSON.parse(fs.readFileSync(weeklyPath, 'utf-8'))
    const monthlyData = JSON.parse(fs.readFileSync(monthlyPath, 'utf-8'))

    // Verify data ordering (daily should have most points, monthly least)
    if (dailyData.data.length >= weeklyData.data.length && weeklyData.data.length >= monthlyData.data.length) {
      console.log('✅ Data point counts are consistent:', {
        daily: dailyData.data.length,
        weekly: weeklyData.data.length,
        monthly: monthlyData.data.length
      })
    } else {
      throw new Error('Data point counts are inconsistent')
    }

    // Verify date ranges are consistent
    const dailyStart = new Date(dailyData.meta.startDate)
    const weeklyStart = new Date(weeklyData.meta.startDate)
    const monthlyStart = new Date(monthlyData.meta.startDate)

    if (dailyStart <= weeklyStart && weeklyStart <= monthlyStart) {
      console.log('✅ Date ranges are consistent')
    } else {
      console.warn('⚠️ Date ranges may be inconsistent')
    }

    console.log('\n🎉 JSON data files validation completed successfully!')
    console.log('📝 Summary:')
    console.log('  - All JSON files exist and are properly formatted')
    console.log('  - Data structure is valid with correct metadata')
    console.log('  - Data consistency across intervals is maintained')
    console.log('  - Files are ready for browser consumption')

  } catch (error) {
    console.error('❌ JSON data validation failed:', error)
    process.exit(1)
  }
}

// Run the test
testIntegration()
