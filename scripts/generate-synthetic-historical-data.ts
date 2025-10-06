/**
 * Generate Synthetic Historical Bitcoin Price Data
 * 
 * This script generates synthetic historical Bitcoin price data based on
 * known historical price points and interpolation. This provides a complete
 * dataset for chart visualization without requiring external API calls.
 * 
 * Usage: npx tsx scripts/generate-synthetic-historical-data.ts
 */

import * as fs from 'fs/promises'
import * as path from 'path'

const DATA_DIR = path.join(process.cwd(), 'public', 'data', 'bitcoin')

// Known historical Bitcoin price points (approximate values)
const KNOWN_PRICE_POINTS = [
  { date: '2013-01-01', price: 13.30 },
  { date: '2013-04-01', price: 120.00 },
  { date: '2013-11-30', price: 1150.00 },
  { date: '2014-01-01', price: 770.00 },
  { date: '2015-01-01', price: 315.00 },
  { date: '2015-01-14', price: 170.00 }, // Low
  { date: '2016-01-01', price: 430.00 },
  { date: '2017-01-01', price: 960.00 },
  { date: '2017-12-17', price: 19783.06 }, // 2017 ATH
  { date: '2018-01-01', price: 13850.00 },
  { date: '2018-12-15', price: 3200.00 }, // Low
  { date: '2019-01-01', price: 3850.00 },
  { date: '2019-06-26', price: 13016.00 },
  { date: '2020-01-01', price: 7200.00 },
  { date: '2020-03-13', price: 4970.00 }, // COVID crash
  { date: '2020-12-31', price: 29000.00 },
  { date: '2021-04-14', price: 64863.10 }, // 2021 ATH
  { date: '2021-11-10', price: 68789.63 }, // 2021 ATH #2
  { date: '2022-01-01', price: 47733.00 },
  { date: '2022-11-21', price: 15760.00 }, // FTX crash
  { date: '2023-01-01', price: 16625.00 },
  { date: '2023-12-31', price: 42258.00 },
  { date: '2024-01-01', price: 44167.00 },
  { date: '2024-03-14', price: 73750.07 }, // 2024 ATH
  { date: '2024-12-31', price: 94000.00 },
  { date: '2025-01-01', price: 95000.00 },
  { date: '2025-08-19', price: 113170.00 },
  { date: '2025-10-05', price: 125360.90 }, // Current ATH
  { date: '2025-10-06', price: 123634.00 }  // Current price
]

/**
 * Linear interpolation between two points
 */
function interpolate(
  date1: Date,
  price1: number,
  date2: Date,
  price2: number,
  targetDate: Date
): number {
  const t1 = date1.getTime()
  const t2 = date2.getTime()
  const t = targetDate.getTime()
  
  const ratio = (t - t1) / (t2 - t1)
  return price1 + (price2 - price1) * ratio
}

/**
 * Add realistic volatility to interpolated prices
 */
function addVolatility(price: number, seed: number): {
  open: number
  high: number
  low: number
  close: number
} {
  // Use seed for deterministic "randomness"
  const random1 = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  const random2 = Math.sin(seed * 45.164 + 94.673) * 19134.9876
  const random3 = Math.sin(seed * 67.812 + 23.456) * 50849.8234
  
  const volatility = 0.02 // 2% daily volatility
  
  const open = price * (1 + (random1 - Math.floor(random1)) * volatility - volatility / 2)
  const close = price * (1 + (random2 - Math.floor(random2)) * volatility - volatility / 2)
  const high = Math.max(open, close) * (1 + Math.abs(random3 - Math.floor(random3)) * volatility)
  const low = Math.min(open, close) * (1 - Math.abs(random3 - Math.floor(random3)) * volatility)
  
  return { open, high, low, close }
}

/**
 * Generate daily price data
 */
function generateDailyData(): Array<{
  timestamp: number
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}> {
  const dailyData: Array<{
    timestamp: number
    date: string
    open: number
    high: number
    low: number
    close: number
    volume: number
  }> = []
  
  const startDate = new Date(KNOWN_PRICE_POINTS[0].date)
  const endDate = new Date(KNOWN_PRICE_POINTS[KNOWN_PRICE_POINTS.length - 1].date)
  
  let currentDate = new Date(startDate)
  let knownPointIndex = 0
  
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0]
    
    // Find the two known points to interpolate between
    while (
      knownPointIndex < KNOWN_PRICE_POINTS.length - 1 &&
      new Date(KNOWN_PRICE_POINTS[knownPointIndex + 1].date) <= currentDate
    ) {
      knownPointIndex++
    }
    
    let price: number
    
    if (knownPointIndex >= KNOWN_PRICE_POINTS.length - 1) {
      // Use last known price
      price = KNOWN_PRICE_POINTS[KNOWN_PRICE_POINTS.length - 1].price
    } else {
      // Interpolate between two known points
      const point1 = KNOWN_PRICE_POINTS[knownPointIndex]
      const point2 = KNOWN_PRICE_POINTS[knownPointIndex + 1]
      
      price = interpolate(
        new Date(point1.date),
        point1.price,
        new Date(point2.date),
        point2.price,
        currentDate
      )
    }
    
    // Add realistic OHLC volatility
    const seed = currentDate.getTime() / 1000
    const ohlc = addVolatility(price, seed)
    
    dailyData.push({
      timestamp: currentDate.getTime(),
      date: dateStr,
      ...ohlc,
      volume: 1000000000 + Math.random() * 5000000000 // Synthetic volume
    })
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return dailyData
}

/**
 * Generate weekly aggregated data
 */
function generateWeeklyData(dailyData: [number, number][]): [number, number][] {
  const weeklyData: [number, number][] = []
  
  for (let i = 0; i < dailyData.length; i += 7) {
    const weekData = dailyData.slice(i, i + 7)
    if (weekData.length > 0) {
      weeklyData.push(weekData[weekData.length - 1])
    }
  }
  
  return weeklyData
}

/**
 * Generate monthly aggregated data
 */
function generateMonthlyData(dailyData: [number, number][]): [number, number][] {
  const monthlyData: Map<string, [number, number]> = new Map()
  
  for (const [timestamp, price] of dailyData) {
    const date = new Date(timestamp)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    monthlyData.set(monthKey, [timestamp, price])
  }
  
  return Array.from(monthlyData.values()).sort((a, b) => a[0] - b[0])
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Generating synthetic historical Bitcoin price data...')
  console.log('📊 This will create data from 2013 to present\n')
  
  try {
    // Ensure data directory exists
    await fs.mkdir(DATA_DIR, { recursive: true })
    
    // Generate daily data
    console.log('📊 Generating daily price data...')
    const dailyData = generateDailyData()
    console.log(`✅ Generated ${dailyData.length} daily records`)
    
    // Convert to optimized format
    const dailyOptimized: [number, number][] = dailyData.map(d => [d.timestamp, d.close])
    
    // Generate aggregated data
    console.log('📊 Generating weekly aggregated data...')
    const weeklyOptimized = generateWeeklyData(dailyOptimized)
    console.log(`✅ Generated ${weeklyOptimized.length} weekly records`)
    
    console.log('📊 Generating monthly aggregated data...')
    const monthlyOptimized = generateMonthlyData(dailyOptimized)
    console.log(`✅ Generated ${monthlyOptimized.length} monthly records`)
    
    // Find ATH
    const ath = {
      value: 125360.90,
      date: '2025-10-05',
      timestamp: new Date('2025-10-05').getTime()
    }
    
    // Write daily data
    console.log('\n💾 Writing daily.json...')
    const dailyJson = {
      meta: {
        startDate: dailyData[0].date,
        endDate: dailyData[dailyData.length - 1].date,
        interval: 'daily',
        count: dailyOptimized.length,
        lastUpdated: new Date().toISOString(),
        source: 'synthetic_interpolation'
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
        startDate: dailyData[0].date,
        endDate: dailyData[dailyData.length - 1].date,
        interval: 'weekly',
        count: weeklyOptimized.length,
        lastUpdated: new Date().toISOString(),
        source: 'synthetic_interpolation'
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
        startDate: dailyData[0].date,
        endDate: dailyData[dailyData.length - 1].date,
        interval: 'monthly',
        count: monthlyOptimized.length,
        lastUpdated: new Date().toISOString(),
        source: 'synthetic_interpolation'
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
        source: 'synthetic_interpolation',
        version: '1.0.0'
      },
      ath
    }
    await fs.writeFile(
      path.join(DATA_DIR, 'ath.json'),
      JSON.stringify(athJson, null, 2)
    )
    
    // Write current price
    console.log('💾 Writing current-price.json...')
    const currentPriceJson = {
      meta: {
        lastUpdated: new Date().toISOString(),
        source: 'synthetic_interpolation',
        version: '1.0.0'
      },
      current: {
        price: 123634.00,
        timestamp: new Date('2025-10-06').getTime(),
        date: '2025-10-06',
        source: 'synthetic_interpolation'
      }
    }
    await fs.writeFile(
      path.join(DATA_DIR, 'current-price.json'),
      JSON.stringify(currentPriceJson, null, 2)
    )
    
    console.log('\n✅ Synthetic historical data generation completed successfully!')
    console.log(`📊 Daily records: ${dailyOptimized.length}`)
    console.log(`📊 Weekly records: ${weeklyOptimized.length}`)
    console.log(`📊 Monthly records: ${monthlyOptimized.length}`)
    console.log(`🏔️  ATH: $${ath.value.toFixed(2)} on ${ath.date}`)
    console.log(`💰 Current price: $123,634.00`)
    console.log('\n📈 The chart should now display historical data from 2013 to present!')
    
  } catch (error) {
    console.error('\n❌ Failed to generate synthetic data:', error)
    process.exit(1)
  }
}

// Run the script
main()

