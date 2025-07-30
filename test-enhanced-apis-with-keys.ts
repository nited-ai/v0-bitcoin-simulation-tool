/**
 * Test Enhanced Multi-API Bitcoin Service with API Keys
 * Tests all API providers including CoinCap and CoinDesk with API keys
 */

import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env' })

async function testEnhancedApisWithKeys() {
  console.log('🧪 TESTING ENHANCED MULTI-API SYSTEM WITH API KEYS')
  console.log('=' .repeat(60))

  const testStartDate = '2024-01-01'
  const testEndDate = '2024-01-03'
  
  console.log(`📅 Test Date Range: ${testStartDate} to ${testEndDate}`)

  const apiTests = [
    {
      name: 'CoinCap API (with API Key)',
      test: async () => {
        const url = `https://api.coincap.io/v2/candles?exchange=binance&interval=d1&baseId=bitcoin&quoteId=tether&start=${new Date(testStartDate).getTime()}&end=${new Date(testEndDate).getTime()}`
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Authorization': 'Bearer 1566c56f-f8a4-43b9-8d62-20e5105c298b',
            'User-Agent': 'Bitcoin-Simulation-Tool/1.0'
          }
        })

        if (response.ok) {
          const data = await response.json()
          return {
            success: true,
            count: data.data?.length || 0,
            sample: data.data?.[0] ? {
              date: new Date(data.data[0].period).toISOString().split('T')[0],
              close: parseFloat(data.data[0].close)
            } : null
          }
        } else {
          return { success: false, error: `HTTP ${response.status}` }
        }
      }
    },
    {
      name: 'CoinCap Assets API (fallback)',
      test: async () => {
        const url = `https://api.coincap.io/v2/assets/bitcoin/history?interval=d1&start=${new Date(testStartDate).getTime()}&end=${new Date(testEndDate).getTime()}`
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Authorization': 'Bearer 1566c56f-f8a4-43b9-8d62-20e5105c298b',
            'User-Agent': 'Bitcoin-Simulation-Tool/1.0'
          }
        })

        if (response.ok) {
          const data = await response.json()
          return {
            success: true,
            count: data.data?.length || 0,
            sample: data.data?.[0] ? {
              date: new Date(data.data[0].time).toISOString().split('T')[0],
              close: parseFloat(data.data[0].priceUsd)
            } : null
          }
        } else {
          return { success: false, error: `HTTP ${response.status}` }
        }
      }
    },
    {
      name: 'CoinDesk API (with API Key)',
      test: async () => {
        const url = `https://api.coindesk.com/v1/bpi/historical/close.json?start=${testStartDate}&end=${testEndDate}`
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Authorization': 'Bearer 3e9ba37b23ad618af9308dfea087cd26884b1a91c666c514403cc4e41103343e',
            'User-Agent': 'Bitcoin-Simulation-Tool/1.0'
          }
        })

        if (response.ok) {
          const data = await response.json()
          const prices = data.bpi || {}
          const dates = Object.keys(prices)
          return {
            success: true,
            count: dates.length,
            sample: dates.length > 0 ? {
              date: dates[0],
              close: parseFloat(prices[dates[0]])
            } : null
          }
        } else {
          return { success: false, error: `HTTP ${response.status}` }
        }
      }
    },
    {
      name: 'CoinDesk API (public)',
      test: async () => {
        const url = `https://api.coindesk.com/v1/bpi/historical/close.json?start=${testStartDate}&end=${testEndDate}`
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Bitcoin-Simulation-Tool/1.0'
          }
        })

        if (response.ok) {
          const data = await response.json()
          const prices = data.bpi || {}
          const dates = Object.keys(prices)
          return {
            success: true,
            count: dates.length,
            sample: dates.length > 0 ? {
              date: dates[0],
              close: parseFloat(prices[dates[0]])
            } : null
          }
        } else {
          return { success: false, error: `HTTP ${response.status}` }
        }
      }
    },
    {
      name: 'Binance API',
      test: async () => {
        const startTime = new Date(testStartDate).getTime()
        const endTime = new Date(testEndDate).getTime()
        const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&startTime=${startTime}&endTime=${endTime}&limit=10`
        
        const response = await fetch(url)

        if (response.ok) {
          const data = await response.json()
          return {
            success: true,
            count: data.length,
            sample: data.length > 0 ? {
              date: new Date(data[0][0]).toISOString().split('T')[0],
              close: parseFloat(data[0][4])
            } : null
          }
        } else {
          return { success: false, error: `HTTP ${response.status}` }
        }
      }
    },
    {
      name: 'CryptoCompare API',
      test: async () => {
        const endTimestamp = Math.floor(new Date(testEndDate).getTime() / 1000)
        const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=3&toTs=${endTimestamp}`
        
        const response = await fetch(url)

        if (response.ok) {
          const data = await response.json()
          const records = data.Data?.Data || []
          return {
            success: true,
            count: records.length,
            sample: records.length > 0 ? {
              date: new Date(records[0].time * 1000).toISOString().split('T')[0],
              close: records[0].close
            } : null
          }
        } else {
          return { success: false, error: `HTTP ${response.status}` }
        }
      }
    },
    {
      name: 'Yahoo Finance API',
      test: async () => {
        const startTimestamp = Math.floor(new Date(testStartDate).getTime() / 1000)
        const endTimestamp = Math.floor(new Date(testEndDate).getTime() / 1000)
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d`
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })

        if (response.ok) {
          const data = await response.json()
          const timestamps = data.chart?.result?.[0]?.timestamp || []
          const quotes = data.chart?.result?.[0]?.indicators?.quote?.[0] || {}
          return {
            success: true,
            count: timestamps.length,
            sample: timestamps.length > 0 ? {
              date: new Date(timestamps[0] * 1000).toISOString().split('T')[0],
              close: quotes.close?.[0]
            } : null
          }
        } else {
          return { success: false, error: `HTTP ${response.status}` }
        }
      }
    },
    {
      name: 'Messari API (public)',
      test: async () => {
        const url = `https://data.messari.io/api/v1/assets/bitcoin/metrics/price/time-series?start=${testStartDate}&end=${testEndDate}&interval=1d`
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Bitcoin-Simulation-Tool/1.0'
          }
        })

        if (response.ok) {
          const data = await response.json()
          const values = data.data?.values || []
          return {
            success: true,
            count: values.length,
            sample: values.length > 0 ? {
              date: new Date(values[0][0]).toISOString().split('T')[0],
              close: values[0][4]
            } : null
          }
        } else {
          return { success: false, error: `HTTP ${response.status}` }
        }
      }
    }
  ]

  // Run all tests
  const results = []
  
  for (const apiTest of apiTests) {
    console.log(`\n🔄 Testing ${apiTest.name}...`)
    
    try {
      const result = await apiTest.test()
      
      if (result.success) {
        console.log(`  ✅ SUCCESS: ${result.count} records retrieved`)
        if (result.sample) {
          console.log(`  📊 Sample: ${result.sample.date} - $${result.sample.close.toLocaleString()}`)
        }
        results.push({ name: apiTest.name, status: 'SUCCESS', count: result.count })
      } else {
        console.log(`  ❌ FAILED: ${result.error}`)
        results.push({ name: apiTest.name, status: 'FAILED', error: result.error })
      }
    } catch (error) {
      console.log(`  ❌ ERROR: ${error}`)
      results.push({ name: apiTest.name, status: 'ERROR', error: String(error) })
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Summary
  console.log('\n📊 ENHANCED API TEST RESULTS:')
  console.log('=' .repeat(60))
  
  const successful = results.filter(r => r.status === 'SUCCESS')
  const failed = results.filter(r => r.status !== 'SUCCESS')
  
  console.log(`✅ Successful APIs: ${successful.length}`)
  successful.forEach(r => {
    console.log(`   - ${r.name}: ${r.count} records`)
  })
  
  console.log(`\n❌ Failed APIs: ${failed.length}`)
  failed.forEach(r => {
    console.log(`   - ${r.name}: ${r.error}`)
  })
  
  console.log(`\n📈 Success Rate: ${Math.round((successful.length / results.length) * 100)}%`)
  
  if (successful.length >= 4) {
    console.log('\n🎉 EXCELLENT! Multiple APIs working - ready for comprehensive gap filling!')
    console.log('✅ Enhanced multi-API system with API keys is operational')
    console.log('✅ Sufficient redundancy to overcome rate limiting')
    console.log('✅ Ready to complete remaining 1,392 days of missing data')
  } else if (successful.length >= 2) {
    console.log('\n✅ GOOD! Some APIs working - can proceed with gap filling')
    console.log('⚠️ Limited redundancy - may encounter rate limiting')
  } else {
    console.log('\n⚠️ LIMITED! Few APIs working - may need to troubleshoot')
    console.log('❌ Insufficient redundancy for reliable gap filling')
  }
}

// Run the enhanced API test
testEnhancedApisWithKeys().catch(console.error)
