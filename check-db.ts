import { PrismaClient } from './lib/generated/prisma'

const prisma = new PrismaClient()

async function checkDatabase() {
  try {
    const count = await prisma.bitcoinPrice.count()
    console.log(`Total Bitcoin price records: ${count}`)
    
    const firstRecord = await prisma.bitcoinPrice.findFirst({
      orderBy: { date: 'asc' }
    })
    console.log('First record:', firstRecord)
    
    const lastRecord = await prisma.bitcoinPrice.findFirst({
      orderBy: { date: 'desc' }
    })
    console.log('Last record:', lastRecord)
    
    const updateCount = await prisma.dataUpdate.count()
    console.log(`Data update records: ${updateCount}`)
    
    const updates = await prisma.dataUpdate.findMany()
    console.log('Updates:', updates)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabase()
