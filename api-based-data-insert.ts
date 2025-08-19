/**
 * API-Based Data Insert
 * Uses the application's API endpoints to insert Bitcoin price data
 */

interface BitcoinPriceRecord {
  date: string
  close: number
  open?: number
  high?: number
  low?: number
  volume?: number
}

interface ApiResponse {
  success: boolean
  data: BitcoinPriceRecord[]
  message?: string
}

async function apiBasedDataInsert() {
  console.log('🌐 API-BASED BITCOIN PRICE DATA INSERT')
  console.log('=' .repeat(50))

  const baseUrl = 'http://localhost:3000/api/bitcoin-prices'

  try {
    // First, check if server is running
    console.log('\n🔍 Checking server status...')
    
    try {
      const serverTest = await fetch(`${baseUrl}/stats`, {
        signal: AbortSignal.timeout(5000)
      })
      
      if (serverTest.ok) {
        const stats = await serverTest.json()
        console.log('✅ Server is running')
        console.log(`📊 Current Records: ${stats.data?.database?.totalRecords || 'unknown'}`)
        console.log(`📈 Coverage: ${stats.data?.database?.dateRange?.coveragePercentage || 'unknown'}%`)
      } else {
        console.log('❌ Server responded with error:', serverTest.status)
        return
      }
    } catch (error) {
      console.log('❌ Server is not running or not responding')
      console.log('💡 Please start the server with: pnpm dev')
      return
    }

    // Try to use the comprehensive gap fill API
    console.log('\n🚀 Starting API-based gap filling...')
    
    const gapFillResponse = await fetch(`${baseUrl}/comprehensive-gap-fill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start',
        startDate: '2021-01-05',
        endDate: '2025-07-14',
        batchSize: 25 // Small batch size to avoid connection issues
      })
    })

    const gapFillData = await gapFillResponse.json()

    if (gapFillData.success) {
      console.log('✅ Gap filling process started via API')
      console.log('📦 Batch Size:', gapFillData.data.batchSize)
      
      // Monitor progress
      console.log('\n⏳ Monitoring progress...')
      
      let attempts = 0
      const maxAttempts = 60 // 10 minutes of monitoring
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds
        
        try {
          const progressResponse = await fetch(`${baseUrl}/comprehensive-gap-fill`)
          const progressData = await progressResponse.json()
          
          if (progressData.success) {
            const isRunning = progressData.data.isRunning
            
            if (isRunning && progressData.data.progress) {
              const progress = progressData.data.progress
              console.log(`📊 Progress: ${progress.percentageComplete.toFixed(2)}% - ${progress.filledDays}/${progress.totalMissingDays} days`)
              
              if (progress.errors.length > 0) {
                console.log(`⚠️ Recent errors: ${progress.errors.slice(-1)[0]}`)
              }
            } else {
              console.log('🎉 Gap filling process completed!')
              break
            }
          }
        } catch (error) {
          console.log(`⚠️ Progress check failed: ${error}`)
        }
        
        attempts++
      }
      
      if (attempts >= maxAttempts) {
        console.log('⏰ Monitoring timeout reached')
      }
      
    } else {
      console.log('❌ Gap filling API failed:', gapFillData.error)
      
      if (gapFillData.error?.includes('already running')) {
        console.log('ℹ️ Process may already be running, checking status...')
        
        const statusResponse = await fetch(`${baseUrl}/comprehensive-gap-fill`)
        const statusData = await statusResponse.json()
        
        if (statusData.success && statusData.data.isRunning) {
          console.log('✅ Gap filling is already in progress')
          console.log('📊 Current progress:', statusData.data.progress?.percentageComplete?.toFixed(2) + '%')
        }
      }
    }

    // Final verification
    console.log('\n📊 FINAL VERIFICATION:')
    console.log('=' .repeat(50))
    
    const finalStatsResponse = await fetch(`${baseUrl}/stats`)
    const finalStats = await finalStatsResponse.json()
    
    if (finalStats.success) {
      console.log(`📈 Total Records: ${finalStats.data.database.totalRecords.toLocaleString()}`)
      console.log(`📊 Coverage: ${finalStats.data.database.dateRange?.coveragePercentage}%`)
      console.log(`📅 Date Range: ${finalStats.data.database.dateRange?.start} to ${finalStats.data.database.dateRange?.end}`)
      
      const coverage = finalStats.data.database.dateRange?.coveragePercentage || 0
      
      if (coverage >= 95) {
        console.log('\n🎉 EXCELLENT! Near-complete coverage achieved!')
        console.log('✅ Database is ready for chart testing')
      } else if (coverage >= 80) {
        console.log('\n✅ GOOD! High coverage achieved!')
        console.log('⚠️ Some gaps may remain')
      } else {
        console.log('\n⚠️ PARTIAL! Coverage needs improvement')
      }
    }

    // Test historical data endpoint
    console.log('\n🧪 Testing Historical Data Endpoint:')
    
    const historicalResponse = await fetch(`${baseUrl}/historical?limit=10`)
    const historicalData = await historicalResponse.json()
    
    if (historicalData.success && historicalData.data.length > 0) {
      console.log(`✅ Historical endpoint working: ${historicalData.data.length} records`)
      console.log(`📊 Sample: ${historicalData.data[0].date} - $${historicalData.data[0].close.toLocaleString()}`)
    } else {
      console.log('❌ Historical endpoint not working properly')
    }

    // Test specific date range that had gaps
    console.log('\n🔍 Testing Previously Missing Date Range:')
    
    const testResponse = await fetch(`${baseUrl}/historical?startDate=2023-01-01&endDate=2023-12-31&limit=100`)
    const testData = await testResponse.json()
    
    if (testData.success && testData.data.length > 0) {
      console.log(`✅ 2023 data available: ${testData.data.length} records`)
      console.log(`📊 Sample: ${testData.data[0].date} - $${testData.data[0].close.toLocaleString()}`)
      
      // Check for data continuity
      const dates = testData.data.map((d: BitcoinPriceRecord) => d.date).sort()
      console.log(`📅 Date range: ${dates[0]} to ${dates[dates.length - 1]}`)
    } else {
      console.log('⚠️ 2023 data still missing or limited')
    }

    console.log('\n🎯 NEXT STEPS:')
    console.log('1. Check if chart display issues are resolved')
    console.log('2. Test Bitcoin simulation interface')
    console.log('3. Verify price forecast charts show proper curves')
    console.log('4. If charts still show straight lines, investigate chart component')

  } catch (error) {
    console.error('❌ API-based data insert failed:', error)
  }
}

// Run the API-based data insert
apiBasedDataInsert().catch(console.error)
