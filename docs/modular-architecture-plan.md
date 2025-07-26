# 🏗️ Modular Architecture Plan - Bitcoin Simulation Tool

## 📁 **Proposed Folder Structure**

```
app/
├── simulation/                          # Main Simulation Module
│   ├── components/                      # UI Components
│   │   ├── parameters/                  # Parameter Input Components
│   │   │   ├── BasicParametersCard.tsx
│   │   │   ├── StrategySelectionCard.tsx
│   │   │   ├── RiskManagementCard.tsx
│   │   │   └── EconomicAssumptionsCard.tsx
│   │   ├── results/                     # Results Display Components
│   │   │   ├── ResultsSummary.tsx
│   │   │   ├── ResultsTable.tsx
│   │   │   └── ResultsExport.tsx
│   │   ├── charts/                      # Chart Components
│   │   │   ├── PriceChart.tsx
│   │   │   ├── FinancialChart.tsx
│   │   │   └── ChartControls.tsx
│   │   ├── how-it-works/               # Documentation Components
│   │   │   └── HowItWorksContent.tsx
│   │   └── layout/                     # Layout Components
│   │       ├── SimulationTabs.tsx
│   │       ├── SimulationHeader.tsx
│   │       └── LoadingStates.tsx
│   ├── hooks/                          # Business Logic Hooks
│   │   ├── useSimulationState.ts       # Main state management
│   │   ├── useHistoricalData.ts        # Data loading
│   │   ├── usePriceGeneration.ts       # Price chart generation
│   │   ├── useSimulationRunner.ts      # Simulation execution
│   │   └── useResultsCalculation.ts    # Results processing
│   ├── context/                        # State Management
│   │   ├── SimulationContext.tsx       # Main context
│   │   ├── ParametersContext.tsx       # Parameters state
│   │   └── ResultsContext.tsx          # Results state
│   ├── services/                       # API Services
│   │   ├── simulationService.ts        # Simulation API
│   │   ├── dataService.ts              # Data loading
│   │   └── exportService.ts            # Export functionality
│   ├── types/                          # TypeScript Definitions
│   │   ├── simulation.ts               # Simulation types
│   │   ├── parameters.ts               # Parameter types
│   │   └── results.ts                  # Results types
│   └── SimulationPage.tsx              # Main page component (< 200 lines)
│
├── strategies/                         # Strategy Microservices
│   ├── ath-based/                      # ATH-Based Strategy Module
│   │   ├── components/
│   │   │   ├── AthBasedSettings.tsx
│   │   │   ├── AthBasedResults.tsx
│   │   │   └── AthBasedDocumentation.tsx
│   │   ├── hooks/
│   │   │   ├── useAthBasedStrategy.ts
│   │   │   └── useAthBasedValidation.ts
│   │   ├── services/
│   │   │   └── athBasedService.ts
│   │   ├── types/
│   │   │   └── athBased.ts
│   │   └── index.ts                    # Strategy export
│   │
│   ├── moving-average/                 # Moving Average Strategy Module
│   │   ├── components/
│   │   │   ├── MovingAverageSettings.tsx
│   │   │   ├── MovingAverageResults.tsx
│   │   │   └── MovingAverageDocumentation.tsx
│   │   ├── hooks/
│   │   │   ├── useMovingAverageStrategy.ts
│   │   │   └── useMovingAverageValidation.ts
│   │   ├── services/
│   │   │   └── movingAverageService.ts
│   │   ├── types/
│   │   │   └── movingAverage.ts
│   │   └── index.ts
│   │
│   ├── ath-collateral/                 # ATH Collateral Strategy Module
│   │   ├── components/
│   │   │   ├── AthCollateralSettings.tsx
│   │   │   ├── AthCollateralResults.tsx
│   │   │   └── AthCollateralDocumentation.tsx
│   │   ├── hooks/
│   │   │   ├── useAthCollateralStrategy.ts
│   │   │   └── useAthCollateralValidation.ts
│   │   ├── services/
│   │   │   └── athCollateralService.ts
│   │   ├── types/
│   │   │   └── athCollateral.ts
│   │   └── index.ts
│   │
│   ├── shared/                         # Shared Strategy Components
│   │   ├── components/
│   │   │   ├── StrategyCard.tsx
│   │   │   ├── StrategySelector.tsx
│   │   │   └── StrategyValidation.tsx
│   │   ├── hooks/
│   │   │   ├── useStrategyValidation.ts
│   │   │   └── useStrategyComparison.ts
│   │   ├── types/
│   │   │   ├── strategyBase.ts
│   │   │   └── strategyInterface.ts
│   │   └── utils/
│   │       ├── strategyHelpers.ts
│   │       └── strategyValidators.ts
│   │
│   └── registry/                       # Strategy Registry
│       ├── StrategyRegistry.ts         # Dynamic strategy loading
│       ├── StrategyProvider.tsx        # Strategy context
│       └── types.ts                    # Registry types
│
├── shared/                             # Shared Application Components
│   ├── ui/                             # Reusable UI Components
│   │   ├── forms/
│   │   │   ├── NumberInput.tsx
│   │   │   ├── PercentageInput.tsx
│   │   │   └── CurrencyInput.tsx
│   │   ├── charts/
│   │   │   ├── BaseChart.tsx
│   │   │   ├── ChartTooltip.tsx
│   │   │   └── ChartLegend.tsx
│   │   ├── layout/
│   │   │   ├── PageHeader.tsx
│   │   │   ├── PageFooter.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   └── feedback/
│   │       ├── ErrorBoundary.tsx
│   │       ├── SuccessMessage.tsx
│   │       └── ValidationMessage.tsx
│   ├── hooks/                          # Shared Hooks
│   │   ├── useLocalStorage.ts
│   │   ├── useDebounce.ts
│   │   ├── useAsync.ts
│   │   └── useValidation.ts
│   ├── utils/                          # Shared Utilities
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   ├── calculations.ts
│   │   └── constants.ts
│   └── types/                          # Shared Types
│       ├── common.ts
│       ├── api.ts
│       └── ui.ts
│
└── lib/                                # External Libraries (existing)
    ├── price-engine/                   # Price calculation engine
    ├── strategy-engine/                # Strategy execution engine
    └── ...                             # Other existing libs
```

## 🎯 **Key Benefits**

### **1. Isolation & Independence**
- Each strategy is completely **self-contained**
- Changes to one strategy **don't affect others**
- **Independent testing** and development
- **Parallel team development** possible

### **2. Scalability & Maintainability**
- **Small, focused components** (< 200 lines each)
- **Clear separation of concerns**
- **Easy to locate and fix bugs**
- **Simple to add new features**

### **3. Performance & User Experience**
- **Lazy loading** of strategy components
- **Code splitting** for better performance
- **Dynamic strategy loading**
- **Better error boundaries**

### **4. Developer Experience**
- **Clear file organization**
- **Predictable component structure**
- **Reusable components**
- **Better TypeScript support**

## 🚀 **Migration Strategy**

### **Phase 1: Core Refactoring (Week 1-2)**
1. Extract main UI components from simulation.tsx
2. Create SimulationContext for state management
3. Move business logic to custom hooks
4. Create shared UI components

### **Phase 2: Strategy Isolation (Week 3-4)**
1. Extract each strategy into its own module
2. Create strategy interface and registry
3. Implement dynamic strategy loading
4. Add strategy-specific documentation

### **Phase 3: Advanced Features (Week 5-6)**
1. Add lazy loading for strategies
2. Implement error boundaries
3. Add strategy comparison features
4. Performance optimizations

## 📋 **Implementation Checklist**

- [ ] Create new folder structure
- [ ] Extract BasicParametersCard component
- [ ] Extract ResultsSummary component
- [ ] Create SimulationContext
- [ ] Move useSimulationState hook
- [ ] Extract ATH-Based strategy module
- [ ] Extract Moving Average strategy module
- [ ] Extract ATH Collateral strategy module
- [ ] Create StrategyRegistry
- [ ] Add error boundaries
- [ ] Add lazy loading
- [ ] Update documentation
- [ ] Add unit tests for each module
- [ ] Performance testing
- [ ] Migration complete ✅
