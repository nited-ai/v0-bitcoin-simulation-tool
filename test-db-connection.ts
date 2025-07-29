/**
 * Test database connection directly
 */

import { config } from 'dotenv'
import { PrismaClient } from './lib/generated/prisma'

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env' })

async function testDatabaseConnection() {
  console.log('🧪 Testing Database Connection')
  console.log('=' .repeat(40))

  // Check environment variable
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...')

  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  })

  try {
    // Test connection
    console.log('\n🔌 Testing database connection...')
    await prisma.$connect()
    console.log('✅ Database connected successfully')

    // Test query
    console.log('\n📊 Testing simple query...')
    const count = await prisma.bitcoinPrice.count()
    console.log(`✅ Found ${count} Bitcoin price records`)

    // Test sample data
    console.log('\n📈 Testing sample data retrieval...')
    const sample = await prisma.bitcoinPrice.findMany({
      take: 3,
      orderBy: { date: 'desc' }
    })
    
    console.log('✅ Sample records:')
    sample.forEach(record => {
      console.log(`  - ${record.date}: $${record.close.toLocaleString()} (${record.source})`)
    })

    console.log('\n🎉 All database tests passed!')

  } catch (error) {
    console.error('❌ Database test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabaseConnection().catch(console.error)
