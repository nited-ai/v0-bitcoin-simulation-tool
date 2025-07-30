/**
 * Check Database Schema
 * Inspect the actual database structure to understand table names
 */

import { config } from 'dotenv'
import { Client } from 'pg'

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env' })

async function checkDatabaseSchema() {
  console.log('🔍 CHECKING DATABASE SCHEMA')
  console.log('=' .repeat(40))

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
  })

  try {
    await client.connect()
    console.log('✅ Connected to database')

    // List all tables
    console.log('\n📋 Available Tables:')
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)

    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`)
    })

    // Check for Bitcoin price related tables
    console.log('\n🔍 Bitcoin Price Tables:')
    const bitcoinTablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND LOWER(table_name) LIKE '%bitcoin%'
      ORDER BY table_name
    `)

    if (bitcoinTablesResult.rows.length > 0) {
      bitcoinTablesResult.rows.forEach(row => {
        console.log(`   ✅ Found: ${row.table_name}`)
      })

      // Get column information for the first Bitcoin table
      const tableName = bitcoinTablesResult.rows[0].table_name
      console.log(`\n📊 Columns in ${tableName}:`)
      
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName])

      columnsResult.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`)
      })

      // Check if table has any data
      const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`)
      console.log(`\n📈 Current record count: ${countResult.rows[0].count}`)

    } else {
      console.log('   ❌ No Bitcoin price tables found')
    }

    // Check for any tables with 'price' in the name
    console.log('\n💰 Price-related Tables:')
    const priceTablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND LOWER(table_name) LIKE '%price%'
      ORDER BY table_name
    `)

    if (priceTablesResult.rows.length > 0) {
      priceTablesResult.rows.forEach(row => {
        console.log(`   ✅ Found: ${row.table_name}`)
      })
    } else {
      console.log('   ❌ No price-related tables found')
    }

  } catch (error) {
    console.error('❌ Database check failed:', error)
  } finally {
    await client.end()
    console.log('\n🔌 Database connection closed')
  }
}

checkDatabaseSchema().catch(console.error)
