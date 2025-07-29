/**
 * Test Database Connection
 * Simple test to verify database connectivity after connection pool issues
 */

import { config } from 'dotenv'
import { PrismaClient } from './lib/generated/prisma'

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env' })

async function testDatabaseConnection() {
  console.log('🔍 TESTING DATABASE CONNECTION')
  console.log('=' .repeat(40))

  const prisma = new PrismaClient({
    log: ['error']
  })

  try {
    console.log('\n1. Testing basic connection...')
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Basic connection successful:', result)

    console.log('\n2. Testing Bitcoin price table access...')
    const count = await prisma.bitcoinPrice.count()
    console.log(`✅ Bitcoin price records: ${count.toLocaleString()}`)

    console.log('\n3. Testing recent data...')
    const recent = await prisma.bitcoinPrice.findFirst({
      orderBy: { date: 'desc' },
      select: { date: true, close: true, source: true }
    })
    
    if (recent) {
      console.log(`✅ Most recent record: ${recent.date} - $${recent.close.toLocaleString()} (${recent.source})`)
    } else {
      console.log('⚠️ No records found')
    }

    console.log('\n4. Testing date range query...')
    const rangeCount = await prisma.bitcoinPrice.count({
      where: {
        date: {
          gte: '2023-01-01',
          lte: '2023-12-31'
        }
      }
    })
    console.log(`✅ 2023 records: ${rangeCount.toLocaleString()}`)

    console.log('\n5. Testing data sources...')
    const sources = await prisma.bitcoinPrice.groupBy({
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

    console.log('📊 Data sources:')
    sources.forEach(source => {
      console.log(`   ${source.source}: ${source._count.source.toLocaleString()} records`)
    })

    console.log('\n✅ ALL TESTS PASSED!')
    console.log('🎯 Database connection is working properly')

  } catch (error) {
    console.error('❌ Database test failed:', error)
  } finally {
    await prisma.$disconnect()
    console.log('\n🔌 Database connection closed')
  }
}

// Run the test
testDatabaseConnection().catch(console.error)
