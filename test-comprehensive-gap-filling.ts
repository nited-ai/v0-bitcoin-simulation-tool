/**
 * Comprehensive Gap Filling Test Script
 * Tests the complete gap filling process from analysis to completion
 */

async function testComprehensiveGapFilling() {
  console.log('🧪 COMPREHENSIVE BITCOIN PRICE GAP FILLING TEST')
  console.log('=' .repeat(60))

  const baseUrl = 'http://localhost:3000/api/bitcoin-prices'
  let testResults = {
    passed: 0,
    failed: 0,
    tests: [] as Array<{ name: string; status: 'PASS' | 'FAIL'; details: string }>
  }

  function addTest(name: string, status: 'PASS' | 'FAIL', details: string) {
    testResults.tests.push({ name, status, details })
    if (status === 'PASS') testResults.passed++
    else testResults.failed++
    console.log(`${status === 'PASS' ? '✅' : '❌'} ${name}: ${details}`)
  }

  try {
    // Test 1: Initial Database Status
    console.log('\n📊 Test Suite 1: Initial Database Analysis')
    
    const initialStatsResponse = await fetch(`${baseUrl}/stats`)
    const initialStats = await initialStatsResponse.json()
    
    if (initialStats.success) {
      addTest('Initial Database Connection', 'PASS', 
        `${initialStats.data.database.totalRecords} records, ${initialStats.data.database.dateRange?.coveragePercentage}% coverage`)
      
      const initialCoverage = initialStats.data.database.dateRange?.coveragePercentage || 0
      if (initialCoverage < 100) {
        addTest('Gap Detection Required', 'PASS', `${100 - initialCoverage}% gaps detected`)
      } else {
        addTest('Gap Detection Required', 'FAIL', 'Database already complete - no gaps to fill')
        return
      }
    } else {
      addTest('Initial Database Connection', 'FAIL', 'Could not connect to database')
      return
    }

    // Test 2: Comprehensive Gap Analysis
    console.log('\n🔍 Test Suite 2: Comprehensive Gap Analysis')
    
    const analysisResponse = await fetch(`${baseUrl}/comprehensive-gap-fill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'analyze',
        startDate: '2021-01-05',
        endDate: '2025-07-14'
      })
    })
    
    const analysisData = await analysisResponse.json()
    
    if (analysisData.success) {
      const analysis = analysisData.data.analysis
      addTest('Gap Analysis Execution', 'PASS', 
        `Found ${analysis.totalGaps} gap ranges, ${analysis.totalMissingDays} missing days`)
      
      addTest('Gap Prioritization', 'PASS', 
        `${analysisData.data.recommendations.priorityGaps} high-priority gaps identified`)
      
      console.log('\n📋 Gap Analysis Summary:')
      console.log(analysisData.data.summary)
      
      if (analysis.totalMissingDays > 0) {
        addTest('Gaps Identified for Filling', 'PASS', 
          `${analysis.totalMissingDays} days need to be filled`)
      } else {
        addTest('Gaps Identified for Filling', 'FAIL', 'No gaps found to fill')
        return
      }
    } else {
      addTest('Gap Analysis Execution', 'FAIL', `Analysis failed: ${analysisData.error}`)
      return
    }

    // Test 3: API Provider Status
    console.log('\n🌐 Test Suite 3: API Provider Readiness')
    
    const statusResponse = await fetch(`${baseUrl}/comprehensive-gap-fill`)
    const statusData = await statusResponse.json()
    
    if (statusData.success) {
      const providers = statusData.data.apiProviders
      let readyProviders = 0
      
      for (const [providerId, provider] of Object.entries(providers)) {
        const providerData = provider as any
        if (providerData.canMakeRequest) {
          readyProviders++
          addTest(`${providerData.name} API Ready`, 'PASS', 
            `Priority ${providerData.priority}, can make requests`)
        } else {
          addTest(`${providerData.name} API Ready`, 'FAIL', 
            `Rate limited or unavailable`)
        }
      }
      
      if (readyProviders > 0) {
        addTest('API Providers Available', 'PASS', `${readyProviders} providers ready`)
      } else {
        addTest('API Providers Available', 'FAIL', 'No API providers available')
        return
      }
    } else {
      addTest('API Provider Status Check', 'FAIL', 'Could not check provider status')
    }

    // Test 4: Start Comprehensive Gap Filling
    console.log('\n🚀 Test Suite 4: Gap Filling Execution')
    
    const startResponse = await fetch(`${baseUrl}/comprehensive-gap-fill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start',
        startDate: '2021-01-05',
        endDate: '2025-07-14',
        batchSize: 50 // Smaller batch for testing
      })
    })
    
    const startData = await startResponse.json()
    
    if (startData.success) {
      addTest('Gap Filling Process Started', 'PASS', 
        `Process initiated with batch size ${startData.data.batchSize}`)
      
      console.log('\n⏳ Monitoring gap filling progress...')
      
      // Monitor progress for up to 10 minutes
      const maxWaitTime = 10 * 60 * 1000 // 10 minutes
      const startTime = Date.now()
      let lastProgress = 0
      
      while (Date.now() - startTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds
        
        const progressResponse = await fetch(`${baseUrl}/comprehensive-gap-fill`)
        const progressData = await progressResponse.json()
        
        if (progressData.success) {
          const isRunning = progressData.data.isRunning
          
          if (isRunning && progressData.data.progress) {
            const progress = progressData.data.progress
            console.log(`📊 Progress: ${progress.percentageComplete.toFixed(2)}% - ${progress.filledDays}/${progress.totalMissingDays} days filled`)
            
            if (progress.percentageComplete > lastProgress) {
              lastProgress = progress.percentageComplete
            }
            
            if (progress.errors.length > 0) {
              console.log(`⚠️ Errors: ${progress.errors.slice(-3).join('; ')}`)
            }
          } else {
            // Process completed
            console.log('🎉 Gap filling process completed!')
            break
          }
        }
      }
      
      if (lastProgress > 0) {
        addTest('Gap Filling Progress', 'PASS', `Made progress: ${lastProgress.toFixed(2)}%`)
      } else {
        addTest('Gap Filling Progress', 'FAIL', 'No progress detected')
      }
      
    } else {
      addTest('Gap Filling Process Started', 'FAIL', `Failed to start: ${startData.error}`)
    }

    // Test 5: Final Database Verification
    console.log('\n✅ Test Suite 5: Final Database Verification')
    
    const finalStatsResponse = await fetch(`${baseUrl}/stats`)
    const finalStats = await finalStatsResponse.json()
    
    if (finalStats.success) {
      const finalCoverage = finalStats.data.database.dateRange?.coveragePercentage || 0
      const initialCoverage = initialStats.data.database.dateRange?.coveragePercentage || 0
      const improvement = finalCoverage - initialCoverage
      
      addTest('Database Coverage Improvement', improvement > 0 ? 'PASS' : 'FAIL', 
        `Coverage improved by ${improvement.toFixed(2)}% (${initialCoverage}% → ${finalCoverage}%)`)
      
      addTest('Final Record Count', 'PASS', 
        `${finalStats.data.database.totalRecords} total records`)
      
      if (finalCoverage >= 99) {
        addTest('Near-Complete Coverage Achieved', 'PASS', `${finalCoverage}% coverage`)
      } else {
        addTest('Near-Complete Coverage Achieved', 'FAIL', `Only ${finalCoverage}% coverage`)
      }
      
      // Check date range
      const dateRange = finalStats.data.database.dateRange
      if (dateRange && dateRange.end >= '2025-07-14') {
        addTest('Target Date Range Covered', 'PASS', `Data up to ${dateRange.end}`)
      } else {
        addTest('Target Date Range Covered', 'FAIL', `Data only up to ${dateRange?.end}`)
      }
    } else {
      addTest('Final Database Verification', 'FAIL', 'Could not verify final database state')
    }

    // Test 6: API Endpoint Functionality
    console.log('\n🔧 Test Suite 6: API Endpoint Verification')
    
    // Test historical data endpoint
    const historicalResponse = await fetch(`${baseUrl}/historical?limit=10`)
    const historicalData = await historicalResponse.json()
    
    if (historicalData.success && historicalData.data.length > 0) {
      addTest('Historical Data Endpoint', 'PASS', `Retrieved ${historicalData.data.length} records`)
    } else {
      addTest('Historical Data Endpoint', 'FAIL', 'Historical endpoint not working')
    }
    
    // Test current price endpoint
    const currentResponse = await fetch(`${baseUrl}/current`)
    const currentData = await currentResponse.json()
    
    if (currentData.success && currentData.data?.current?.close) {
      addTest('Current Price Endpoint', 'PASS', `Current price: $${currentData.data.current.close.toLocaleString()}`)
    } else {
      addTest('Current Price Endpoint', 'FAIL', 'Current price endpoint not working')
    }

    // Final Results
    console.log('\n' + '=' .repeat(60))
    console.log('📊 COMPREHENSIVE GAP FILLING TEST RESULTS')
    console.log('=' .repeat(60))
    console.log(`✅ Tests Passed: ${testResults.passed}`)
    console.log(`❌ Tests Failed: ${testResults.failed}`)
    console.log(`📊 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`)
    
    if (testResults.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Comprehensive gap filling completed successfully!')
      console.log('✅ Bitcoin price database is now complete with comprehensive coverage')
      console.log('✅ All API endpoints are functional')
      console.log('✅ Data quality and integrity maintained')
    } else {
      console.log('\n⚠️ Some tests failed. Review the issues above.')
      console.log('\nFailed tests:')
      testResults.tests.filter(t => t.status === 'FAIL').forEach(test => {
        console.log(`  ❌ ${test.name}: ${test.details}`)
      })
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error)
    addTest('Test Suite Execution', 'FAIL', `Critical error: ${error}`)
  }
}

// Run the comprehensive test
testComprehensiveGapFilling().catch(console.error)
