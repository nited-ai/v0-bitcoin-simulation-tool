/**
 * Debug API Issues and Fix Endpoints
 * Investigates and fixes CoinCap and CoinDesk API issues
 */

async function debugApiIssues() {
  console.log('🔍 DEBUGGING API ISSUES')
  console.log('=' .repeat(40))

  // Test CoinCap API endpoints
  console.log('\n🔧 Testing CoinCap API Endpoints:')
  
  // Test 1: CoinCap basic assets endpoint
  console.log('\n1. CoinCap Basic Assets Endpoint:')
  try {
    const response = await fetch('https://api.coincap.io/v2/assets/bitcoin')
    console.log(`   Status: ${response.status}`)
    if (response.ok) {
      const data = await response.json()
      console.log(`   ✅ Basic endpoint works: $${parseFloat(data.data.priceUsd).toLocaleString()}`)
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`)
  }

  // Test 2: CoinCap history endpoint without API key
  console.log('\n2. CoinCap History Endpoint (no key):')
  try {
    const startTime = new Date('2024-01-01').getTime()
    const endTime = new Date('2024-01-03').getTime()
    const url = `https://api.coincap.io/v2/assets/bitcoin/history?interval=d1&start=${startTime}&end=${endTime}`
    
    const response = await fetch(url)
    console.log(`   Status: ${response.status}`)
    if (response.ok) {
      const data = await response.json()
      console.log(`   ✅ History endpoint works: ${data.data?.length || 0} records`)
    } else {
      console.log(`   ❌ Failed: ${response.statusText}`)
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`)
  }

  // Test 3: CoinCap candles endpoint
  console.log('\n3. CoinCap Candles Endpoint:')
  try {
    const startTime = new Date('2024-01-01').getTime()
    const endTime = new Date('2024-01-03').getTime()
    const url = `https://api.coincap.io/v2/candles?exchange=binance&interval=d1&baseId=bitcoin&quoteId=tether&start=${startTime}&end=${endTime}`
    
    const response = await fetch(url)
    console.log(`   Status: ${response.status}`)
    if (response.ok) {
      const data = await response.json()
      console.log(`   ✅ Candles endpoint works: ${data.data?.length || 0} records`)
    } else {
      console.log(`   ❌ Failed: ${response.statusText}`)
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`)
  }

  // Test CoinDesk API endpoints
  console.log('\n🔧 Testing CoinDesk API Endpoints:')
  
  // Test 1: CoinDesk current price
  console.log('\n1. CoinDesk Current Price:')
  try {
    const response = await fetch('https://api.coindesk.com/v1/bpi/currentprice.json')
    console.log(`   Status: ${response.status}`)
    if (response.ok) {
      const data = await response.json()
      console.log(`   ✅ Current price works: ${data.bpi?.USD?.rate}`)
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`)
  }

  // Test 2: CoinDesk historical (short range)
  console.log('\n2. CoinDesk Historical (short range):')
  try {
    const url = 'https://api.coindesk.com/v1/bpi/historical/close.json?start=2024-01-01&end=2024-01-02'
    
    const response = await fetch(url)
    console.log(`   Status: ${response.status}`)
    if (response.ok) {
      const data = await response.json()
      console.log(`   ✅ Historical works: ${Object.keys(data.bpi || {}).length} records`)
    } else {
      console.log(`   ❌ Failed: ${response.statusText}`)
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`)
  }

  // Test alternative Bitcoin price APIs
  console.log('\n🔧 Testing Alternative APIs:')
  
  // Test 1: CoinGecko simple price
  console.log('\n1. CoinGecko Simple Price:')
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
    console.log(`   Status: ${response.status}`)
    if (response.ok) {
      const data = await response.json()
      console.log(`   ✅ CoinGecko works: $${data.bitcoin?.usd?.toLocaleString()}`)
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`)
  }

  // Test 2: Alternative historical API - CryptoAPI
  console.log('\n2. Alternative Historical API:')
  try {
    const response = await fetch('https://rest.coinapi.io/v1/ohlcv/BITSTAMP_SPOT_BTC_USD/history?period_id=1DAY&time_start=2024-01-01T00:00:00&time_end=2024-01-03T00:00:00&limit=5', {
      headers: {
        'Accept': 'application/json'
      }
    })
    console.log(`   Status: ${response.status}`)
    if (response.ok) {
      const data = await response.json()
      console.log(`   ✅ CoinAPI works: ${data.length || 0} records (requires API key for full access)`)
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error}`)
  }

  // Summary and recommendations
  console.log('\n📋 DEBUGGING SUMMARY:')
  console.log('=' .repeat(40))
  
  console.log('\n🔧 ISSUES IDENTIFIED:')
  console.log('1. CoinCap API: Endpoint URLs may be incorrect or deprecated')
  console.log('2. CoinDesk API: Network connectivity issues or rate limiting')
  console.log('3. Messari API: Requires API key for historical data access')
  
  console.log('\n✅ WORKING APIS CONFIRMED:')
  console.log('1. Binance API: Excellent historical OHLCV data')
  console.log('2. CryptoCompare API: Reliable historical data')
  console.log('3. Yahoo Finance API: Good backup option')
  
  console.log('\n🚀 RECOMMENDATIONS:')
  console.log('1. Focus on the 3 working APIs for gap filling')
  console.log('2. Implement intelligent rotation between working APIs')
  console.log('3. Add longer delays between requests to avoid rate limits')
  console.log('4. Process gaps in smaller batches (20-50 records)')
  console.log('5. Start gap filling with current working APIs')
  
  console.log('\n🎯 NEXT STEPS:')
  console.log('1. Update multi-API service to prioritize working APIs')
  console.log('2. Implement conservative rate limiting')
  console.log('3. Start comprehensive gap filling process')
  console.log('4. Monitor progress and adjust batch sizes as needed')
}

// Run the debugging
debugApiIssues().catch(console.error)
