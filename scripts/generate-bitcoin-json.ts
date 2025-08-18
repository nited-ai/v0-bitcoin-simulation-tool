#!/usr/bin/env tsx

/**
 * Bitcoin JSON Data Generation Script
 * 
 * Converts existing bitcoin-price-backup.json to optimized JSON files
 * for improved loading performance in the Bitcoin simulation tool.
 */

import * as fs from 'fs'
import * as path from 'path'

export interface BitcoinPriceRecord {
  date: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
  source: string
}

export interface OptimizedBitcoinData {
  meta: {
    startDate: string
    endDate: string
    interval: 'daily' | 'weekly' | 'monthly'
    count: number
    lastUpdated: string
  }
  data: [number, number][] // [timestamp, close]
}

/**
 * Convert backup data to optimized format
 */
export function convertBackupDataToOptimized(records: BitcoinPriceRecord[]): OptimizedBitcoinData {
  if (records.length === 0) {
    return {
      meta: {
        startDate: '',
        endDate: '',
        interval: 'daily',
        count: 0,
        lastUpdated: new Date().toISOString()
      },
      data: []
    }
  }

  // Sort by timestamp to ensure chronological order
  const sortedRecords = [...records].sort((a, b) => a.timestamp - b.timestamp)

  // Deduplicate by timestamp (keep the last entry for each timestamp)
  const deduplicatedRecords = new Map<number, BitcoinPriceRecord>()
  for (const record of sortedRecords) {
    deduplicatedRecords.set(record.timestamp, record)
  }

  // Convert to optimized format [timestamp, close]
  const data: [number, number][] = Array.from(deduplicatedRecords.values()).map(record => [
    record.timestamp,
    record.close
  ])

  const metadata = generateMetadata(data, 'daily')

  return {
    meta: metadata,
    data
  }
}

/**
 * Generate weekly aggregated data from daily data
 */
export function generateWeeklyData(dailyData: OptimizedBitcoinData): OptimizedBitcoinData {
  const weeklyData: [number, number][] = []
  
  // Group data by week (every 7 days)
  for (let i = 0; i < dailyData.data.length; i += 7) {
    const weekData = dailyData.data.slice(i, i + 7)
    if (weekData.length > 0) {
      // Use the last day of the week as representative
      const lastDayOfWeek = weekData[weekData.length - 1]
      weeklyData.push(lastDayOfWeek)
    }
  }

  const metadata = generateMetadata(weeklyData, 'weekly')

  return {
    meta: metadata,
    data: weeklyData
  }
}

/**
 * Generate monthly aggregated data from daily data
 */
export function generateMonthlyData(dailyData: OptimizedBitcoinData): OptimizedBitcoinData {
  const monthlyData: [number, number][] = []
  const monthlyGroups = new Map<string, [number, number]>()

  // Group by month
  for (const [timestamp, close] of dailyData.data) {
    const date = new Date(timestamp)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    // Keep the last day of each month
    if (!monthlyGroups.has(monthKey) || timestamp > monthlyGroups.get(monthKey)![0]) {
      monthlyGroups.set(monthKey, [timestamp, close])
    }
  }

  // Convert to array and sort by timestamp
  const sortedMonthlyData = Array.from(monthlyGroups.values())
    .sort((a, b) => a[0] - b[0])

  const metadata = generateMetadata(sortedMonthlyData, 'monthly')

  return {
    meta: metadata,
    data: sortedMonthlyData
  }
}

/**
 * Generate metadata from data array
 */
export function generateMetadata(
  data: [number, number][], 
  interval: 'daily' | 'weekly' | 'monthly'
): OptimizedBitcoinData['meta'] {
  if (data.length === 0) {
    return {
      startDate: '',
      endDate: '',
      interval,
      count: 0,
      lastUpdated: new Date().toISOString()
    }
  }

  const startTimestamp = data[0][0]
  const endTimestamp = data[data.length - 1][0]

  return {
    startDate: new Date(startTimestamp).toISOString().split('T')[0],
    endDate: new Date(endTimestamp).toISOString().split('T')[0],
    interval,
    count: data.length,
    lastUpdated: new Date().toISOString()
  }
}

/**
 * Validate data integrity
 */
export function validateDataIntegrity(data: OptimizedBitcoinData): void {
  // Check metadata count matches data length
  if (data.meta.count !== data.data.length) {
    throw new Error(`Metadata count (${data.meta.count}) doesn't match data length (${data.data.length})`)
  }

  // Check data format
  for (let i = 0; i < data.data.length; i++) {
    const point = data.data[i]
    if (!Array.isArray(point) || point.length !== 2) {
      throw new Error(`Invalid data format at index ${i}: expected [timestamp, close]`)
    }
    
    const [timestamp, close] = point
    if (typeof timestamp !== 'number' || typeof close !== 'number') {
      throw new Error(`Invalid data types at index ${i}: expected numbers`)
    }
    
    if (timestamp <= 0 || close <= 0) {
      throw new Error(`Invalid values at index ${i}: timestamp and close must be positive`)
    }
  }

  // Check chronological order
  for (let i = 1; i < data.data.length; i++) {
    if (data.data[i][0] < data.data[i - 1][0]) {
      throw new Error(`Data not in chronological order at index ${i}: ${data.data[i][0]} < ${data.data[i - 1][0]}`)
    }
  }

  console.log(`✅ Data integrity validated: ${data.data.length} points`)
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🚀 Starting Bitcoin JSON data generation...')

    // Read backup data
    const backupPath = path.join(process.cwd(), 'bitcoin-price-backup.json')
    if (!fs.existsSync(backupPath)) {
      throw new Error('bitcoin-price-backup.json not found in project root')
    }

    console.log('📂 Reading backup data...')
    const backupContent = fs.readFileSync(backupPath, 'utf-8')
    const backupData = JSON.parse(backupContent)
    
    if (!backupData.records || !Array.isArray(backupData.records)) {
      throw new Error('Invalid backup data format: missing records array')
    }

    console.log(`📊 Processing ${backupData.records.length} records...`)

    // Convert to optimized formats
    const dailyData = convertBackupDataToOptimized(backupData.records)
    const weeklyData = generateWeeklyData(dailyData)
    const monthlyData = generateMonthlyData(dailyData)

    // Validate all data
    validateDataIntegrity(dailyData)
    validateDataIntegrity(weeklyData)
    validateDataIntegrity(monthlyData)

    // Create output directory
    const outputDir = path.join(process.cwd(), 'public', 'data', 'bitcoin')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
      console.log('📁 Created output directory:', outputDir)
    }

    // Write JSON files
    const files = [
      { name: 'daily.json', data: dailyData },
      { name: 'weekly.json', data: weeklyData },
      { name: 'monthly.json', data: monthlyData }
    ]

    for (const file of files) {
      const filePath = path.join(outputDir, file.name)
      const jsonContent = JSON.stringify(file.data, null, 2)
      fs.writeFileSync(filePath, jsonContent)
      
      const sizeKB = Math.round(jsonContent.length / 1024)
      console.log(`✅ Generated ${file.name}: ${file.data.data.length} points, ${sizeKB}KB`)
    }

    console.log('🎉 Bitcoin JSON data generation completed successfully!')
    
  } catch (error) {
    console.error('❌ Error generating Bitcoin JSON data:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}
