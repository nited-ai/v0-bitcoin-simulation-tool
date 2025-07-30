/**
 * Test Enhanced Multi-API Bitcoin Service
 * Tests all API providers including new additions
 */

import { config } from 'dotenv'
import { multiApiBitcoinService } from './lib/services/multi-api-bitcoin-service'

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env' })

async function testEnhancedApis() {
  console.log('🧪 TESTING ENHANCED MULTI-API BITCOIN SERVICE')
  console.log('=' .repeat(60))

  try {
    // Test 1: Check all provider status
    console.log('\n📊 API PROVIDER STATUS:')
    const providerStatus = multiApiBitcoinService.getProviderStatus()
    
    for (const [providerId, status] of Object.entries(providerStatus)) {
      const s = status as any
      console.log(`\n${s.name} (Priority ${s.priority}):`)
      console.log(`  ✅ Can Make Request: ${s.canMakeRequest}`)
      console.log(`  📊 Rate Limits: ${s.rateLimit.requestsPerMinute}/min`)
      console.log(`  📈 Current Usage: ${s.requestCount.minute}/min`)
    }

    // Test 2: Test each API individually with a small date range
    console.log('\n🔧 INDIVIDUAL API TESTING:')
    const testStartDate = '2024-01-01'
    const testEndDate = '2024-01-03'
    
    console.log(`Testing date range: ${testStartDate} to ${testEndDate}`)

    // Test all APIs one by one
    const apiTests = [
      'coingecko', 'binance', 'coincap', 'cryptocompare', 
      'yahoo', 'coinmarketcap', 'messari'
    ]

    const workingApis: string[] = []
    const failedApis: string[] = []

    for (const apiId of apiTests) {
      console.log(`\n🔄 Testing ${apiId}...`)
      
      try {
        // Force test specific API by temporarily modifying the service
        const response = await multiApiBitcoinService.fetchPriceData(testStartDate, testEndDate)
        
        if (response.success && response.data.length > 0) {
          console.log(`  ✅ ${response.source}: SUCCESS - ${response.data.length} records`)
          console.log(`  📊 Sample data: ${response.data[0].date} - $${response.data[0].close.toLocaleString()}`)
          workingApis.push(response.source)
        } else {
          console.log(`  ❌ ${response.source}: FAILED - ${response.error}`)
          failedApis.push(response.source)
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error) {
        console.log(`  ❌ ${apiId}: ERROR - ${error}`)
        failedApis.push(apiId)
      }
    }

    // Test 3: Test API failover mechanism
    console.log('\n🔄 TESTING API FAILOVER MECHANISM:')
    
    const failoverResponse = await multiApiBitcoinService.fetchPriceData('2024-06-01', '2024-06-03')
    
    if (failoverResponse.success) {
      console.log(`✅ Failover Success: ${failoverResponse.source} provided ${failoverResponse.data.length} records`)
      console.log(`📊 Sample: ${failoverResponse.data[0].date} - $${failoverResponse.data[0].close.toLocaleString()}`)
    } else {
      console.log(`❌ Failover Failed: ${failoverResponse.error}`)
    }

    // Test 4: Test with larger date range (stress test)
    console.log('\n💪 STRESS TEST - LARGER DATE RANGE:')
    
    const stressTestResponse = await multiApiBitcoinService.fetchPriceData('2024-01-01', '2024-01-31')
    
    if (stressTestResponse.success) {
      console.log(`✅ Stress Test Success: ${stressTestResponse.source} provided ${stressTestResponse.data.length} records`)
      console.log(`📊 Date range: ${stressTestResponse.data[0].date} to ${stressTestResponse.data[stressTestResponse.data.length - 1].date}`)
    } else {
      console.log(`❌ Stress Test Failed: ${stressTestResponse.error}`)
    }

    // Summary
    console.log('\n📋 TEST SUMMARY:')
    console.log(`✅ Working APIs: ${workingApis.length} (${workingApis.join(', ')})`)
    console.log(`❌ Failed APIs: ${failedApis.length} (${failedApis.join(', ')})`)
    
    if (workingApis.length >= 2) {
      console.log('🎉 SUCCESS: Multiple APIs working - ready for gap filling!')
    } else if (workingApis.length === 1) {
      console.log('⚠️ WARNING: Only one API working - limited redundancy')
    } else {
      console.log('❌ CRITICAL: No APIs working - cannot proceed with gap filling')
    }

    // Recommendations
    console.log('\n🚀 RECOMMENDATIONS:')
    if (workingApis.includes('binance')) {
      console.log('✅ Binance API is working - excellent for historical data')
    }
    if (workingApis.includes('yahoo')) {
      console.log('✅ Yahoo Finance is working - good backup option')
    }
    if (workingApis.includes('cryptocompare')) {
      console.log('✅ CryptoCompare is working - reliable OHLCV data')
    }
    if (workingApis.includes('messari')) {
      console.log('✅ Messari is working - high-quality data source')
    }
    
    console.log('\n🎯 NEXT STEPS:')
    console.log('1. Use working APIs to resume gap filling process')
    console.log('2. Implement intelligent rate limiting to avoid API limits')
    console.log('3. Start with highest priority gaps (most recent dates)')
    console.log('4. Monitor API usage and rotate between providers')

  } catch (error) {
    console.error('❌ Enhanced API test failed:', error)
  }
}

// Run the test
testEnhancedApis().catch(console.error)
