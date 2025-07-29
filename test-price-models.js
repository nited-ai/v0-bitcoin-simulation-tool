// Test script to verify price model switching functionality
// This script tests the PriceEngine directly to ensure it works independently

const { generatePriceChartData } = require('./lib/price-engine/index.ts');

// Mock historical data
const mockHistoricalData = [
  { time: 1609459200, close: 29000 }, // 2021-01-01
  { time: 1640995200, close: 47000 }, // 2022-01-01
  { time: 1672531200, close: 16500 }, // 2023-01-01
  { time: 1704067200, close: 42000 }, // 2024-01-01
];

// Test parameters for different models
const testCases = [
  {
    name: "Manual Growth Rate",
    params: {
      priceModel: "manual",
      simulationMonths: 12,
      initialBtcPrice: 50000,
      annualGrowthRates: [100, -20, 50, 80, -10, 30, 60, -15, 40, 90, -25, 70],
      powerLawSettings: { prognosisLine: "fit" }
    }
  },
  {
    name: "Power Law Model (Fit)",
    params: {
      priceModel: "powerLaw",
      simulationMonths: 12,
      initialBtcPrice: 50000,
      annualGrowthRates: [100, -20, 50, 80, -10, 30, 60, -15, 40, 90, -25, 70],
      powerLawSettings: { prognosisLine: "fit" }
    }
  },
  {
    name: "Power Law Model (Support)",
    params: {
      priceModel: "powerLaw",
      simulationMonths: 12,
      initialBtcPrice: 50000,
      annualGrowthRates: [100, -20, 50, 80, -10, 30, 60, -15, 40, 90, -25, 70],
      powerLawSettings: { prognosisLine: "support" }
    }
  },
  {
    name: "Power Law Model (Resistance)",
    params: {
      priceModel: "powerLaw",
      simulationMonths: 12,
      initialBtcPrice: 50000,
      annualGrowthRates: [100, -20, 50, 80, -10, 30, 60, -15, 40, 90, -25, 70],
      powerLawSettings: { prognosisLine: "resistance" }
    }
  },
  {
    name: "Cycle Repeat",
    params: {
      priceModel: "cycleRepeat",
      simulationMonths: 12,
      initialBtcPrice: 50000,
      annualGrowthRates: [100, -20, 50, 80, -10, 30, 60, -15, 40, 90, -25, 70],
      powerLawSettings: { prognosisLine: "fit" }
    }
  },
  {
    name: "Cycle Repeat Power Law",
    params: {
      priceModel: "cycleRepeatPowerLaw",
      simulationMonths: 12,
      initialBtcPrice: 50000,
      annualGrowthRates: [100, -20, 50, 80, -10, 30, 60, -15, 40, 90, -25, 70],
      powerLawSettings: { prognosisLine: "fit" }
    }
  }
];

async function testPriceModels() {
  console.log("🧪 Testing Price Model Switching Functionality\n");
  
  for (const testCase of testCases) {
    try {
      console.log(`\n📊 Testing: ${testCase.name}`);
      console.log(`   Model: ${testCase.params.priceModel}`);
      
      const startTime = Date.now();
      const chartData = await generatePriceChartData(testCase.params, mockHistoricalData);
      const endTime = Date.now();
      
      console.log(`✅ Success: Generated ${chartData.length} data points in ${endTime - startTime}ms`);
      
      // Analyze the data
      const hasHistorical = chartData.some(d => d.historicalPrice !== undefined);
      const hasSimulation = chartData.some(d => d.simulationPath !== undefined);
      const hasPowerLawLines = chartData.some(d => d.fit !== undefined || d.support !== undefined || d.resistance !== undefined);
      
      console.log(`   - Historical data: ${hasHistorical ? '✅' : '❌'}`);
      console.log(`   - Simulation path: ${hasSimulation ? '✅' : '❌'}`);
      console.log(`   - Power Law lines: ${hasPowerLawLines ? '✅' : '❌'}`);
      
      // Sample data point
      const samplePoint = chartData[Math.floor(chartData.length / 2)];
      if (samplePoint) {
        console.log(`   - Sample point:`, {
          date: samplePoint.date,
          historicalPrice: samplePoint.historicalPrice,
          simulationPath: samplePoint.simulationPath,
          fit: samplePoint.fit,
          support: samplePoint.support,
          resistance: samplePoint.resistance
        });
      }
      
    } catch (error) {
      console.error(`❌ Error testing ${testCase.name}:`, error.message);
    }
  }
  
  console.log("\n🎯 Price Model Testing Complete");
}

// Run the tests
if (require.main === module) {
  testPriceModels().catch(console.error);
}

module.exports = { testPriceModels };
