/**
 * Test gap filling API
 */

async function testGapFilling() {
  console.log('🔧 Testing Gap Filling API')
  console.log('=' .repeat(40))

  try {
    console.log('📊 Checking current database stats...')
    const statsResponse = await fetch('http://localhost:3000/api/bitcoin-prices/stats')
    const statsData = await statsResponse.json()
    
    if (statsData.success) {
      console.log(`✅ Current records: ${statsData.data.database.totalRecords}`)
      console.log(`✅ Date range: ${statsData.data.database.dateRange.start} to ${statsData.data.database.dateRange.end}`)
      console.log(`✅ Total gaps: ${statsData.data.dataQuality.gaps.totalGaps}`)
    }

    console.log('\n🔧 Starting gap filling (50 gaps)...')
    const updateResponse = await fetch('http://localhost:3000/api/bitcoin-prices/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        maxGaps: 50,
        forceUpdate: true
      })
    })

    const updateData = await updateResponse.json()
    
    if (updateData.success) {
      console.log(`✅ Gap filling completed!`)
      console.log(`✅ Gaps filled: ${updateData.data.gapsFilled}`)
      console.log(`✅ Duration: ${updateData.data.duration}ms`)
      console.log(`✅ Source: ${updateData.data.source}`)
      
      if (updateData.data.errors.length > 0) {
        console.log(`⚠️ Errors: ${updateData.data.errors.join('; ')}`)
      }
    } else {
      console.error('❌ Gap filling failed:', updateData.error)
    }

    console.log('\n📊 Checking updated database stats...')
    const newStatsResponse = await fetch('http://localhost:3000/api/bitcoin-prices/stats')
    const newStatsData = await newStatsResponse.json()
    
    if (newStatsData.success) {
      console.log(`✅ New record count: ${newStatsData.data.database.totalRecords}`)
      console.log(`✅ New date range: ${newStatsData.data.database.dateRange.start} to ${newStatsData.data.database.dateRange.end}`)
      console.log(`✅ Remaining gaps: ${newStatsData.data.dataQuality.gaps.totalGaps}`)
      console.log(`✅ Coverage: ${newStatsData.data.database.dateRange.coveragePercentage}%`)
    }

    console.log('\n🎉 Gap filling test completed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testGapFilling().catch(console.error)
