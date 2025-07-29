/**
 * Comprehensive Database Fix
 * Addresses connection pool issues and inserts Bitcoin price data
 */

import { config } from 'dotenv'

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

async function comprehensiveDatabaseFix() {
  console.log('🔧 COMPREHENSIVE DATABASE FIX')
  console.log('=' .repeat(50))

  try {
    // Step 1: Wait for database connections to timeout
    console.log('\n⏳ Step 1: Waiting for database connections to timeout...')
    console.log('   This may take 30-60 seconds...')
    
    // Wait 60 seconds for connections to timeout
    await new Promise(resolve => setTimeout(resolve, 60000))
    console.log('✅ Connection timeout period completed')

    // Step 2: Use direct SQL approach to insert data
    console.log('\n💾 Step 2: Direct data insertion using working APIs...')
    
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

    let totalRecordsRetrieved = 0
    const allRecords: BitcoinPriceRecord[] = []

    // Fetch data from Binance API (we know this works)
    for (let i = 0; i < gapRanges.length; i++) {
      const gap = gapRanges[i]
      console.log(`\n📍 Fetching Gap ${i + 1}/8: ${gap.start} to ${gap.end}`)

      try {
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

        allRecords.push(...records)
        totalRecordsRetrieved += records.length

        // Add delay between requests
        if (i < gapRanges.length - 1) {
          console.log(`   ⏳ Waiting 2 seconds...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }

      } catch (error) {
        console.log(`   ❌ Gap ${i + 1} failed: ${error}`)
      }
    }

    console.log(`\n📊 Data Retrieval Summary:`)
    console.log(`   Total Records Retrieved: ${totalRecordsRetrieved.toLocaleString()}`)
    console.log(`   Date Range: ${allRecords[0]?.date} to ${allRecords[allRecords.length - 1]?.date}`)

    // Step 3: Save data to JSON file as backup
    console.log('\n💾 Step 3: Saving data to backup file...')
    
    const fs = require('fs')
    const backupData = {
      timestamp: new Date().toISOString(),
      totalRecords: totalRecordsRetrieved,
      records: allRecords
    }
    
    fs.writeFileSync('bitcoin-price-backup.json', JSON.stringify(backupData, null, 2))
    console.log('✅ Data saved to bitcoin-price-backup.json')

    // Step 4: Try to insert data using a fresh Prisma client
    console.log('\n🔄 Step 4: Attempting database insertion with fresh connection...')
    
    try {
      // Dynamic import to avoid connection issues during module loading
      const { PrismaClient } = await import('./lib/generated/prisma')
      
      const prisma = new PrismaClient({
        log: ['error'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      })

      // Test basic connection
      await prisma.$queryRaw`SELECT 1 as test`
      console.log('✅ Database connection established')

      // Insert data in small batches
      const batchSize = 10
      let insertedCount = 0

      for (let i = 0; i < allRecords.length; i += batchSize) {
        const batch = allRecords.slice(i, i + batchSize)
        
        try {
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

          insertedCount += batch.length
          console.log(`   📦 Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records inserted`)

          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 100))

        } catch (batchError) {
          console.log(`   ⚠️ Batch ${Math.floor(i / batchSize) + 1} failed: ${batchError}`)
        }
      }

      console.log(`✅ Database insertion completed: ${insertedCount} records inserted`)

      // Verify final state
      const finalCount = await prisma.bitcoinPrice.count()
      console.log(`📊 Final database record count: ${finalCount.toLocaleString()}`)

      await prisma.$disconnect()

    } catch (dbError) {
      console.log(`❌ Database insertion failed: ${dbError}`)
      console.log('💡 Data is safely stored in bitcoin-price-backup.json')
    }

    // Step 5: Provide next steps
    console.log('\n🎯 NEXT STEPS:')
    console.log('1. Restart the development server to clear connection pool')
    console.log('2. Test the Bitcoin simulation interface')
    console.log('3. Check if charts now display proper price curves')
    console.log('4. If database insertion failed, use the backup file to retry later')

    console.log('\n✅ COMPREHENSIVE FIX COMPLETED!')

  } catch (error) {
    console.error('❌ Comprehensive fix failed:', error)
  }
}

// Run the comprehensive fix
comprehensiveDatabaseFix().catch(console.error)
