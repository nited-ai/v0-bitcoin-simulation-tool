/**
 * Direct PostgreSQL Seeder
 * Bypasses Prisma connection pooling issues and directly seeds the database
 */

import { config } from 'dotenv'
import { Pool, Client } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

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

class DirectPostgresSeeder {
  private client: Client | null = null

  async connect(): Promise<void> {
    console.log('🔌 Establishing direct PostgreSQL connection...')
    
    // Use a single client connection instead of pooling
    this.client = new Client({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 10000,
      query_timeout: 30000,
    })

    await this.client.connect()
    console.log('✅ Direct PostgreSQL connection established')
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end()
      this.client = null
      console.log('🔌 PostgreSQL connection closed')
    }
  }

  async checkExistingData(): Promise<void> {
    console.log('\n📊 Checking existing Bitcoin price data...')

    if (!this.client) throw new Error('Not connected to database')

    const countResult = await this.client.query('SELECT COUNT(*) as count FROM bitcoin_prices')
    const count = parseInt(countResult.rows[0].count)

    if (count > 0) {
      console.log(`📈 Found ${count.toLocaleString()} existing records`)

      // Get date range of existing data
      const rangeResult = await this.client.query(`
        SELECT
          MIN(date) as earliest_date,
          MAX(date) as latest_date,
          COUNT(DISTINCT source) as source_count
        FROM bitcoin_prices
      `)

      const range = rangeResult.rows[0]
      console.log(`📅 Date range: ${range.earliest_date} to ${range.latest_date}`)
      console.log(`📊 Sources: ${range.source_count} different sources`)

      // Get source breakdown
      const sourceResult = await this.client.query(`
        SELECT source, COUNT(*) as count
        FROM bitcoin_prices
        GROUP BY source
        ORDER BY count DESC
      `)

      console.log('📋 Source breakdown:')
      sourceResult.rows.forEach(row => {
        console.log(`   ${row.source}: ${parseInt(row.count).toLocaleString()} records`)
      })
    } else {
      console.log('📭 No existing records found')
    }
  }

  async loadCSVData(): Promise<BitcoinPriceRecord[]> {
    console.log('\n📂 Loading CSV data...')
    
    const csvPath = path.join(process.cwd(), 'data', 'bitcoin-price-data.csv')
    
    if (!fs.existsSync(csvPath)) {
      console.log('⚠️ CSV file not found, skipping CSV data')
      return []
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const lines = csvContent.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    
    const records: BitcoinPriceRecord[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      
      if (values.length >= 6) {
        const date = values[1] // Date column
        const close = parseFloat(values[2]) // Closing Price
        const open = parseFloat(values[3]) // 24h Open
        const high = parseFloat(values[4]) // 24h High
        const low = parseFloat(values[5]) // 24h Low
        
        if (date && !isNaN(close) && !isNaN(open) && !isNaN(high) && !isNaN(low)) {
          records.push({
            date,
            timestamp: new Date(date).getTime(),
            open,
            high,
            low,
            close,
            volume: 0, // CSV doesn't have volume data
            source: 'csv'
          })
        }
      }
    }
    
    console.log(`✅ Loaded ${records.length} records from CSV`)
    return records
  }

  async loadBackupData(): Promise<BitcoinPriceRecord[]> {
    console.log('\n📦 Loading backup API data...')
    
    const backupPath = path.join(process.cwd(), 'bitcoin-price-backup.json')
    
    if (!fs.existsSync(backupPath)) {
      console.log('⚠️ Backup file not found, skipping API data')
      return []
    }

    const backupContent = fs.readFileSync(backupPath, 'utf-8')
    const backupData = JSON.parse(backupContent)
    
    console.log(`✅ Loaded ${backupData.records.length} records from backup`)
    return backupData.records
  }

  async insertRecords(records: BitcoinPriceRecord[], batchSize: number = 25): Promise<number> {
    if (!this.client) throw new Error('Not connected to database')
    if (records.length === 0) return 0

    console.log(`\n💾 Inserting ${records.length} records in batches of ${batchSize}...`)
    
    let insertedCount = 0
    const totalBatches = Math.ceil(records.length / batchSize)
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      
      try {
        // Create parameterized query for batch insert
        const values = batch.map((_, index) => {
          const baseIndex = index * 10
          return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10})`
        }).join(', ')

        const query = `
          INSERT INTO bitcoin_prices (date, timestamp, open, high, low, close, volume, source, created_at, updated_at)
          VALUES ${values}
          ON CONFLICT (date) DO NOTHING
        `

        const now = new Date().toISOString()
        const params = batch.flatMap(record => [
          record.date,
          record.timestamp.toString(), // Convert to string for bigint
          record.open,
          record.high,
          record.low,
          record.close,
          record.volume,
          record.source,
          now, // created_at
          now  // updated_at
        ])
        
        const result = await this.client.query(query, params)
        insertedCount += result.rowCount || 0
        
        console.log(`   📦 Batch ${batchNumber}/${totalBatches}: ${result.rowCount} records inserted`)
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 50))
        
      } catch (error) {
        console.log(`   ❌ Batch ${batchNumber} failed: ${error}`)
      }
    }
    
    return insertedCount
  }

  async verifyData(): Promise<void> {
    if (!this.client) throw new Error('Not connected to database')

    console.log('\n📊 Verifying inserted data...')
    
    // Get total count
    const countResult = await this.client.query('SELECT COUNT(*) as count FROM bitcoin_prices')
    const totalRecords = parseInt(countResult.rows[0].count)

    // Get date range
    const rangeResult = await this.client.query(`
      SELECT
        MIN(date) as earliest_date,
        MAX(date) as latest_date
      FROM bitcoin_prices
    `)

    // Get source breakdown
    const sourceResult = await this.client.query(`
      SELECT
        source,
        COUNT(*) as count
      FROM bitcoin_prices
      GROUP BY source
      ORDER BY count DESC
    `)
    
    console.log(`📈 Total Records: ${totalRecords.toLocaleString()}`)
    console.log(`📅 Date Range: ${rangeResult.rows[0].earliest_date} to ${rangeResult.rows[0].latest_date}`)
    console.log('\n📊 Data Sources:')
    
    sourceResult.rows.forEach(row => {
      console.log(`   ${row.source}: ${parseInt(row.count).toLocaleString()} records`)
    })
    
    // Calculate coverage for target range
    const targetStart = '2013-01-01'
    const targetEnd = new Date().toISOString().split('T')[0]
    
    const coverageResult = await this.client.query(`
      SELECT COUNT(*) as count
      FROM bitcoin_prices
      WHERE date >= $1 AND date <= $2
    `, [targetStart, targetEnd])
    
    const targetDays = Math.ceil((new Date(targetEnd).getTime() - new Date(targetStart).getTime()) / (1000 * 60 * 60 * 24)) + 1
    const coverage = (parseInt(coverageResult.rows[0].count) / targetDays) * 100
    
    console.log(`\n🎯 Coverage Analysis (${targetStart} to ${targetEnd}):`)
    console.log(`   Records: ${parseInt(coverageResult.rows[0].count).toLocaleString()}/${targetDays.toLocaleString()} days`)
    console.log(`   Coverage: ${coverage.toFixed(2)}%`)
    
    if (coverage >= 95) {
      console.log('🎉 EXCELLENT: Near-complete coverage achieved!')
    } else if (coverage >= 80) {
      console.log('✅ GOOD: High coverage achieved!')
    } else {
      console.log('⚠️ PARTIAL: Coverage needs improvement')
    }
  }

  async run(): Promise<void> {
    try {
      await this.connect()

      // Check existing data
      await this.checkExistingData()
      
      // Load all data sources
      const csvRecords = await this.loadCSVData()
      const backupRecords = await this.loadBackupData()
      
      // Combine and deduplicate records
      const allRecords = [...csvRecords, ...backupRecords]
      const uniqueRecords = new Map<string, BitcoinPriceRecord>()
      
      allRecords.forEach(record => {
        // Prefer API data over CSV data for the same date
        if (!uniqueRecords.has(record.date) || record.source !== 'csv') {
          uniqueRecords.set(record.date, record)
        }
      })
      
      const finalRecords = Array.from(uniqueRecords.values()).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      
      console.log(`\n🔄 Processing ${finalRecords.length} unique records...`)
      
      // Insert all records
      const insertedCount = await this.insertRecords(finalRecords)
      
      console.log(`\n✅ Seeding completed: ${insertedCount} records inserted`)
      
      // Verify the results
      await this.verifyData()
      
    } catch (error) {
      console.error('❌ Seeding failed:', error)
      throw error
    } finally {
      await this.disconnect()
    }
  }
}

// Run the seeder
async function main() {
  console.log('🌱 DIRECT POSTGRESQL SEEDER')
  console.log('=' .repeat(50))
  
  const seeder = new DirectPostgresSeeder()
  await seeder.run()
  
  console.log('\n🎯 NEXT STEPS:')
  console.log('1. Restart the development server')
  console.log('2. Test /api/bitcoin-prices/historical endpoint')
  console.log('3. Verify charts display proper Bitcoin price curves')
  console.log('4. Test the Bitcoin simulation interface')
  
  console.log('\n🎉 DATABASE SEEDING COMPLETED!')
}

main().catch(console.error)
