/**
 * Resume Comprehensive Gap Filling Process
 * Uses enhanced multi-API system to complete Bitcoin price database
 */

async function resumeGapFilling() {
  console.log('🚀 RESUMING COMPREHENSIVE GAP FILLING PROCESS')
  console.log('=' .repeat(60))

  const baseUrl = 'http://localhost:3000/api/bitcoin-prices'

  try {
    // Step 1: Check current database status
    console.log('\n📊 STEP 1: Current Database Status')
    
    const statsResponse = await fetch(`${baseUrl}/stats`)
    const statsData = await statsResponse.json()
    
    if (statsData.success) {
      console.log(`✅ Current Records: ${statsData.data.database.totalRecords}`)
      console.log(`✅ Coverage: ${statsData.data.database.dateRange?.coveragePercentage}%`)
      console.log(`✅ Date Range: ${statsData.data.database.dateRange?.start} to ${statsData.data.database.dateRange?.end}`)
      console.log(`✅ Total Gaps: ${statsData.data.dataQuality.gaps?.totalGaps || 'unknown'}`)
    } else {
      console.error('❌ Could not retrieve database stats')
      return
    }

    // Step 2: Perform fresh gap analysis
    console.log('\n🔍 STEP 2: Fresh Gap Analysis')
    
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
      console.log(`✅ Gap Analysis Complete:`)
      console.log(`   - Total Gaps: ${analysis.totalGaps}`)
      console.log(`   - Missing Days: ${analysis.totalMissingDays}`)
      console.log(`   - Current Coverage: ${analysis.coveragePercentage}%`)
      console.log(`   - High Priority Gaps: ${analysisData.data.recommendations.priorityGaps}`)
      
      if (analysis.totalMissingDays === 0) {
        console.log('🎉 NO GAPS FOUND! Database is already complete!')
        return
      }
    } else {
      console.error('❌ Gap analysis failed:', analysisData.error)
      return
    }

    // Step 3: Check API provider readiness
    console.log('\n🌐 STEP 3: API Provider Readiness Check')
    
    const providerResponse = await fetch(`${baseUrl}/comprehensive-gap-fill`)
    const providerData = await providerResponse.json()
    
    if (providerData.success) {
      const providers = providerData.data.apiProviders
      let readyProviders = 0
      
      for (const [providerId, provider] of Object.entries(providers)) {
        const p = provider as any
        if (p.canMakeRequest) {
          readyProviders++
          console.log(`✅ ${p.name}: Ready (Priority ${p.priority})`)
        } else {
          console.log(`⚠️ ${p.name}: Rate Limited`)
        }
      }
      
      console.log(`\n📊 Ready Providers: ${readyProviders}/7`)
      
      if (readyProviders < 2) {
        console.log('⚠️ WARNING: Limited API providers available. Consider waiting for rate limits to reset.')
      }
    }

    // Step 4: Start enhanced gap filling process
    console.log('\n🚀 STEP 4: Starting Enhanced Gap Filling')
    
    const startResponse = await fetch(`${baseUrl}/comprehensive-gap-fill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start',
        startDate: '2021-01-05',
        endDate: '2025-07-14',
        batchSize: 100 // Larger batch size for efficiency
      })
    })
    
    const startData = await startResponse.json()
    
    if (startData.success) {
      console.log('✅ Gap filling process started successfully!')
      console.log(`📦 Batch Size: ${startData.data.batchSize}`)
      console.log(`📅 Date Range: ${startData.data.startDate} to ${startData.data.endDate}`)
      
      // Step 5: Monitor progress
      console.log('\n⏳ STEP 5: Monitoring Progress')
      console.log('Press Ctrl+C to stop monitoring (process will continue in background)')
      
      const maxMonitorTime = 30 * 60 * 1000 // 30 minutes
      const startTime = Date.now()
      let lastProgress = 0
      let consecutiveNoProgress = 0
      
      while (Date.now() - startTime < maxMonitorTime) {
        await new Promise(resolve => setTimeout(resolve, 15000)) // Check every 15 seconds
        
        try {
          const progressResponse = await fetch(`${baseUrl}/comprehensive-gap-fill`)
          const progressData = await progressResponse.json()
          
          if (progressData.success) {
            const isRunning = progressData.data.isRunning
            
            if (isRunning && progressData.data.progress) {
              const progress = progressData.data.progress
              
              console.log(`\n📊 Progress Update:`)
              console.log(`   - Completion: ${progress.percentageComplete.toFixed(2)}%`)
              console.log(`   - Days Filled: ${progress.filledDays}/${progress.totalMissingDays}`)
              console.log(`   - Processed Gaps: ${progress.processedGaps}/${progress.totalGaps}`)
              
              if (progress.currentGapRange) {
                console.log(`   - Current Gap: ${progress.currentGapRange.startDate} to ${progress.currentGapRange.endDate}`)
              }
              
              if (progress.errors.length > 0) {
                console.log(`   - Recent Errors: ${progress.errors.slice(-2).join('; ')}`)
              }
              
              // Check for progress
              if (progress.percentageComplete > lastProgress) {
                lastProgress = progress.percentageComplete
                consecutiveNoProgress = 0
              } else {
                consecutiveNoProgress++
              }
              
              // If no progress for 5 checks (75 seconds), something might be wrong
              if (consecutiveNoProgress >= 5) {
                console.log('⚠️ WARNING: No progress detected for 75+ seconds')
                console.log('   This might indicate API rate limiting or other issues')
              }
              
            } else {
              console.log('🎉 GAP FILLING PROCESS COMPLETED!')
              break
            }
          } else {
            console.log('⚠️ Could not check progress status')
          }
        } catch (error) {
          console.log(`⚠️ Progress check error: ${error}`)
        }
      }
      
      // Step 6: Final verification
      console.log('\n✅ STEP 6: Final Verification')
      
      const finalStatsResponse = await fetch(`${baseUrl}/stats`)
      const finalStats = await finalStatsResponse.json()
      
      if (finalStats.success) {
        const initialCoverage = statsData.data.database.dateRange?.coveragePercentage || 0
        const finalCoverage = finalStats.data.database.dateRange?.coveragePercentage || 0
        const improvement = finalCoverage - initialCoverage
        
        console.log(`\n📊 FINAL RESULTS:`)
        console.log(`   - Initial Coverage: ${initialCoverage.toFixed(2)}%`)
        console.log(`   - Final Coverage: ${finalCoverage.toFixed(2)}%`)
        console.log(`   - Improvement: +${improvement.toFixed(2)}%`)
        console.log(`   - Total Records: ${finalStats.data.database.totalRecords}`)
        console.log(`   - Date Range: ${finalStats.data.database.dateRange?.start} to ${finalStats.data.database.dateRange?.end}`)
        
        if (finalCoverage >= 99) {
          console.log('\n🎉 SUCCESS: Near-complete coverage achieved!')
          console.log('✅ Bitcoin price database is now comprehensive')
        } else if (improvement > 10) {
          console.log('\n✅ GOOD PROGRESS: Significant improvement made')
          console.log('🔄 Consider running again to fill remaining gaps')
        } else {
          console.log('\n⚠️ LIMITED PROGRESS: May need to wait for API rate limits to reset')
        }
      }
      
    } else {
      console.error('❌ Failed to start gap filling process:', startData.error)
      
      if (startData.error?.includes('already running')) {
        console.log('ℹ️ Process is already running. Check status with:')
        console.log('   curl http://localhost:3000/api/bitcoin-prices/comprehensive-gap-fill')
      }
    }

  } catch (error) {
    console.error('❌ Resume gap filling failed:', error)
  }
}

// Run the resume process
resumeGapFilling().catch(console.error)
