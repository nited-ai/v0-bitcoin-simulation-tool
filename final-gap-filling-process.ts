/**
 * Final Comprehensive Gap Filling Process
 * Uses working APIs to complete Bitcoin price database with 100% coverage
 */

import { config } from 'dotenv'
import { getPrismaClient } from './lib/database/connection-manager'

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env' })

interface BitcoinPriceRecord {
  date: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  source: string
}

class FinalGapFiller {
  private prisma = getPrismaClient()
  private workingApis = [
    {
      name: 'Binance',
      priority: 1,
      fetch: this.fetchFromBinance.bind(this),
      rateLimit: 1200 // 1.2 seconds between requests
    },
    {
      name: 'CryptoCompare',
      priority: 2,
      fetch: this.fetchFromCryptoCompare.bind(this),
      rateLimit: 4000 // 4 seconds between requests
    },
    {
      name: 'Yahoo Finance',
      priority: 3,
      fetch: this.fetchFromYahoo.bind(this),
      rateLimit: 2000 // 2 seconds between requests
    },
    {
      name: 'CoinGecko',
      priority: 4,
      fetch: this.fetchFromCoinGecko.bind(this),
      rateLimit: 6000 // 6 seconds between requests (heavily rate limited)
    }
  ]

  private lastRequestTimes = new Map<string, number>()

  async fetchFromBinance(startDate: string, endDate: string): Promise<BitcoinPriceRecord[]> {
    const startTime = new Date(startDate).getTime()
    const endTime = new Date(endDate).getTime()
    const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&startTime=${startTime}&endTime=${endTime}&limit=1000`
    
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Binance API error: ${response.status}`)
    
    const data = await response.json()
    return data.map((item: any) => ({
      date: new Date(item[0]).toISOString().split('T')[0],
      timestamp: item[0],
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5]),
      source: 'binance'
    }))
  }

  async fetchFromCryptoCompare(startDate: string, endDate: string): Promise<BitcoinPriceRecord[]> {
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000)
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000)
    const days = Math.ceil((endTimestamp - startTimestamp) / (24 * 60 * 60))
    
    const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=${Math.min(days, 2000)}&toTs=${endTimestamp}`
    
    const response = await fetch(url)
    if (!response.ok) throw new Error(`CryptoCompare API error: ${response.status}`)
    
    const data = await response.json()
    if (!data.Data?.Data) throw new Error('No data returned from CryptoCompare')
    
    return data.Data.Data
      .filter((item: any) => {
        const itemDate = new Date(item.time * 1000).toISOString().split('T')[0]
        return itemDate >= startDate && itemDate <= endDate
      })
      .map((item: any) => ({
        date: new Date(item.time * 1000).toISOString().split('T')[0],
        timestamp: item.time * 1000,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volumeto || 0,
        source: 'cryptocompare'
      }))
  }

  async fetchFromYahoo(startDate: string, endDate: string): Promise<BitcoinPriceRecord[]> {
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000)
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) throw new Error(`Yahoo Finance API error: ${response.status}`)
    
    const data = await response.json()
    const result = data.chart?.result?.[0]
    if (!result) throw new Error('No data returned from Yahoo Finance')
    
    const timestamps = result.timestamp || []
    const quotes = result.indicators?.quote?.[0] || {}
    
    return timestamps.map((timestamp: number, index: number) => ({
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      timestamp: timestamp * 1000,
      open: quotes.open?.[index] || quotes.close?.[index],
      high: quotes.high?.[index] || quotes.close?.[index],
      low: quotes.low?.[index] || quotes.close?.[index],
      close: quotes.close?.[index],
      volume: quotes.volume?.[index] || 0,
      source: 'yahoo'
    })).filter((item: any) => item.close !== null && !isNaN(item.close))
  }

  async fetchFromCoinGecko(startDate: string, endDate: string): Promise<BitcoinPriceRecord[]> {
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000)
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000)
    const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=${startTimestamp}&to=${endTimestamp}`
    
    const response = await fetch(url)
    if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`)
    
    const data = await response.json()
    if (!data.prices) throw new Error('No price data returned from CoinGecko')
    
    return data.prices.map((item: any) => ({
      date: new Date(item[0]).toISOString().split('T')[0],
      timestamp: item[0],
      open: item[1],
      high: item[1], // CoinGecko doesn't provide OHLC in this endpoint
      low: item[1],
      close: item[1],
      volume: 0,
      source: 'coingecko'
    }))
  }

  private async waitForRateLimit(apiName: string, rateLimit: number): Promise<void> {
    const lastRequest = this.lastRequestTimes.get(apiName) || 0
    const timeSinceLastRequest = Date.now() - lastRequest
    
    if (timeSinceLastRequest < rateLimit) {
      const waitTime = rateLimit - timeSinceLastRequest
      console.log(`   ⏳ Rate limiting: waiting ${waitTime}ms for ${apiName}`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.lastRequestTimes.set(apiName, Date.now())
  }

  async fetchDataWithFallback(startDate: string, endDate: string): Promise<BitcoinPriceRecord[]> {
    for (const api of this.workingApis) {
      try {
        console.log(`🔄 Trying ${api.name} API...`)
        
        // Respect rate limits
        await this.waitForRateLimit(api.name, api.rateLimit)
        
        const data = await api.fetch(startDate, endDate)
        
        if (data && data.length > 0) {
          console.log(`✅ ${api.name} returned ${data.length} records`)
          return data
        } else {
          console.log(`⚠️ ${api.name} returned no data, trying next provider`)
        }
      } catch (error) {
        console.log(`❌ ${api.name} failed: ${error}`)
      }
    }
    
    throw new Error('All API providers failed')
  }

  /**
   * Insert Bitcoin price data into database
   */
  async insertPriceData(data: BitcoinPriceRecord[]): Promise<number> {
    if (data.length === 0) return 0

    try {
      console.log(`   💾 Inserting ${data.length} records into database...`)

      // Check for existing records to avoid duplicates
      const existingDates = await this.prisma.bitcoinPrice.findMany({
        where: {
          date: {
            in: data.map(record => record.date)
          }
        },
        select: { date: true }
      })

      const existingDatesSet = new Set(existingDates.map(r => r.date))
      const newRecords = data.filter(record => !existingDatesSet.has(record.date))

      if (newRecords.length === 0) {
        console.log(`   ⚠️ All ${data.length} records already exist in database`)
        return 0
      }

      // Insert new records in batches to avoid overwhelming the database
      const batchSize = 50
      let insertedCount = 0

      for (let i = 0; i < newRecords.length; i += batchSize) {
        const batch = newRecords.slice(i, i + batchSize)

        await this.prisma.bitcoinPrice.createMany({
          data: batch.map(record => ({
            date: record.date,
            timestamp: BigInt(record.timestamp),
            open: record.open,
            high: record.high,
            low: record.low,
            close: record.close,
            volume: record.volume,
            source: record.source
          })),
          skipDuplicates: true
        })

        insertedCount += batch.length
        console.log(`   📦 Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records inserted`)
      }

      // Log the data update
      await this.logDataUpdate(insertedCount, newRecords[0]?.source || 'unknown')

      console.log(`   ✅ Successfully inserted ${insertedCount} new records`)
      return insertedCount

    } catch (error) {
      console.error(`   ❌ Database insertion failed: ${error}`)
      throw error
    }
  }

  /**
   * Log data update operation
   */
  private async logDataUpdate(recordsAdded: number, source: string): Promise<void> {
    try {
      await this.prisma.dataUpdate.create({
        data: {
          updateDate: new Date().toISOString().split('T')[0],
          recordsAdded,
          recordsUpdated: 0,
          source: `FINAL_GAP_FILL_${source.toUpperCase()}`,
          status: 'success'
        }
      })
    } catch (error) {
      console.error('⚠️ Failed to log data update:', error)
    }
  }

  async startGapFilling(): Promise<void> {
    console.log('🚀 STARTING FINAL COMPREHENSIVE GAP FILLING')
    console.log('=' .repeat(60))
    
    // Define the remaining gap ranges (from our previous analysis)
    const remainingGaps = [
      { start: '2024-03-31', end: '2024-10-26', days: 210, priority: 'MEDIUM' },
      { start: '2023-10-30', end: '2024-03-31', days: 154, priority: 'LOW' },
      { start: '2023-03-26', end: '2023-10-28', days: 217, priority: 'LOW' },
      { start: '2022-10-31', end: '2023-03-26', days: 147, priority: 'LOWEST' },
      { start: '2022-03-27', end: '2022-10-29', days: 217, priority: 'LOWEST' },
      { start: '2021-11-01', end: '2022-03-27', days: 147, priority: 'LOWEST' },
      { start: '2021-03-28', end: '2021-10-30', days: 217, priority: 'LOWEST' },
      { start: '2021-01-05', end: '2021-03-28', days: 83, priority: 'LOWEST' }
    ]
    
    console.log(`📊 Processing ${remainingGaps.length} gap ranges`)
    console.log(`📅 Total missing days: ${remainingGaps.reduce((sum, gap) => sum + gap.days, 0)}`)
    
    let totalFilled = 0
    let successfulGaps = 0
    
    for (let i = 0; i < remainingGaps.length; i++) {
      const gap = remainingGaps[i]
      console.log(`\n📍 Processing Gap ${i + 1}/${remainingGaps.length}:`)
      console.log(`   Range: ${gap.start} to ${gap.end} (${gap.days} days)`)
      console.log(`   Priority: ${gap.priority}`)
      
      try {
        // Fetch data for this gap
        const data = await this.fetchDataWithFallback(gap.start, gap.end)
        
        if (data.length > 0) {
          console.log(`✅ Retrieved ${data.length} records for gap ${gap.start} to ${gap.end}`)
          console.log(`📊 Sample: ${data[0].date} - $${data[0].close.toLocaleString()} (${data[0].source})`)

          // Insert data into database
          const insertedCount = await this.insertPriceData(data)

          if (insertedCount > 0) {
            totalFilled += insertedCount
            successfulGaps++
            console.log(`✅ Successfully processed gap ${i + 1} - ${insertedCount} records saved`)
          } else {
            console.log(`⚠️ Gap ${i + 1} data already existed in database`)
            successfulGaps++ // Still count as successful since data is available
          }
        }
        
        // Add delay between gaps to be respectful to APIs
        if (i < remainingGaps.length - 1) {
          console.log('   ⏳ Waiting 10 seconds before next gap...')
          await new Promise(resolve => setTimeout(resolve, 10000))
        }
        
      } catch (error) {
        console.log(`❌ Failed to process gap ${gap.start} to ${gap.end}: ${error}`)
      }
    }
    
    // Final summary
    console.log('\n🎉 FINAL GAP FILLING RESULTS:')
    console.log('=' .repeat(60))
    console.log(`✅ Successful Gaps: ${successfulGaps}/${remainingGaps.length}`)
    console.log(`📊 Total Records Retrieved: ${totalFilled}`)
    console.log(`📈 Estimated Coverage Improvement: +${Math.round((totalFilled / 1392) * 100)}%`)
    
    if (successfulGaps >= 6) {
      console.log('\n🎉 EXCELLENT SUCCESS!')
      console.log('✅ Most gaps successfully filled')
      console.log('✅ Bitcoin price database significantly improved')
      console.log('✅ Ready for production use')
    } else if (successfulGaps >= 3) {
      console.log('\n✅ GOOD PROGRESS!')
      console.log('✅ Several gaps successfully filled')
      console.log('⚠️ Some gaps remain - consider running again later')
    } else {
      console.log('\n⚠️ LIMITED SUCCESS')
      console.log('❌ Few gaps filled - may need to adjust approach')
    }

    // Final database verification
    await this.verifyDatabaseState()
  }

  /**
   * Verify final database state
   */
  async verifyDatabaseState(): Promise<void> {
    console.log('\n📊 FINAL DATABASE VERIFICATION:')
    console.log('=' .repeat(60))

    try {
      // Get total record count
      const totalRecords = await this.prisma.bitcoinPrice.count()
      console.log(`📈 Total Records: ${totalRecords.toLocaleString()}`)

      // Get date range
      const [earliest, latest] = await Promise.all([
        this.prisma.bitcoinPrice.findFirst({
          orderBy: { date: 'asc' },
          select: { date: true }
        }),
        this.prisma.bitcoinPrice.findFirst({
          orderBy: { date: 'desc' },
          select: { date: true }
        })
      ])

      if (earliest && latest) {
        console.log(`📅 Date Range: ${earliest.date} to ${latest.date}`)

        // Calculate coverage for target range (2021-01-05 to 2025-07-14)
        const targetStart = '2021-01-05'
        const targetEnd = '2025-07-14'

        const targetRecords = await this.prisma.bitcoinPrice.count({
          where: {
            date: {
              gte: targetStart,
              lte: targetEnd
            }
          }
        })

        const targetDays = Math.ceil((new Date(targetEnd).getTime() - new Date(targetStart).getTime()) / (1000 * 60 * 60 * 24)) + 1
        const targetCoverage = (targetRecords / targetDays) * 100

        console.log(`🎯 Target Range Coverage (${targetStart} to ${targetEnd}):`)
        console.log(`   Records: ${targetRecords}/${targetDays} days`)
        console.log(`   Coverage: ${targetCoverage.toFixed(2)}%`)

        if (targetCoverage >= 99) {
          console.log('✅ EXCELLENT: Near-complete coverage achieved!')
        } else if (targetCoverage >= 90) {
          console.log('✅ GOOD: High coverage achieved!')
        } else {
          console.log('⚠️ PARTIAL: Some gaps may remain')
        }
      }

      // Get source breakdown
      const sourceBreakdown = await this.prisma.bitcoinPrice.groupBy({
        by: ['source'],
        _count: {
          source: true
        },
        orderBy: {
          _count: {
            source: 'desc'
          }
        }
      })

      console.log('\n📊 Data Sources:')
      sourceBreakdown.forEach(source => {
        console.log(`   ${source.source}: ${source._count.source.toLocaleString()} records`)
      })

    } catch (error) {
      console.error('❌ Database verification failed:', error)
    }
  }
}

// Execute the final gap filling process
async function runFinalGapFilling() {
  const gapFiller = new FinalGapFiller()
  await gapFiller.startGapFilling()
}

runFinalGapFilling().catch(console.error)
