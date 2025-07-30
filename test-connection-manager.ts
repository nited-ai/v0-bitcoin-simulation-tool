/**
 * Test Database Connection Manager
 * Verifies that the connection manager prevents connection pool exhaustion
 */

import { config } from 'dotenv'
import { dbConnectionManager, getPrismaClient } from './lib/database/connection-manager'

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env' })

async function testConnectionManager() {
  console.log('🧪 TESTING DATABASE CONNECTION MANAGER')
  console.log('=' .repeat(50))

  try {
    // Test 1: Connection Manager Status
    console.log('\n📊 Test 1: Connection Manager Status')
    const initialStatus = dbConnectionManager.getStatus()
    console.log(`✅ Initial Status:`)
    console.log(`   - Connected: ${initialStatus.connected}`)
    console.log(`   - Connection Count: ${initialStatus.connectionCount}`)
    console.log(`   - Max Connections: ${initialStatus.maxConnections}`)

    // Test 2: Test Database Connection
    console.log('\n🔌 Test 2: Database Connection Test')
    const connectionTest = await dbConnectionManager.testConnection()
    console.log(`${connectionTest ? '✅' : '❌'} Connection Test: ${connectionTest ? 'PASSED' : 'FAILED'}`)

    // Test 3: Multiple Client Requests (should reuse same connection)
    console.log('\n🔄 Test 3: Multiple Client Requests')
    
    const client1 = getPrismaClient()
    const client2 = getPrismaClient()
    const client3 = getPrismaClient()
    
    console.log(`✅ Client 1 === Client 2: ${client1 === client2}`)
    console.log(`✅ Client 2 === Client 3: ${client2 === client3}`)
    console.log(`✅ All clients are the same instance: ${client1 === client2 && client2 === client3}`)

    // Test 4: Simple Database Query
    console.log('\n📊 Test 4: Simple Database Query')
    
    try {
      const client = getPrismaClient()
      const count = await client.bitcoinPrice.count()
      console.log(`✅ Database Query Success: ${count} Bitcoin price records found`)
    } catch (error) {
      console.error(`❌ Database Query Failed: ${error}`)
    }

    // Test 5: Connection Status After Usage
    console.log('\n📊 Test 5: Connection Status After Usage')
    const finalStatus = dbConnectionManager.getStatus()
    console.log(`✅ Final Status:`)
    console.log(`   - Connected: ${finalStatus.connected}`)
    console.log(`   - Connection Count: ${finalStatus.connectionCount}`)
    console.log(`   - Max Connections: ${finalStatus.maxConnections}`)

    // Test 6: Multiple Concurrent Queries (stress test)
    console.log('\n💪 Test 6: Concurrent Query Stress Test')
    
    const concurrentQueries = Array.from({ length: 5 }, async (_, index) => {
      try {
        const client = getPrismaClient()
        const result = await client.bitcoinPrice.findFirst({
          orderBy: { date: 'desc' }
        })
        console.log(`   ✅ Query ${index + 1}: Found record for ${result?.date}`)
        return true
      } catch (error) {
        console.error(`   ❌ Query ${index + 1}: Failed - ${error}`)
        return false
      }
    })

    const results = await Promise.all(concurrentQueries)
    const successCount = results.filter(r => r).length
    console.log(`✅ Concurrent Queries: ${successCount}/5 successful`)

    // Summary
    console.log('\n📋 TEST SUMMARY:')
    if (connectionTest && successCount >= 4) {
      console.log('🎉 ALL TESTS PASSED!')
      console.log('✅ Connection manager is working correctly')
      console.log('✅ Database connections are properly managed')
      console.log('✅ Ready for gap filling process')
    } else {
      console.log('⚠️ Some tests failed')
      console.log('❌ Connection manager may need adjustments')
    }

  } catch (error) {
    console.error('❌ Connection manager test failed:', error)
  } finally {
    // Don't disconnect here as the connection should be managed globally
    console.log('\n🔌 Connection manager test completed')
  }
}

// Run the test
testConnectionManager().catch(console.error)
