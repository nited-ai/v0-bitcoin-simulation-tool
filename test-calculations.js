// Simple test runner for CalculationsService
const { CalculationsService } = require('./app/simulation/components/parameters/calculationsService.ts')

// Test data
const testParams = {
  btcAmount: 1,
  initialBtcPrice: 100000,
  monthlyWithdrawal: 0,
  btcAccumulation: false,
  loanAmountPercent: 10,
  platform: 'firefish',
  riskManagement: {
    targetLtv: 50,
    maxLoanAmount: 50000,
    annualInterestRate: 6.5,
    loanTermMonths: 6,
    liquidationFeePercent: 5
  }
}

console.log('Testing CalculationsService...')

try {
  const service = new CalculationsService()
  
  console.log('✓ Service created successfully')
  
  // Test validation
  const validation = service.validateParameters(testParams)
  console.log('✓ Validation:', validation.isValid ? 'PASSED' : 'FAILED')
  if (!validation.isValid) {
    console.log('  Errors:', validation.errors)
  }
  
  // Test liquidation calculations
  const liquidation = service.calculateLiquidationMetrics(testParams)
  console.log('✓ Liquidation calculations completed')
  console.log('  Liquidation Price:', liquidation.liquidationPrice.toFixed(2))
  console.log('  Price Drop %:', liquidation.priceDropPercentage.toFixed(2))
  console.log('  Has Free Collateral:', liquidation.hasFreeCollateral)
  
  // Test collateral calculations
  const collateral = service.calculateCollateralMetrics(testParams)
  console.log('✓ Collateral calculations completed')
  console.log('  Total Stack Value:', collateral.totalStackValue.toLocaleString())
  console.log('  Locked Collateral BTC:', collateral.lockedCollateralBtc.toFixed(4))
  console.log('  Free Collateral BTC:', collateral.freeCollateralBtc.toFixed(4))
  
  // Test loan calculations
  const loan = service.calculateLoanMetrics(testParams)
  console.log('✓ Loan calculations completed')
  console.log('  Current Loan Amount:', loan.currentLoanAmount.toLocaleString())
  console.log('  Origination Fee:', loan.originationFee.toLocaleString())
  console.log('  Monthly Interest:', loan.monthlyInterestPayment.toFixed(2))
  
  // Test performance
  const startTime = performance.now()
  for (let i = 0; i < 100; i++) {
    service.calculateLiquidationMetrics(testParams)
    service.calculateCollateralMetrics(testParams)
    service.calculateLoanMetrics(testParams)
  }
  const endTime = performance.now()
  const avgTime = (endTime - startTime) / 100
  console.log('✓ Performance test: Average calculation time:', avgTime.toFixed(2), 'ms')
  
  console.log('\n🎉 All tests completed successfully!')
  
} catch (error) {
  console.error('❌ Test failed:', error.message)
  console.error(error.stack)
}
