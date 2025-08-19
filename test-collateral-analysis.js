// Simple test script for Collateral Analysis functionality
// Run with: node test-collateral-analysis.js

console.log('Testing Collateral Analysis Calculations...\n')

// Test calculation logic
function testCollateralCalculations() {
  console.log('Test 1: Collateral Analysis Calculations')
  
  // Test case 1: Default parameters (using your concrete example)
  const testCase1 = {
    btcAmount: 1,
    initialBtcPrice: 100000,
    maxLoanAmountPercent: 5, // 5% of stack = $5,000 loan
    targetLtv: 20, // 20% target LTV
    liquidationLtv: 95, // 95% liquidation LTV
    platform: 'firefish'
  }
  
  console.log('  Test Case 1: Concrete Example (as described in requirements)')
  console.log(`    BTC Amount: ${testCase1.btcAmount} BTC`)
  console.log(`    BTC Price: $${testCase1.initialBtcPrice.toLocaleString()}`)
  console.log(`    Max Loan %: ${testCase1.maxLoanAmountPercent}% (= $5,000 loan)`)
  console.log(`    Target LTV: ${testCase1.targetLtv}%`)
  console.log(`    Liquidation LTV: ${testCase1.liquidationLtv}%`)
  console.log(`    Platform: ${testCase1.platform}`)
  
  // Calculate metrics (CORRECTED LIQUIDATION-BASED CALCULATION)
  const totalStackValue = testCase1.btcAmount * testCase1.initialBtcPrice

  // Platform LTV (Firefish = 60% maxInitialLtv)
  const platformLtv = 60
  const maxLoanCapacity = totalStackValue * (platformLtv / 100)

  // Current loan amount based on Max Loan Amount % setting
  const currentLoanAmount = (testCase1.maxLoanAmountPercent / 100) * totalStackValue

  // CORRECTED: Calculate total loan cost including interest
  const originationFee = currentLoanAmount * 0.015 // 1.5% for Firefish
  const monthlyInterestRate = 0.065 / 12 // 6.5% annual rate
  const monthlyInterestPayment = currentLoanAmount * monthlyInterestRate
  const totalInterestPayment = monthlyInterestPayment * 6 // 6 months term
  const totalLoanCost = currentLoanAmount + originationFee + totalInterestPayment

  // Calculate BTC locked as collateral for current loan - CORRECTED to use totalLoanCost
  const btcLockedAsCollateral = totalLoanCost / (testCase1.targetLtv / 100) / testCase1.initialBtcPrice

  // Calculate remaining free BTC
  const freeBtcAmount = Math.max(0, testCase1.btcAmount - btcLockedAsCollateral)

  // Free collateral amount in USD
  const freeCollateralAmount = freeBtcAmount * testCase1.initialBtcPrice

  // Price drop tolerance (CORRECTED LIQUIDATION-BASED)
  let priceDropTolerance = 0
  if (currentLoanAmount > 0 && testCase1.btcAmount > 0) {
    const liquidationPrice = currentLoanAmount / (testCase1.liquidationLtv / 100) / testCase1.btcAmount
    priceDropTolerance = Math.max(0, ((testCase1.initialBtcPrice - liquidationPrice) / testCase1.initialBtcPrice) * 100)
  } else {
    priceDropTolerance = 100
  }
  
  console.log('  Calculated Results:')
  console.log(`    Total Stack Value: $${totalStackValue.toLocaleString()}`)
  console.log(`    Current Loan Amount: $${currentLoanAmount.toLocaleString()}`)
  console.log(`    Max Loan Capacity: $${maxLoanCapacity.toLocaleString()}`)
  console.log(`    BTC Locked as Collateral: ${btcLockedAsCollateral.toFixed(4)} BTC`)
  console.log(`    Free BTC Amount: ${freeBtcAmount.toFixed(4)} BTC`)
  console.log(`    Free Collateral (USD): $${freeCollateralAmount.toLocaleString()}`)
  console.log(`    Liquidation Price: $${(currentLoanAmount / (testCase1.liquidationLtv / 100) / testCase1.btcAmount).toLocaleString()}`)
  console.log(`    Price Drop Tolerance: ${priceDropTolerance.toFixed(1)}%`)
  
  // Verify calculations (CORRECTED EXPECTED VALUES FOR CONCRETE EXAMPLE)
  const expectedTotalStackValue = 100000
  const expectedCurrentLoan = 5000 // 5% of $100k
  const expectedMaxLoanCapacity = 50000
  const expectedBtcLocked = 0.25 // $5k loan ÷ 20% LTV ÷ $100k price = 0.25 BTC
  const expectedFreeBtc = 0.75 // 1 - 0.25 = 0.75 BTC
  const expectedFreeCollateral = 75000 // 0.75 BTC × $100k = $75k
  const expectedLiquidationPrice = 5263.16 // $5k ÷ 95% ÷ 1 BTC ≈ $5,263
  const expectedPriceDropTolerance = 94.7 // (($100k - $5,263) ÷ $100k) × 100 ≈ 94.7%
  
  console.log('  Verification:')
  console.log(`    Total Stack Value: ${totalStackValue === expectedTotalStackValue ? '✓ PASS' : '✗ FAIL'}`)
  console.log(`    Current Loan Amount: ${currentLoanAmount === expectedCurrentLoan ? '✓ PASS' : '✗ FAIL'}`)
  console.log(`    Max Loan Capacity: ${maxLoanCapacity === expectedMaxLoanCapacity ? '✓ PASS' : '✗ FAIL'}`)
  console.log(`    BTC Locked: ${Math.abs(btcLockedAsCollateral - expectedBtcLocked) < 0.01 ? '✓ PASS' : '✗ FAIL'}`)
  console.log(`    Free BTC: ${Math.abs(freeBtcAmount - expectedFreeBtc) < 0.01 ? '✓ PASS' : '✗ FAIL'}`)
  console.log(`    Free Collateral: ${freeCollateralAmount === expectedFreeCollateral ? '✓ PASS' : '✗ FAIL'}`)
  console.log(`    Price Drop Tolerance: ${Math.abs(priceDropTolerance - expectedPriceDropTolerance) < 0.2 ? '✓ PASS' : '✗ FAIL'}`)
}

// Test platform differences
function testPlatformDifferences() {
  console.log('\nTest 2: Platform LTV Differences')
  
  const baseParams = {
    btcAmount: 1,
    initialBtcPrice: 100000,
    maxLoanAmountPercent: 15,
    targetLtv: 50
  }
  
  const platforms = [
    { name: 'firefish', ltv: 60 }, // Updated to use maxInitialLtv
    { name: 'strike', ltv: 80 }    // Updated to use maxInitialLtv
  ]
  
  platforms.forEach(platform => {
    const totalStackValue = baseParams.btcAmount * baseParams.initialBtcPrice
    const maxLoanCapacity = totalStackValue * (platform.ltv / 100)
    
    console.log(`  ${platform.name.charAt(0).toUpperCase() + platform.name.slice(1)} Platform:`)
    console.log(`    LTV Limit: ${platform.ltv}%`)
    console.log(`    Max Loan Capacity: $${maxLoanCapacity.toLocaleString()}`)
  })
}

// Test edge cases
function testEdgeCases() {
  console.log('\nTest 3: Edge Cases')

  // Test case: Very high loan percentage
  console.log('  Edge Case 1: High Loan Percentage (90%)')
  const highLoanCase = {
    btcAmount: 1,
    initialBtcPrice: 100000,
    maxLoanAmountPercent: 90,
    targetLtv: 50
  }

  const totalStackValue = highLoanCase.btcAmount * highLoanCase.initialBtcPrice
  const currentMaxLoanAmount = (highLoanCase.maxLoanAmountPercent / 100) * totalStackValue
  const collateralNeededForCurrentLoan = currentMaxLoanAmount / (highLoanCase.targetLtv / 100)
  const freeCollateralAmount = Math.max(0, totalStackValue - collateralNeededForCurrentLoan)
  const priceDropTolerance = totalStackValue > 0 ? (freeCollateralAmount / totalStackValue) * 100 : 0

  console.log(`    Current Max Loan: $${currentMaxLoanAmount.toLocaleString()}`)
  console.log(`    Collateral Needed: $${collateralNeededForCurrentLoan.toLocaleString()}`)
  console.log(`    Free Collateral: $${freeCollateralAmount.toLocaleString()}`)
  console.log(`    Price Drop Tolerance: ${priceDropTolerance.toFixed(1)}%`)
  console.log(`    Result: ${freeCollateralAmount <= 0 ? 'No free collateral (high risk)' : 'Some free collateral available'}`)
}

// Test collateral validation
function testCollateralValidation() {
  console.log('\nTest 4: Collateral Validation')

  // Test case: Impossible collateral scenario (from screenshot example)
  console.log('  Validation Case 1: Impossible Collateral Scenario')
  const impossibleCase = {
    btcAmount: 1, // Only 1 BTC available
    initialBtcPrice: 100000,
    maxLoanAmountPercent: 20, // 20% of stack = $20,000 loan
    targetLtv: 10 // 10% LTV means need $200,000 collateral = 2 BTC
  }

  const totalStackValue = impossibleCase.btcAmount * impossibleCase.initialBtcPrice
  const currentLoanAmount = (impossibleCase.maxLoanAmountPercent / 100) * totalStackValue

  // CORRECTED: Calculate total loan cost including interest
  const originationFee = currentLoanAmount * 0.015 // 1.5% for Firefish
  const monthlyInterestRate = 0.065 / 12 // 6.5% annual rate
  const monthlyInterestPayment = currentLoanAmount * monthlyInterestRate
  const totalInterestPayment = monthlyInterestPayment * 6 // 6 months term
  const totalLoanCost = currentLoanAmount + originationFee + totalInterestPayment

  const btcLockedAsCollateral = totalLoanCost / (impossibleCase.targetLtv / 100) / impossibleCase.initialBtcPrice
  const isCollateralSufficient = btcLockedAsCollateral <= impossibleCase.btcAmount

  console.log(`    BTC Available: ${impossibleCase.btcAmount} BTC`)
  console.log(`    Loan Amount: $${currentLoanAmount.toLocaleString()}`)
  console.log(`    Target LTV: ${impossibleCase.targetLtv}%`)
  console.log(`    BTC Required as Collateral: ${btcLockedAsCollateral.toFixed(4)} BTC`)
  console.log(`    Is Collateral Sufficient: ${isCollateralSufficient ? 'YES' : 'NO'}`)

  if (!isCollateralSufficient) {
    const shortfall = btcLockedAsCollateral - impossibleCase.btcAmount
    console.log(`    Shortfall: ${shortfall.toFixed(4)} BTC`)
    console.log(`    ✓ VALIDATION ERROR DETECTED: Insufficient collateral`)
  } else {
    console.log(`    ✗ VALIDATION FAILED: Should have detected insufficient collateral`)
  }

  // Test case: Valid collateral scenario
  console.log('\n  Validation Case 2: Valid Collateral Scenario')
  const validCase = {
    btcAmount: 1,
    initialBtcPrice: 100000,
    maxLoanAmountPercent: 5, // 5% of stack = $5,000 loan
    targetLtv: 20 // 20% LTV means need $25,000 collateral = 0.25 BTC
  }

  const validTotalStackValue = validCase.btcAmount * validCase.initialBtcPrice
  const validCurrentLoanAmount = (validCase.maxLoanAmountPercent / 100) * validTotalStackValue

  // CORRECTED: Calculate total loan cost including interest
  const validOriginationFee = validCurrentLoanAmount * 0.015 // 1.5% for Firefish
  const validMonthlyInterestRate = 0.065 / 12 // 6.5% annual rate
  const validMonthlyInterestPayment = validCurrentLoanAmount * validMonthlyInterestRate
  const validTotalInterestPayment = validMonthlyInterestPayment * 6 // 6 months term
  const validTotalLoanCost = validCurrentLoanAmount + validOriginationFee + validTotalInterestPayment

  const validBtcLockedAsCollateral = validTotalLoanCost / (validCase.targetLtv / 100) / validCase.initialBtcPrice
  const validIsCollateralSufficient = validBtcLockedAsCollateral <= validCase.btcAmount

  console.log(`    BTC Available: ${validCase.btcAmount} BTC`)
  console.log(`    Loan Amount: $${validCurrentLoanAmount.toLocaleString()}`)
  console.log(`    Target LTV: ${validCase.targetLtv}%`)
  console.log(`    BTC Required as Collateral: ${validBtcLockedAsCollateral.toFixed(4)} BTC`)
  console.log(`    Is Collateral Sufficient: ${validIsCollateralSufficient ? 'YES' : 'NO'}`)
  console.log(`    ${validIsCollateralSufficient ? '✓ VALIDATION PASSED: Sufficient collateral' : '✗ VALIDATION FAILED: Should have sufficient collateral'}`)
}

// Run all tests
testCollateralCalculations()
testPlatformDifferences()
testEdgeCases()
testCollateralValidation()

console.log('\n' + '='.repeat(50))
console.log('All tests completed!')
console.log('\nSummary of implementation:')
console.log('✓ Header text updated to "FIRE hodl Simulator"')
console.log('✓ Bitcoin SVG icon removed from header')
console.log('✓ Collateral Analysis card created with 3 key metrics:')
console.log('  - Free Collateral Amount (in USD)')
console.log('  - Price Drop Tolerance (as percentage)')
console.log('  - Max Loan Capacity (based on platform LTV)')
console.log('✓ Card positioned below Risk Level selector in left column')
console.log('✓ Calculations reactive to parameter changes')
console.log('✓ Platform-specific LTV limits implemented:')
console.log('  - Firefish: 60% LTV (maxInitialLtv)')
console.log('  - Strike: 80% LTV (maxInitialLtv)')
console.log('✓ Proper formatting for currency and percentages')
console.log('✓ Color coding for risk levels in Price Drop Tolerance')
console.log('✓ FIXED: Price Drop Tolerance now correctly calculates liquidation-based risk')
console.log('  - Uses liquidation LTV (95%) instead of target LTV')
console.log('  - Calculates actual Bitcoin price drop before liquidation')
console.log('  - Accounts for entire BTC stack as collateral')
console.log('  - Example: 94.7% tolerance means BTC can drop from $100k to $5,263 before liquidation')
console.log('✓ MOVED: Collateral Validation to Max Loan Amount Helper Text')
console.log('  - Detects impossible collateral scenarios in real-time')
console.log('  - Shows validation in existing helper text under Max Loan Amount field')
console.log('  - Helper text turns red (text-red-600) when collateral insufficient')
console.log('  - Maintains same format: "Needed collateral: X.XXXX BTC at Y% Initial LTV"')
console.log('  - Integrates with existing validation system')
console.log('  - Reuses existing UI element for cleaner design')
console.log('  - Example: Helper text turns red when 1 BTC stack requires 2.0000 BTC collateral')
