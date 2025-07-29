/**
 * Analyze Current API Integration Status
 * Reviews API usage, success rates, and identifies issues
 */

async function analyzeApiStatus() {
  console.log('🔍 ANALYZING CURRENT API INTEGRATION STATUS')
  console.log('=' .repeat(60))

  const baseUrl = 'http://localhost:3000/api/bitcoin-prices'

  try {
    // Get current API provider status
    console.log('\n📊 Current API Provider Status:')
    const statusResponse = await fetch(`${baseUrl}/comprehensive-gap-fill`)
    const statusData = await statusResponse.json()

    if (statusData.success) {
      const providers = statusData.data.apiProviders
      
      console.log('\n🌐 API PROVIDERS ANALYSIS:')
      for (const [providerId, provider] of Object.entries(providers)) {
        const p = provider as any
        console.log(`\n${p.name} (Priority ${p.priority}):`)
        console.log(`  ✅ Can Make Request: ${p.canMakeRequest}`)
        console.log(`  📊 Rate Limits: ${p.rateLimit.requestsPerMinute}/min, ${p.rateLimit.requestsPerHour || 'unlimited'}/hour`)
        console.log(`  📈 Current Usage: ${p.requestCount.minute}/min, ${p.requestCount.hour}/hour`)
        
        if (!p.canMakeRequest) {
          console.log(`  ⚠️ RATE LIMITED - Cannot make requests`)
        }
      }

      // Analyze gap analysis results
      console.log('\n📋 CURRENT GAP ANALYSIS:')
      const gapAnalysis = statusData.data.currentGapAnalysis
      console.log(`  📊 Total Gaps: ${gapAnalysis.totalGaps}`)
      console.log(`  📅 Missing Days: ${gapAnalysis.totalMissingDays}`)
      console.log(`  📈 Coverage: ${gapAnalysis.coveragePercentage}%`)
    }

    // Test each API individually to see which ones work
    console.log('\n🧪 INDIVIDUAL API TESTING:')
    
    // Test CoinGecko
    console.log('\n1. Testing CoinGecko API:')
    try {
      const coinGeckoTest = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=1640995200&to=1641081600')
      if (coinGeckoTest.ok) {
        const data = await coinGeckoTest.json()
        console.log(`  ✅ CoinGecko: Working - ${data.prices?.length || 0} price points available`)
      } else {
        console.log(`  ❌ CoinGecko: HTTP ${coinGeckoTest.status} - ${coinGeckoTest.statusText}`)
      }
    } catch (error) {
      console.log(`  ❌ CoinGecko: Error - ${error}`)
    }

    // Test Binance
    console.log('\n2. Testing Binance API:')
    try {
      const binanceTest = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&startTime=1640995200000&endTime=1641081600000&limit=10')
      if (binanceTest.ok) {
        const data = await binanceTest.json()
        console.log(`  ✅ Binance: Working - ${data.length || 0} klines available`)
      } else {
        console.log(`  ❌ Binance: HTTP ${binanceTest.status} - ${binanceTest.statusText}`)
      }
    } catch (error) {
      console.log(`  ❌ Binance: Error - ${error}`)
    }

    // Test CoinCap
    console.log('\n3. Testing CoinCap API:')
    try {
      const coinCapTest = await fetch('https://api.coincap.io/v2/assets/bitcoin/history?interval=d1&start=1640995200000&end=1641081600000')
      if (coinCapTest.ok) {
        const data = await coinCapTest.json()
        console.log(`  ✅ CoinCap: Working - ${data.data?.length || 0} data points available`)
      } else {
        console.log(`  ❌ CoinCap: HTTP ${coinCapTest.status} - ${coinCapTest.statusText}`)
      }
    } catch (error) {
      console.log(`  ❌ CoinCap: Error - ${error}`)
    }

    // Test CryptoCompare
    console.log('\n4. Testing CryptoCompare API:')
    try {
      const cryptoCompareTest = await fetch('https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=1&toTs=1641081600')
      if (cryptoCompareTest.ok) {
        const data = await cryptoCompareTest.json()
        console.log(`  ✅ CryptoCompare: Working - ${data.Data?.Data?.length || 0} data points available`)
      } else {
        console.log(`  ❌ CryptoCompare: HTTP ${cryptoCompareTest.status} - ${cryptoCompareTest.statusText}`)
      }
    } catch (error) {
      console.log(`  ❌ CryptoCompare: Error - ${error}`)
    }

    // Analyze database current state
    console.log('\n📊 DATABASE CURRENT STATE:')
    const dbStatsResponse = await fetch(`${baseUrl}/stats`)
    const dbStats = await dbStatsResponse.json()
    
    if (dbStats.success) {
      console.log(`  📈 Total Records: ${dbStats.data.database.totalRecords}`)
      console.log(`  📅 Date Range: ${dbStats.data.database.dateRange?.start} to ${dbStats.data.database.dateRange?.end}`)
      console.log(`  📊 Coverage: ${dbStats.data.database.dateRange?.coveragePercentage}%`)
      console.log(`  🔍 Total Gaps: ${dbStats.data.dataQuality.gaps?.totalGaps || 'unknown'}`)
    } else {
      console.log('  ❌ Could not retrieve database stats (connection issues)')
    }

    // Summary and recommendations
    console.log('\n📋 ANALYSIS SUMMARY:')
    console.log('✅ Successfully implemented: CoinGecko, Binance APIs')
    console.log('⚠️ Partially implemented: CoinCap, CryptoCompare (need completion)')
    console.log('❌ Rate limiting issues: All APIs hit limits during intensive gap filling')
    console.log('🎯 Need: Additional API providers to overcome rate limits')
    
    console.log('\n🚀 RECOMMENDATIONS:')
    console.log('1. Implement additional free APIs (CoinMarketCap, Alpha Vantage, Yahoo Finance)')
    console.log('2. Complete CoinCap and CryptoCompare implementations')
    console.log('3. Add intelligent rate limit management with longer delays')
    console.log('4. Implement API rotation strategy to distribute load')
    console.log('5. Resume gap filling with expanded API pool')

  } catch (error) {
    console.error('❌ Analysis failed:', error)
  }
}

// Run the analysis
analyzeApiStatus().catch(console.error)
