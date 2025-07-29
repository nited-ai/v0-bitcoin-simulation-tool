/**
 * Test script for Bitcoin Price API endpoints
 */

async function testApiEndpoints() {
  console.log('🧪 Testing Bitcoin Price API Endpoints')
  console.log('=' .repeat(50))

  const baseUrl = 'http://localhost:3000/api/bitcoin-prices'

  try {
    // Test 1: Database Stats
    console.log('\n📊 Test 1: Database Statistics')
    const statsResponse = await fetch(`${baseUrl}/stats`)
    const statsData = await statsResponse.json()
    
    if (statsData.success) {
      console.log(`✅ Total records: ${statsData.data.database.totalRecords}`)
      console.log(`✅ Date range: ${statsData.data.database.dateRange?.start} to ${statsData.data.database.dateRange?.end}`)
      console.log(`✅ Coverage: ${statsData.data.database.dateRange?.coveragePercentage}%`)
      console.log(`✅ Total gaps: ${statsData.data.dataQuality.gaps?.totalGaps || 'unknown'}`)
    } else {
      console.error('❌ Stats API failed:', statsData.error)
    }

    // Test 2: Current Price (database only)
    console.log('\n💰 Test 2: Current Price (Database)')
    const currentResponse = await fetch(`${baseUrl}/current`)
    const currentData = await currentResponse.json()
    
    if (currentData.success) {
      console.log(`✅ Current price: $${currentData.data.current.close}`)
      console.log(`✅ Date: ${currentData.data.current.date}`)
      console.log(`✅ Source: ${currentData.data.current.source}`)
    } else {
      console.error('❌ Current price API failed:', currentData.error)
    }

    // Test 3: Current Price (live)
    console.log('\n💰 Test 3: Current Price (Live)')
    const liveResponse = await fetch(`${baseUrl}/current?live=true`)
    const liveData = await liveResponse.json()
    
    if (liveData.success) {
      console.log(`✅ Live price: $${liveData.data.current.close}`)
      console.log(`✅ Source: ${liveData.data.source || 'database'}`)
      console.log(`✅ Is live: ${liveData.data.isLive}`)
      
      if (liveData.data.priceChange) {
        console.log(`✅ Price change: $${liveData.data.priceChange.absolute.toFixed(2)} (${liveData.data.priceChange.percentage.toFixed(2)}%)`)
      }
    } else {
      console.error('❌ Live price API failed:', liveData.error)
    }

    // Test 4: Historical Data (limited)
    console.log('\n📈 Test 4: Historical Data (Last 5 records)')
    const historicalResponse = await fetch(`${baseUrl}/historical?limit=5`)
    const historicalData = await historicalResponse.json()
    
    if (historicalData.success) {
      console.log(`✅ Retrieved ${historicalData.data.length} records`)
      console.log(`✅ Date range: ${historicalData.metadata.startDate} to ${historicalData.metadata.endDate}`)
      
      if (historicalData.data.length > 0) {
        const firstRecord = historicalData.data[0]
        console.log(`✅ First record: ${firstRecord.date} - $${firstRecord.close}`)
      }
    } else {
      console.error('❌ Historical data API failed:', historicalData.error)
    }

    // Test 5: Historical Data (date range)
    console.log('\n📈 Test 5: Historical Data (2021 range)')
    const rangeResponse = await fetch(`${baseUrl}/historical?startDate=2021-01-01&endDate=2021-01-10&limit=10`)
    const rangeData = await rangeResponse.json()
    
    if (rangeData.success) {
      console.log(`✅ Retrieved ${rangeData.data.length} records for 2021 range`)
      console.log(`✅ Query: ${rangeData.metadata.query.startDate} to ${rangeData.metadata.query.endDate}`)
    } else {
      console.error('❌ Range query failed:', rangeData.error)
    }

    // Test 6: Automated Update (small test)
    console.log('\n🔄 Test 6: Automated Update (5 gaps max)')
    const updateResponse = await fetch(`${baseUrl}/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        maxGaps: 5,
        forceUpdate: false
      })
    })
    const updateData = await updateResponse.json()
    
    if (updateData.success) {
      console.log(`✅ Update completed: ${updateData.data.gapsFilled} gaps filled`)
      console.log(`✅ Current price updated: ${updateData.data.currentPriceUpdated}`)
      console.log(`✅ Duration: ${updateData.data.duration}ms`)
      
      if (updateData.data.errors.length > 0) {
        console.log(`⚠️ Errors: ${updateData.data.errors.join('; ')}`)
      }
    } else {
      console.error('❌ Update API failed:', updateData.error)
    }

    console.log('\n✅ API endpoint testing completed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Check if we're running in a Next.js environment
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  // Node.js environment - run the test
  testApiEndpoints().catch(console.error)
} else {
  console.log('Run this script with: pnpm tsx test-api-endpoints.ts')
}
