/**
 * Backup Data Inserter
 * Uses the backup JSON file to insert Bitcoin price data
 */

import { config } from 'dotenv'
import * as fs from 'fs'

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env' })

async function insertBackupData() {
  console.log('📦 BACKUP DATA INSERTER')
  console.log('=' .repeat(40))

  try {
    // Step 1: Load backup data
    console.log('\n📂 Loading backup data...')
    
    if (!fs.existsSync('bitcoin-price-backup.json')) {
      console.log('❌ Backup file not found: bitcoin-price-backup.json')
      return
    }

    const backupContent = fs.readFileSync('bitcoin-price-backup.json', 'utf8')
    const backupData = JSON.parse(backupContent)
    
    console.log(`✅ Backup data loaded:`)
    console.log(`   Timestamp: ${backupData.timestamp}`)
    console.log(`   Total Records: ${backupData.totalRecords.toLocaleString()}`)
    console.log(`   Date Range: ${backupData.records[0]?.date} to ${backupData.records[backupData.records.length - 1]?.date}`)

    // Step 2: Create SQL insert statements
    console.log('\n🔧 Generating SQL insert statements...')
    
    const sqlStatements: string[] = []
    const batchSize = 50
    
    for (let i = 0; i < backupData.records.length; i += batchSize) {
      const batch = backupData.records.slice(i, i + batchSize)
      
      const values = batch.map((record: any) => {
        return `('${record.date}', ${record.timestamp}, ${record.open}, ${record.high}, ${record.low}, ${record.close}, ${record.volume}, '${record.source}')`
      }).join(',\n    ')
      
      const sql = `INSERT INTO "BitcoinPrice" ("date", "timestamp", "open", "high", "low", "close", "volume", "source")
VALUES
    ${values}
ON CONFLICT ("date") DO NOTHING;`
      
      sqlStatements.push(sql)
    }
    
    console.log(`✅ Generated ${sqlStatements.length} SQL batch statements`)

    // Step 3: Save SQL to file
    console.log('\n💾 Saving SQL statements to file...')
    
    const sqlContent = `-- Bitcoin Price Data Insert
-- Generated: ${new Date().toISOString()}
-- Total Records: ${backupData.totalRecords}

${sqlStatements.join('\n\n')}

-- Verification query
SELECT COUNT(*) as total_records, 
       MIN(date) as earliest_date, 
       MAX(date) as latest_date,
       COUNT(DISTINCT source) as source_count
FROM "BitcoinPrice";`

    fs.writeFileSync('bitcoin-price-insert.sql', sqlContent)
    console.log('✅ SQL file saved: bitcoin-price-insert.sql')

    // Step 4: Try direct database insertion with connection pooling disabled
    console.log('\n🔄 Attempting direct database insertion...')
    
    try {
      // Use a minimal connection approach
      const { Pool } = require('pg')
      
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 1, // Only 1 connection
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      })

      // Test connection
      const client = await pool.connect()
      console.log('✅ Database connection established')

      // Insert data in small batches
      let insertedBatches = 0
      
      for (let i = 0; i < sqlStatements.length; i++) {
        try {
          await client.query(sqlStatements[i])
          insertedBatches++
          console.log(`   📦 Batch ${i + 1}/${sqlStatements.length} inserted`)
          
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 100))
          
        } catch (batchError) {
          console.log(`   ⚠️ Batch ${i + 1} failed: ${batchError instanceof Error ? batchError.message : String(batchError)}`)
        }
      }

      // Verify insertion
      const result = await client.query('SELECT COUNT(*) as count FROM "BitcoinPrice"')
      console.log(`✅ Database insertion completed`)
      console.log(`📊 Total records in database: ${result.rows[0].count}`)

      client.release()
      await pool.end()

    } catch (dbError) {
      console.log(`❌ Database insertion failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`)
      console.log('💡 SQL file is available for manual execution')
    }

    // Step 5: Provide instructions
    console.log('\n🎯 NEXT STEPS:')
    console.log('1. If database insertion failed, you can manually execute:')
    console.log('   - Use the generated bitcoin-price-insert.sql file')
    console.log('   - Execute it in your PostgreSQL database')
    console.log('2. Restart the development server')
    console.log('3. Test the Bitcoin simulation interface')
    console.log('4. Check if charts now display proper price curves')

    console.log('\n✅ BACKUP DATA PROCESSING COMPLETED!')

  } catch (error) {
    console.error('❌ Backup data insertion failed:', error)
  }
}

// Run the backup data inserter
insertBackupData().catch(console.error)
