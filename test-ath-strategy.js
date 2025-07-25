// Test script for ATH Collateral Strategy
const { AthCollateralStrategy } = require('./lib/strategy-engine/strategies/ath-collateral.ts');

// Mock data for testing
const mockContext = {
  btcPrice: 100000, // Current BTC price: €100,000
  totalBtcAmount: 1, // 1 BTC
  activeLoans: [], // No active loans
  params: {
    monthlyWithdrawalAmount: 0,
    loanOriginationFeePercent: 1.5,
    athCollateralParams: {
      maxDrawdownPercent: 80,
      collateralMultiplier: 2.0,
      athLookbackMonths: 36,
      emergencyCollateralBuffer: 1.2,
    }
  },
  month: 1,
  currentDate: new Date('2025-01-01'),
  historicalPriceData: [
    { time: Date.now() / 1000 - 365 * 24 * 60 * 60, close: 50000 }, // 1 year ago: €50,000
    { time: Date.now() / 1000 - 180 * 24 * 60 * 60, close: 120000 }, // 6 months ago: €120,000 (ATH)
    { time: Date.now() / 1000 - 90 * 24 * 60 * 60, close: 80000 }, // 3 months ago: €80,000
  ],
  priceChartData: [
    { date: '2024-01-01', historicalPrice: 50000 },
    { date: '2024-07-01', historicalPrice: 120000 }, // ATH
    { date: '2024-10-01', historicalPrice: 80000 },
    { date: '2025-01-01', simulationPath: 100000 }, // Current
  ]
};

console.log('🧪 Testing ATH Collateral Strategy');
console.log('📊 Mock Context:', {
  btcPrice: mockContext.btcPrice,
  totalBtcAmount: mockContext.totalBtcAmount,
  activeLoansCount: mockContext.activeLoans.length,
  maxDrawdownPercent: mockContext.params.athCollateralParams.maxDrawdownPercent,
  collateralMultiplier: mockContext.params.athCollateralParams.collateralMultiplier,
});

try {
  const strategy = new AthCollateralStrategy();
  console.log('✅ Strategy created:', strategy.getName());
  console.log('📝 Description:', strategy.getDescription());
  
  const decision = strategy.makeDecision(mockContext);
  console.log('🎯 Strategy Decision:', decision);
  
  // Expected behavior:
  // - ATH should be €120,000 (from 6 months ago)
  // - Current price €100,000 is 16.7% below ATH
  // - Max safe debt should be calculated based on 80% drawdown tolerance
  // - Should allow investment since we're not at maximum drawdown
  
  console.log('✅ Test completed successfully!');
} catch (error) {
  console.error('❌ Test failed:', error);
}
