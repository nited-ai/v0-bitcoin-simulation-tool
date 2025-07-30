/**
 * Database Seeding Script for Bitcoin Price Data
 * Imports historical Bitcoin price data from CSV into the database
 */

import { PrismaClient } from '../lib/generated/prisma'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface CSVRow {
  Currency: string
  Date: string
  'Closing Price (USD)': string
  '24h Open (USD)': string
  '24h High (USD)': string
  '24h Low (USD)': string
}

async function main() {
  console.log('🌱 Starting database seeding...')

  try {
    // Read and parse CSV file
    const csvPath = path.join(process.cwd(), 'public', 'btc-price-history.csv')
    console.log(`📂 Reading CSV file: ${csvPath}`)
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`)
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const lines = csvContent.trim().split('\n')
    
    if (lines.length < 2) {
      throw new Error('CSV file appears to be empty or invalid')
    }

    // Parse header
    const header = lines[0].split(',')
    console.log(`📊 CSV header: ${header.join(', ')}`)
    console.log(`📈 Total data rows: ${lines.length - 1}`)

    // Parse data rows
    const bitcoinPrices = []
    let skippedRows = 0

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) {
        skippedRows++
        continue
      }

      const values = line.split(',')
      if (values.length !== header.length) {
        console.warn(`⚠️ Skipping malformed row ${i}: ${line}`)
        skippedRows++
        continue
      }

      const row: CSVRow = {
        Currency: values[0],
        Date: values[1],
        'Closing Price (USD)': values[2],
        '24h Open (USD)': values[3],
        '24h High (USD)': values[4],
        '24h Low (USD)': values[5]
      }

      // Only process BTC data
      if (row.Currency === 'BTC' && row.Date) {
        const date = row.Date
        const close = parseFloat(row['Closing Price (USD)'])
        const open = parseFloat(row['24h Open (USD)']) || close
        const high = parseFloat(row['24h High (USD)']) || close
        const low = parseFloat(row['24h Low (USD)']) || close

        if (isNaN(close)) {
          console.warn(`⚠️ Invalid price data for ${date}, skipping`)
          skippedRows++
          continue
        }

        bitcoinPrices.push({
          date,
          timestamp: new Date(date).getTime(),
          open,
          high,
          low,
          close,
          volume: null, // CSV doesn't contain volume data
          source: 'CSV'
        })
      } else {
        skippedRows++
      }
    }

    console.log(`✅ Parsed ${bitcoinPrices.length} valid Bitcoin price records`)
    console.log(`⚠️ Skipped ${skippedRows} invalid/non-BTC rows`)

    if (bitcoinPrices.length === 0) {
      throw new Error('No valid Bitcoin price data found in CSV')
    }

    // Check if data already exists
    const existingCount = await prisma.bitcoinPrice.count()
    console.log(`🗄️ Existing records in database: ${existingCount}`)

    if (existingCount > 0) {
      console.log('🔄 Database already contains data. Checking for new records...')
      
      // Get existing dates
      const existingDates = await prisma.bitcoinPrice.findMany({
        select: { date: true }
      })
      const existingDateSet = new Set(existingDates.map(d => d.date))
      
      // Filter out existing records
      const newRecords = bitcoinPrices.filter(record => !existingDateSet.has(record.date))
      
      if (newRecords.length === 0) {
        console.log('✅ All CSV data already exists in database')
        return
      }
      
      console.log(`📥 Inserting ${newRecords.length} new records...`)
      bitcoinPrices.splice(0, bitcoinPrices.length, ...newRecords)
    }

    // Insert data in batches for better performance
    const batchSize = 100
    let insertedCount = 0

    for (let i = 0; i < bitcoinPrices.length; i += batchSize) {
      const batch = bitcoinPrices.slice(i, i + batchSize)
      
      try {
        await prisma.bitcoinPrice.createMany({
          data: batch
        })
        insertedCount += batch.length
        console.log(`📊 Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(bitcoinPrices.length / batchSize)} (${insertedCount}/${bitcoinPrices.length} records)`)
      } catch (error) {
        console.error(`❌ Error inserting batch starting at index ${i}:`, error)
        // Try inserting records individually to identify problematic ones
        for (const record of batch) {
          try {
            await prisma.bitcoinPrice.create({ data: record })
            insertedCount++
          } catch (individualError) {
            console.error(`❌ Failed to insert record for ${record.date}:`, individualError)
          }
        }
      }
    }

    // Record the seeding operation
    await prisma.dataUpdate.create({
      data: {
        updateDate: new Date().toISOString().split('T')[0],
        recordsAdded: insertedCount,
        recordsUpdated: 0,
        source: 'CSV_SEED',
        startDate: bitcoinPrices[0]?.date,
        endDate: bitcoinPrices[bitcoinPrices.length - 1]?.date,
        status: 'success'
      }
    })

    console.log(`✅ Database seeding completed successfully!`)
    console.log(`📊 Total records inserted: ${insertedCount}`)
    console.log(`📅 Date range: ${bitcoinPrices[0]?.date} to ${bitcoinPrices[bitcoinPrices.length - 1]?.date}`)

  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    
    // Record the failed operation
    try {
      await prisma.dataUpdate.create({
        data: {
          updateDate: new Date().toISOString().split('T')[0],
          recordsAdded: 0,
          recordsUpdated: 0,
          source: 'CSV_SEED',
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      })
    } catch (logError) {
      console.error('❌ Failed to log error to database:', logError)
    }
    
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
