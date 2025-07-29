/**
 * Test script for Daily Update Service
 */

async function testDailyUpdateService() {
  console.log('🧪 Testing Daily Update Service')
  console.log('=' .repeat(50))

  const baseUrl = 'http://localhost:3001/api/bitcoin-prices'

  try {
    // Test 1: Get service status
    console.log('\n📊 Test 1: Get Daily Update Service Status')
    const statusResponse = await fetch(`${baseUrl}/daily-update`)
    const statusData = await statusResponse.json()
    
    if (statusData.success) {
      console.log(`✅ Service running: ${statusData.data.service.isRunning}`)
      console.log(`✅ Last update: ${statusData.data.service.lastUpdateTime || 'Never'}`)
      console.log(`✅ Next update: ${statusData.data.service.nextUpdateTime || 'Not scheduled'}`)
    } else {
      console.error('❌ Status API failed:', statusData.error)
    }

    // Test 2: Perform manual update
    console.log('\n🔄 Test 2: Perform Manual Update')
    const updateResponse = await fetch(`${baseUrl}/daily-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'update',
        maxGaps: 10
      })
    })
    const updateData = await updateResponse.json()
    
    if (updateData.success) {
      console.log(`✅ Update completed: ${updateData.data.updateResult.recordsAdded} records added`)
      console.log(`✅ Gaps filled: ${updateData.data.updateResult.gapsFilled}`)
      console.log(`✅ Current price updated: ${updateData.data.updateResult.currentPriceUpdated}`)
      console.log(`✅ Duration: ${updateData.data.updateResult.duration}ms`)
      
      if (updateData.data.updateResult.errors.length > 0) {
        console.log(`⚠️ Errors: ${updateData.data.updateResult.errors.join('; ')}`)
      }
    } else {
      console.error('❌ Update API failed:', updateData.error)
    }

    // Test 3: Start service
    console.log('\n🚀 Test 3: Start Daily Update Service')
    const startResponse = await fetch(`${baseUrl}/daily-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'start'
      })
    })
    const startData = await startResponse.json()
    
    if (startData.success) {
      console.log(`✅ Service started: ${startData.data.isRunning}`)
      console.log(`✅ Next update: ${startData.data.nextUpdateTime}`)
    } else {
      console.error('❌ Start API failed:', startData.error)
    }

    // Test 4: Check database stats after update
    console.log('\n📊 Test 4: Check Database Stats After Update')
    const statsResponse = await fetch(`${baseUrl}/stats`)
    const statsData = await statsResponse.json()
    
    if (statsData.success) {
      console.log(`✅ Total records: ${statsData.data.database.totalRecords}`)
      console.log(`✅ Coverage: ${statsData.data.database.dateRange?.coveragePercentage}%`)
      console.log(`✅ Latest date: ${statsData.data.database.dateRange?.end}`)
      console.log(`✅ Total gaps: ${statsData.data.dataQuality.gaps?.totalGaps || 'unknown'}`)
      
      // Check recent updates
      if (statsData.data.dataQuality.updateHistory?.length > 0) {
        const recentUpdate = statsData.data.dataQuality.updateHistory[0]
        console.log(`✅ Most recent update: ${recentUpdate.source} - ${recentUpdate.recordsAdded} records added`)
      }
    } else {
      console.error('❌ Stats API failed:', statsData.error)
    }

    // Test 5: Test current price endpoint
    console.log('\n💰 Test 5: Test Current Price After Update')
    const currentResponse = await fetch(`${baseUrl}/current?live=true`)
    const currentData = await currentResponse.json()
    
    if (currentData.success) {
      console.log(`✅ Current price: $${currentData.data.current.close.toLocaleString()}`)
      console.log(`✅ Source: ${currentData.data.source || 'database'}`)
      console.log(`✅ Is live: ${currentData.data.isLive}`)
      console.log(`✅ Date: ${currentData.data.current.date}`)
    } else {
      console.error('❌ Current price API failed:', currentData.error)
    }

    console.log('\n✅ Daily update service testing completed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testDailyUpdateService().catch(console.error)
