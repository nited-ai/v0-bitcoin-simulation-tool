/**
 * Test script for updated data loading functionality
 */

async function testDataLoading() {
  console.log('🧪 Testing Updated Data Loading')
  console.log('=' .repeat(50))

  try {
    // Test 1: Historical data loading (price engine)
    console.log('\n📊 Test 1: Price Engine Historical Data Loading')
    const { loadHistoricalPriceData } = await import('./lib/price-engine/historical-data-loader')
    
    const startTime = Date.now()
    const historicalData = await loadHistoricalPriceData()
    const loadTime = Date.now() - startTime
    
    console.log(`✅ Loaded ${historicalData.length} historical data points in ${loadTime}ms`)
    
    if (historicalData.length > 0) {
      const firstPoint = historicalData[0]
      const lastPoint = historicalData[historicalData.length - 1]
      
      console.log(`📅 Date range: ${new Date(firstPoint.time * 1000).toISOString().split('T')[0]} to ${new Date(lastPoint.time * 1000).toISOString().split('T')[0]}`)
      console.log(`💰 Price range: $${firstPoint.close} to $${lastPoint.close}`)
    }

    // Test 2: Simulation historical data loading
    console.log('\n📊 Test 2: Simulation Historical Data Loading')
    const { loadHistoricalData } = await import('./app/simulation/data/historicalDataLoader')
    
    const startTime2 = Date.now()
    const simulationData = await loadHistoricalData()
    const loadTime2 = Date.now() - startTime2
    
    console.log(`✅ Loaded ${simulationData.length} simulation data points in ${loadTime2}ms`)
    
    if (simulationData.length > 0) {
      const firstRecord = simulationData[0]
      const lastRecord = simulationData[simulationData.length - 1]
      
      console.log(`📅 Date range: ${firstRecord.date} to ${lastRecord.date}`)
      console.log(`💰 Price range: $${firstRecord.close} to $${lastRecord.close}`)
      console.log(`📈 OHLC available: O:${firstRecord.open} H:${firstRecord.high} L:${firstRecord.low} C:${firstRecord.close}`)
    }

    // Test 3: Current price loading
    console.log('\n💰 Test 3: Current Price Loading (Database)')
    const { loadCurrentBtcPrice } = await import('./lib/load-btc-price')
    
    const currentPrice = await loadCurrentBtcPrice(false) // Database first
    if (currentPrice) {
      console.log(`✅ Current BTC price (database): $${currentPrice.toLocaleString()}`)
    } else {
      console.log('❌ Failed to load current price from database')
    }

    // Test 4: Current price loading (Live)
    console.log('\n💰 Test 4: Current Price Loading (Live)')
    const livePrice = await loadCurrentBtcPrice(true) // Live price
    if (livePrice) {
      console.log(`✅ Current BTC price (live): $${livePrice.toLocaleString()}`)
      
      if (currentPrice && livePrice) {
        const difference = livePrice - currentPrice
        const percentChange = ((difference / currentPrice) * 100)
        console.log(`📊 Price difference: $${difference.toFixed(2)} (${percentChange.toFixed(2)}%)`)
      }
    } else {
      console.log('❌ Failed to load live price')
    }

    // Test 5: Database utilities
    console.log('\n📊 Test 5: Database Utilities')
    const { getCurrentBitcoinPrice, getDatabaseStats } = await import('./lib/price-engine/database-historical-loader')
    
    const dbCurrentPrice = await getCurrentBitcoinPrice()
    if (dbCurrentPrice) {
      console.log(`✅ Database current price: $${dbCurrentPrice.toLocaleString()}`)
    }

    const dbStats = await getDatabaseStats()
    if (dbStats) {
      console.log(`✅ Database stats:`)
      console.log(`   - Total records: ${dbStats.database.totalRecords}`)
      console.log(`   - Coverage: ${dbStats.database.dateRange?.coveragePercentage}%`)
      console.log(`   - Price range: $${dbStats.prices.lowest} - $${dbStats.prices.highest}`)
      console.log(`   - Data gaps: ${dbStats.dataQuality.gaps?.totalGaps || 'unknown'}`)
    }

    console.log('\n✅ Data loading tests completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testDataLoading().catch(console.error)
