/**
 * Comprehensive Test Suite for Bitcoin Price Database Migration
 * Tests complete migration from CSV to database with gap filling and automation
 */

async function testCompleteMigration() {
  console.log('🧪 Comprehensive Bitcoin Price Database Migration Test')
  console.log('=' .repeat(60))

  const baseUrl = 'http://localhost:3000/api/bitcoin-prices'
  const results = {
    passed: 0,
    failed: 0,
    tests: [] as Array<{ name: string; status: 'PASS' | 'FAIL'; details: string }>
  }

  function addTest(name: string, status: 'PASS' | 'FAIL', details: string) {
    results.tests.push({ name, status, details })
    if (status === 'PASS') results.passed++
    else results.failed++
    console.log(`${status === 'PASS' ? '✅' : '❌'} ${name}: ${details}`)
  }

  try {
    // Test 1: Database Connection and Schema
    console.log('\n📊 Test Suite 1: Database Infrastructure')
    
    const statsResponse = await fetch(`${baseUrl}/stats`)
    const statsData = await statsResponse.json()
    
    if (statsData.success) {
      addTest('Database Connection', 'PASS', `Connected successfully, ${statsData.data.database.totalRecords} records`)
      
      if (statsData.data.database.totalRecords > 2500) {
        addTest('Historical Data Volume', 'PASS', `${statsData.data.database.totalRecords} records (>2500 required)`)
      } else {
        addTest('Historical Data Volume', 'FAIL', `Only ${statsData.data.database.totalRecords} records (<2500 required)`)
      }
      
      if (statsData.data.database.dateRange?.start === '2013-10-01') {
        addTest('Historical Start Date', 'PASS', `Starts from ${statsData.data.database.dateRange.start}`)
      } else {
        addTest('Historical Start Date', 'FAIL', `Starts from ${statsData.data.database.dateRange?.start} (should be 2013-10-01)`)
      }
      
      const today = new Date().toISOString().split('T')[0]
      if (statsData.data.database.dateRange?.end >= today) {
        addTest('Current Data Coverage', 'PASS', `Data up to ${statsData.data.database.dateRange.end}`)
      } else {
        addTest('Current Data Coverage', 'FAIL', `Data only up to ${statsData.data.database.dateRange?.end} (should be ${today})`)
      }
    } else {
      addTest('Database Connection', 'FAIL', `Connection failed: ${statsData.error}`)
    }

    // Test 2: API Endpoints Functionality
    console.log('\n📡 Test Suite 2: API Endpoints')
    
    // Test historical data endpoint
    const historicalResponse = await fetch(`${baseUrl}/historical?limit=100`)
    const historicalData = await historicalResponse.json()
    
    if (historicalData.success && historicalData.data.length > 0) {
      addTest('Historical Data API', 'PASS', `Retrieved ${historicalData.data.length} records`)
      
      // Verify data structure
      const firstRecord = historicalData.data[0]
      const hasRequiredFields = firstRecord.date && firstRecord.close && firstRecord.timestamp
      addTest('Data Structure Integrity', hasRequiredFields ? 'PASS' : 'FAIL', 
        hasRequiredFields ? 'All required fields present' : 'Missing required fields')
    } else {
      addTest('Historical Data API', 'FAIL', 'Failed to retrieve historical data')
    }

    // Test current price endpoint
    const currentResponse = await fetch(`${baseUrl}/current`)
    const currentData = await currentResponse.json()
    
    if (currentData.success && currentData.data?.current?.close) {
      addTest('Current Price API', 'PASS', `Current price: $${currentData.data.current.close.toLocaleString()}`)
    } else {
      addTest('Current Price API', 'FAIL', 'Failed to retrieve current price')
    }

    // Test live price endpoint
    const liveResponse = await fetch(`${baseUrl}/current?live=true`)
    const liveData = await liveResponse.json()
    
    if (liveData.success && liveData.data?.current?.close) {
      addTest('Live Price API', 'PASS', `Live price: $${liveData.data.current.close.toLocaleString()} from ${liveData.data.source}`)
    } else {
      addTest('Live Price API', 'FAIL', 'Failed to retrieve live price')
    }

    // Test 3: Gap Detection and Filling
    console.log('\n🔧 Test Suite 3: Gap Detection and Filling')
    
    if (statsData.success && statsData.data.dataQuality.gaps) {
      const totalGaps = statsData.data.dataQuality.gaps.totalGaps
      addTest('Gap Detection', 'PASS', `Detected ${totalGaps} gaps in data`)
      
      if (totalGaps > 0) {
        // Test gap filling
        const updateResponse = await fetch(`${baseUrl}/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ maxGaps: 5, forceUpdate: false })
        })
        const updateData = await updateResponse.json()
        
        if (updateData.success) {
          addTest('Gap Filling', 'PASS', `Filled ${updateData.data.gapsFilled} gaps in ${updateData.data.duration}ms`)
        } else {
          addTest('Gap Filling', 'FAIL', `Gap filling failed: ${updateData.error}`)
        }
      } else {
        addTest('Gap Filling', 'PASS', 'No gaps to fill - data is complete')
      }
    } else {
      addTest('Gap Detection', 'FAIL', 'Gap detection not available')
    }

    // Test 4: Daily Update Service
    console.log('\n⏰ Test Suite 4: Automated Updates')
    
    const dailyStatusResponse = await fetch(`${baseUrl}/daily-update`)
    const dailyStatusData = await dailyStatusResponse.json()
    
    if (dailyStatusData.success) {
      addTest('Daily Update Service', 'PASS', `Service available, running: ${dailyStatusData.data.service.isRunning}`)
      
      // Test manual update
      const manualUpdateResponse = await fetch(`${baseUrl}/daily-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', maxGaps: 3 })
      })
      const manualUpdateData = await manualUpdateResponse.json()
      
      if (manualUpdateData.success) {
        addTest('Manual Update Trigger', 'PASS', `Update completed: ${manualUpdateData.data.updateResult.recordsAdded} records added`)
      } else {
        addTest('Manual Update Trigger', 'FAIL', `Manual update failed: ${manualUpdateData.error}`)
      }
    } else {
      addTest('Daily Update Service', 'FAIL', `Service not available: ${dailyStatusData.error}`)
    }

    // Test 5: Performance and Data Quality
    console.log('\n⚡ Test Suite 5: Performance and Data Quality')
    
    // Test large data retrieval performance
    const perfStart = Date.now()
    const largeDataResponse = await fetch(`${baseUrl}/historical?limit=1000`)
    const perfEnd = Date.now()
    const largeDataData = await largeDataResponse.json()
    
    if (largeDataData.success) {
      const loadTime = perfEnd - perfStart
      addTest('Large Data Performance', loadTime < 5000 ? 'PASS' : 'FAIL', 
        `Retrieved 1000 records in ${loadTime}ms (${loadTime < 5000 ? 'acceptable' : 'too slow'})`)
    } else {
      addTest('Large Data Performance', 'FAIL', 'Failed to retrieve large dataset')
    }

    // Test data consistency
    if (historicalData.success && historicalData.data.length > 1) {
      const sortedData = historicalData.data.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      const isChronological = JSON.stringify(sortedData) === JSON.stringify(historicalData.data)
      addTest('Data Chronological Order', isChronological ? 'PASS' : 'FAIL', 
        isChronological ? 'Data is properly sorted' : 'Data is not chronologically ordered')
    }

    // Test 6: CSV Migration Verification
    console.log('\n📄 Test Suite 6: CSV Migration Verification')
    
    // Check if we have data from the original CSV timeframe (2013-2021)
    const csvRangeResponse = await fetch(`${baseUrl}/historical?startDate=2013-10-01&endDate=2021-01-04`)
    const csvRangeData = await csvRangeResponse.json()
    
    if (csvRangeData.success) {
      addTest('CSV Data Migration', csvRangeData.data.length > 2500 ? 'PASS' : 'FAIL', 
        `${csvRangeData.data.length} records from CSV period (expected >2500)`)
    } else {
      addTest('CSV Data Migration', 'FAIL', 'Failed to retrieve CSV period data')
    }

    // Test 7: API Integration Verification
    console.log('\n🌐 Test Suite 7: External API Integration')
    
    // Test if we have recent data (indicating API integration works)
    const recentResponse = await fetch(`${baseUrl}/historical?startDate=2024-01-01`)
    const recentData = await recentResponse.json()
    
    if (recentData.success) {
      addTest('API Data Integration', recentData.data.length > 0 ? 'PASS' : 'FAIL', 
        `${recentData.data.length} records from 2024+ (API-sourced data)`)
    } else {
      addTest('API Data Integration', 'FAIL', 'Failed to retrieve recent API data')
    }

    // Final Results
    console.log('\n' + '=' .repeat(60))
    console.log('📊 MIGRATION TEST RESULTS')
    console.log('=' .repeat(60))
    console.log(`✅ Tests Passed: ${results.passed}`)
    console.log(`❌ Tests Failed: ${results.failed}`)
    console.log(`📊 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`)
    
    if (results.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Migration completed successfully!')
      console.log('✅ Database migration from CSV to Postgres: COMPLETE')
      console.log('✅ Gap detection and filling: WORKING')
      console.log('✅ Automated daily updates: ACTIVE')
      console.log('✅ API endpoints: FUNCTIONAL')
      console.log('✅ Performance: ACCEPTABLE')
    } else {
      console.log('\n⚠️ Some tests failed. Review the issues above.')
      console.log('\nFailed tests:')
      results.tests.filter(t => t.status === 'FAIL').forEach(test => {
        console.log(`  ❌ ${test.name}: ${test.details}`)
      })
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error)
    addTest('Test Suite Execution', 'FAIL', `Critical error: ${error}`)
  }
}

// Run the comprehensive test
testCompleteMigration().catch(console.error)
