/**
 * Test script for gap detection and filling functionality
 */

import { enhancedBitcoinApiService } from './lib/services/bitcoin-api-service'

async function testGapDetection() {
  console.log('🧪 Testing Bitcoin API Service Gap Detection')
  console.log('=' .repeat(50))

  try {
    // Test 1: Detect all gaps
    console.log('\n📊 Test 1: Detecting data gaps...')
    const gapDetection = await enhancedBitcoinApiService.detectDataGaps()
    
    console.log(`Total gaps found: ${gapDetection.totalGaps}`)
    console.log(`Latest date in database: ${gapDetection.latestDate}`)
    
    if (gapDetection.totalGaps > 0) {
      console.log(`Oldest gap: ${gapDetection.oldestGap}`)
      console.log(`Newest gap: ${gapDetection.newestGap}`)
      console.log(`First 10 gaps: ${gapDetection.gaps.slice(0, 10).join(', ')}`)
    }

    // Test 2: Detect gaps in specific range (2021-2025)
    console.log('\n📊 Test 2: Detecting gaps from 2021 to present...')
    const recentGaps = await enhancedBitcoinApiService.detectDataGaps('2021-01-05', '2025-01-01')
    
    console.log(`Recent gaps (2021-2025): ${recentGaps.totalGaps}`)
    if (recentGaps.totalGaps > 0) {
      console.log(`Sample recent gaps: ${recentGaps.gaps.slice(0, 20).join(', ')}`)
    }

    // Test 3: Fill a small number of gaps (for testing)
    if (recentGaps.totalGaps > 0) {
      console.log('\n🔧 Test 3: Filling first 5 gaps...')
      const fillResult = await enhancedBitcoinApiService.fillDataGaps(5)
      
      console.log(`Fill operation success: ${fillResult.success}`)
      console.log(`Gaps filled: ${fillResult.gapsFilled}`)
      
      if (fillResult.errors.length > 0) {
        console.log(`Errors: ${fillResult.errors.join('; ')}`)
      }

      // Verify gaps were filled
      console.log('\n✅ Verifying gap filling...')
      const afterFillGaps = await enhancedBitcoinApiService.detectDataGaps('2021-01-05', '2025-01-01')
      console.log(`Gaps remaining after fill: ${afterFillGaps.totalGaps}`)
      console.log(`Gaps reduced by: ${recentGaps.totalGaps - afterFillGaps.totalGaps}`)
    }

    // Test 4: Test current price fetching
    console.log('\n💰 Test 4: Fetching current Bitcoin price...')
    const currentPrice = await enhancedBitcoinApiService.fetchCurrentPrice()
    
    if (currentPrice.success) {
      console.log(`Current BTC price: $${currentPrice.data[0].close.toLocaleString()}`)
      console.log(`Source: ${currentPrice.source}`)
    } else {
      console.log(`Failed to fetch current price: ${currentPrice.error}`)
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await enhancedBitcoinApiService.disconnect()
  }
}

// Run the test
testGapDetection().catch(console.error)
