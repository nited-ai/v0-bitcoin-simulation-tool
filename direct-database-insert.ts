/**
 * Direct Database Insert - Bypass Connection Issues
 * Directly inserts the Bitcoin price data we successfully retrieved
 */

import { config } from 'dotenv'
import { PrismaClient } from './lib/generated/prisma'

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

async function directDatabaseInsert() {
  console.log('💾 DIRECT DATABASE INSERT - BITCOIN PRICE DATA')
  console.log('=' .repeat(60))

  // Create a single Prisma client instance
  const prisma = new PrismaClient({
    log: ['error']
  })

  try {
    // First, let's check current database state
    console.log('\n📊 Current Database State:')
    const currentCount = await prisma.bitcoinPrice.count()
    console.log(`   Current Records: ${currentCount.toLocaleString()}`)

    // Check target date range coverage
    const targetRecords = await prisma.bitcoinPrice.count({
      where: {
        date: {
          gte: '2021-01-05',
          lte: '2025-07-14'
        }
      }
    })
    console.log(`   Target Range Records: ${targetRecords.toLocaleString()}`)

    // Since we know the API calls work, let's fetch and insert the data directly
    console.log('\n🔄 Fetching and Inserting Gap Data:')

    const gapRanges = [
      { start: '2024-03-31', end: '2024-10-26', days: 210 },
      { start: '2023-10-30', end: '2024-03-31', days: 154 },
      { start: '2023-03-26', end: '2023-10-28', days: 217 },
      { start: '2022-10-31', end: '2023-03-26', days: 147 },
      { start: '2022-03-27', end: '2022-10-29', days: 217 },
      { start: '2021-11-01', end: '2022-03-27', days: 147 },
      { start: '2021-03-28', end: '2021-10-30', days: 217 },
      { start: '2021-01-05', end: '2021-03-28', days: 83 }
    ]

    let totalInserted = 0

    for (let i = 0; i < gapRanges.length; i++) {
      const gap = gapRanges[i]
      console.log(`\n📍 Processing Gap ${i + 1}/8: ${gap.start} to ${gap.end}`)

      try {
        // Fetch from Binance API (we know this works)
        const startTime = new Date(gap.start).getTime()
        const endTime = new Date(gap.end).getTime()
        const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&startTime=${startTime}&endTime=${endTime}&limit=1000`
        
        console.log(`   🔄 Fetching from Binance API...`)
        const response = await fetch(url)
        
        if (!response.ok) {
          console.log(`   ❌ API request failed: ${response.status}`)
          continue
        }

        const data = await response.json()
        console.log(`   ✅ Retrieved ${data.length} records`)

        // Convert to our format
        const records: BitcoinPriceRecord[] = data.map((item: any) => ({
          date: new Date(item[0]).toISOString().split('T')[0],
          timestamp: item[0],
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
          volume: parseFloat(item[5]),
          source: 'binance'
        }))

        // Check for existing records
        const existingDates = await prisma.bitcoinPrice.findMany({
          where: {
            date: {
              in: records.map(r => r.date)
            }
          },
          select: { date: true }
        })

        const existingDatesSet = new Set(existingDates.map(r => r.date))
        const newRecords = records.filter(r => !existingDatesSet.has(r.date))

        if (newRecords.length === 0) {
          console.log(`   ⚠️ All records already exist`)
          continue
        }

        console.log(`   💾 Inserting ${newRecords.length} new records...`)

        // Insert in smaller batches
        const batchSize = 25
        let batchInserted = 0

        for (let j = 0; j < newRecords.length; j += batchSize) {
          const batch = newRecords.slice(j, j + batchSize)
          
          await prisma.bitcoinPrice.createMany({
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

          batchInserted += batch.length
          console.log(`     📦 Batch ${Math.floor(j / batchSize) + 1}: ${batch.length} records`)
        }

        totalInserted += batchInserted
        console.log(`   ✅ Gap ${i + 1} completed: ${batchInserted} records inserted`)

        // Add delay between gaps
        if (i < gapRanges.length - 1) {
          console.log(`   ⏳ Waiting 2 seconds...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }

      } catch (error) {
        console.log(`   ❌ Gap ${i + 1} failed: ${error}`)
      }
    }

    // Log the data update
    try {
      await prisma.dataUpdate.create({
        data: {
          updateDate: new Date().toISOString().split('T')[0],
          recordsAdded: totalInserted,
          recordsUpdated: 0,
          source: 'DIRECT_DATABASE_INSERT_BINANCE',
          status: 'success'
        }
      })
    } catch (error) {
      console.log('⚠️ Failed to log data update:', error)
    }

    // Final verification
    console.log('\n📊 FINAL VERIFICATION:')
    console.log('=' .repeat(60))

    const finalCount = await prisma.bitcoinPrice.count()
    const improvement = finalCount - currentCount

    console.log(`📈 Total Records: ${finalCount.toLocaleString()} (+${improvement.toLocaleString()})`)
    console.log(`💾 Records Inserted: ${totalInserted.toLocaleString()}`)

    // Check target range coverage again
    const finalTargetRecords = await prisma.bitcoinPrice.count({
      where: {
        date: {
          gte: '2021-01-05',
          lte: '2025-07-14'
        }
      }
    })

    const targetDays = Math.ceil((new Date('2025-07-14').getTime() - new Date('2021-01-05').getTime()) / (1000 * 60 * 60 * 24)) + 1
    const targetCoverage = (finalTargetRecords / targetDays) * 100

    console.log(`🎯 Target Range Coverage:`)
    console.log(`   Records: ${finalTargetRecords.toLocaleString()}/${targetDays.toLocaleString()} days`)
    console.log(`   Coverage: ${targetCoverage.toFixed(2)}%`)

    // Get date range
    const [earliest, latest] = await Promise.all([
      prisma.bitcoinPrice.findFirst({
        orderBy: { date: 'asc' },
        select: { date: true }
      }),
      prisma.bitcoinPrice.findFirst({
        orderBy: { date: 'desc' },
        select: { date: true }
      })
    ])

    if (earliest && latest) {
      console.log(`📅 Date Range: ${earliest.date} to ${latest.date}`)
    }

    // Source breakdown
    const sourceBreakdown = await prisma.bitcoinPrice.groupBy({
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

    if (totalInserted > 1000) {
      console.log('\n🎉 EXCELLENT SUCCESS!')
      console.log('✅ Significant amount of data inserted')
      console.log('✅ Bitcoin price database greatly improved')
      console.log('✅ Ready to test chart display')
    } else if (totalInserted > 0) {
      console.log('\n✅ PARTIAL SUCCESS!')
      console.log('✅ Some data inserted')
      console.log('⚠️ Some records may have already existed')
    } else {
      console.log('\n⚠️ NO NEW DATA INSERTED')
      console.log('❌ All records may already exist in database')
    }

  } catch (error) {
    console.error('❌ Direct database insert failed:', error)
  } finally {
    await prisma.$disconnect()
    console.log('\n🔌 Database connection closed')
  }
}

// Run the direct database insert
directDatabaseInsert().catch(console.error)
