/**
 * Script to Populate Historical Bitcoin Price Data
 * 
 * This script fetches historical Bitcoin price data from 2013 to present
 * and populates the JSON files used by the application.
 * 
 * Usage: npx tsx scripts/populate-historical-data.ts
 */

import * as fs from 'fs/promises'
import * as path from 'path'

const DATA_DIR = path.join(process.cwd(), 'public', 'data', 'bitcoin')
const COINGECKO_API = 'https://api.coingecko.com/api/v3'

interface CoinGeckoHistoricalData {
  prices: [number, number][]  // [timestamp_ms, price]
  market_caps: [number, number][]
  total_volumes: [number, number][]
}

interface BitcoinPriceData {
  timestamp: number
  date: string
  close: number
  high: number
  open: number
  low: number
  volume: number
}

/**
 * Fetch historical data from CoinGecko in chunks
 */
async function fetchHistoricalDataChunk(
  startDate: Date,
  endDate: Date
): Promise<BitcoinPriceData[]> {
  const fromTimestamp = Math.floor(startDate.getTime() / 1000)
  const toTimestamp = Math.floor(endDate.getTime() / 1000)
  
  const url = `${COINGECKO_API}/coins/bitcoin/market_chart/range?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}`
  
  console.log(`📡 Fetching data from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}...`)
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`)
    }
    
    const data: CoinGeckoHistoricalData = await response.json()
    
    // Convert to daily data points
    const dailyData: Map<string, BitcoinPriceData> = new Map()
    
    for (const [timestamp, price] of data.prices) {
      const date = new Date(timestamp)
      const dateStr = date.toISOString().split('T')[0]
      
      if (!dailyData.has(dateStr)) {
        dailyData.set(dateStr, {
          timestamp,
          date: dateStr,
          close: price,
          high: price,
          open: price,
          low: price,
          volume: 0
        })
      } else {
        const existing = dailyData.get(dateStr)!
        existing.high = Math.max(existing.high, price)
        existing.low = Math.min(existing.low, price)
        existing.close = price // Last price of the day
      }
    }
    
    // Add volume data
    for (const [timestamp, volume] of data.total_volumes) {
      const dateStr = new Date(timestamp).toISOString().split('T')[0]
      const dataPoint = dailyData.get(dateStr)
      if (dataPoint) {
        dataPoint.volume = volume
      }
    }
    
    return Array.from(dailyData.values()).sort((a, b) => a.timestamp - b.timestamp)
  } catch (error) {
    console.error(`❌ Failed to fetch chunk:`, error)
    throw error
  }
}

/**
 * Fetch all historical data in chunks to avoid rate limits
 */
async function fetchAllHistoricalData(): Promise<BitcoinPriceData[]> {
  const startDate = new Date('2013-01-01')
  const endDate = new Date()
  
  const allData: BitcoinPriceData[] = []
  const chunkSizeMonths = 12 // Fetch 1 year at a time
  
  let currentStart = new Date(startDate)
  
  while (currentStart < endDate) {
    const currentEnd = new Date(currentStart)
    currentEnd.setMonth(currentEnd.getMonth() + chunkSizeMonths)
    
    if (currentEnd > endDate) {
      currentEnd.setTime(endDate.getTime())
    }
    
    try {
      const chunkData = await fetchHistoricalDataChunk(currentStart, currentEnd)
      allData.push(...chunkData)
      
      console.log(`✅ Fetched ${chunkData.length} records`)
      
      // Rate limiting: wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error(`❌ Failed to fetch chunk from ${currentStart.toISOString()} to ${currentEnd.toISOString()}`)
      // Continue with next chunk
    }
    
    currentStart = new Date(currentEnd)
    currentStart.setDate(currentStart.getDate() + 1)
  }
  
  return allData
}

/**
 * Generate weekly aggregated data from daily data
 */
function generateWeeklyData(dailyData: [number, number][]): [number, number][] {
  const weeklyData: [number, number][] = []
  
  for (let i = 0; i < dailyData.length; i += 7) {
    const weekData = dailyData.slice(i, i + 7)
    if (weekData.length > 0) {
      // Use the last day of the week
      weeklyData.push(weekData[weekData.length - 1])
    }
  }
  
  return weeklyData
}

/**
 * Generate monthly aggregated data from daily data
 */
function generateMonthlyData(dailyData: [number, number][]): [number, number][] {
  const monthlyData: Map<string, [number, number]> = new Map()
  
  for (const [timestamp, price] of dailyData) {
    const date = new Date(timestamp)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    // Keep the last day of each month
    monthlyData.set(monthKey, [timestamp, price])
  }
  
  return Array.from(monthlyData.values()).sort((a, b) => a[0] - b[0])
}

/**
 * Find ATH in historical data
 */
function findATH(data: BitcoinPriceData[]): { value: number; date: string; timestamp: number } {
  let ath = { value: 0, date: '', timestamp: 0 }
  
  for (const record of data) {
    if (record.high > ath.value) {
      ath = {
        value: record.high,
        date: record.date,
        timestamp: record.timestamp
      }
    }
  }
  
  return ath
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting historical data population...')
  console.log('📊 This will fetch Bitcoin price data from 2013 to present')
  console.log('⏱️  This may take several minutes due to API rate limits\n')
  
  try {
    // Ensure data directory exists
    await fs.mkdir(DATA_DIR, { recursive: true })
    
    // Fetch all historical data
    console.log('📡 Fetching historical data from CoinGecko...')
    const historicalData = await fetchAllHistoricalData()
    
    console.log(`\n✅ Fetched ${historicalData.length} daily records`)
    
    // Convert to optimized format [timestamp, close]
    const dailyOptimized: [number, number][] = historicalData.map(d => [d.timestamp, d.close])
    
    // Generate aggregated data
    console.log('📊 Generating weekly aggregated data...')
    const weeklyOptimized = generateWeeklyData(dailyOptimized)
    
    console.log('📊 Generating monthly aggregated data...')
    const monthlyOptimized = generateMonthlyData(dailyOptimized)
    
    // Find ATH
    console.log('🏔️  Finding all-time high...')
    const ath = findATH(historicalData)
    
    // Write daily data
    console.log('💾 Writing daily.json...')
    const dailyJson = {
      meta: {
        startDate: historicalData[0].date,
        endDate: historicalData[historicalData.length - 1].date,
        interval: 'daily',
        count: dailyOptimized.length,
        lastUpdated: new Date().toISOString()
      },
      data: dailyOptimized
    }
    await fs.writeFile(
      path.join(DATA_DIR, 'daily.json'),
      JSON.stringify(dailyJson, null, 2)
    )
    
    // Write weekly data
    console.log('💾 Writing weekly.json...')
    const weeklyJson = {
      meta: {
        startDate: historicalData[0].date,
        endDate: historicalData[historicalData.length - 1].date,
        interval: 'weekly',
        count: weeklyOptimized.length,
        lastUpdated: new Date().toISOString()
      },
      data: weeklyOptimized
    }
    await fs.writeFile(
      path.join(DATA_DIR, 'weekly.json'),
      JSON.stringify(weeklyJson, null, 2)
    )
    
    // Write monthly data
    console.log('💾 Writing monthly.json...')
    const monthlyJson = {
      meta: {
        startDate: historicalData[0].date,
        endDate: historicalData[historicalData.length - 1].date,
        interval: 'monthly',
        count: monthlyOptimized.length,
        lastUpdated: new Date().toISOString()
      },
      data: monthlyOptimized
    }
    await fs.writeFile(
      path.join(DATA_DIR, 'monthly.json'),
      JSON.stringify(monthlyJson, null, 2)
    )
    
    // Write ATH data
    console.log('💾 Writing ath.json...')
    const athJson = {
      meta: {
        lastUpdated: new Date().toISOString(),
        source: 'historical_data_population',
        version: '1.0.0'
      },
      ath
    }
    await fs.writeFile(
      path.join(DATA_DIR, 'ath.json'),
      JSON.stringify(athJson, null, 2)
    )
    
    console.log('\n✅ Historical data population completed successfully!')
    console.log(`📊 Daily records: ${dailyOptimized.length}`)
    console.log(`📊 Weekly records: ${weeklyOptimized.length}`)
    console.log(`📊 Monthly records: ${monthlyOptimized.length}`)
    console.log(`🏔️  ATH: $${ath.value.toFixed(2)} on ${ath.date}`)
    
  } catch (error) {
    console.error('\n❌ Failed to populate historical data:', error)
    process.exit(1)
  }
}

// Run the script
main()

