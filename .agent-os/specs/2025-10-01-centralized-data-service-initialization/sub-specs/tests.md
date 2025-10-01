# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-10-01-centralized-data-service-initialization/spec.md

> Created: 2025-10-01
> Version: 1.0.0

## Test Coverage

### Unit Tests

**DataServiceProvider**
- Provider initializes centralized data service on mount
- Provider shows loading state during initialization
- Provider updates context when initialization completes
- Provider handles initialization errors gracefully
- Provider cleans up data service on unmount
- Provider prevents multiple simultaneous initializations

**useCentralizedData Hook**
- Hook returns correct data when provider is initialized
- Hook returns loading state during provider initialization
- Hook handles provider initialization errors
- Hook maintains backward compatibility with enabled parameter
- Hook subscribes to data service state changes correctly

**useCurrentPriceOnly Hook**
- Hook works correctly with provider-initialized service
- Hook returns null when provider is not initialized
- Hook handles refresh functionality properly
- Hook maintains existing API contract

**ATHAlert Component**
- Component displays correct ATH distance with real price data
- Component shows loading state during data service initialization
- Component handles missing price data gracefully
- Component updates when price data changes
- Component uses correct risk-based color coding

### Integration Tests

**App-Level Initialization**
- DataServiceProvider initializes before any tab components render
- All tabs have access to initialized data service
- Navigation between tabs maintains data service state
- App handles data service initialization failures gracefully

**Tab Navigation Scenarios**
- Navigate to Parameters tab first → verify data available and ATH calculations correct
- Navigate to Price Projection tab first → verify data available and consistent
- Navigate to Results tab first → verify data available for calculations
- Navigate to Strategy tab first → verify data available for strategy simulations
- Switch between tabs → verify data persists and remains consistent

**Component Integration**
- ATHAlert component shows accurate data regardless of navigation order
- Price displays across all tabs show consistent current price
- Risk calculations use real market data instead of fallbacks
- All price-dependent components receive same data source

### Feature Tests

**End-to-End User Scenarios**
- User opens app and goes directly to Parameters tab → sees accurate ATH distance
- User opens app and goes directly to Price Projection tab → sees consistent price data
- User navigates between all tabs → sees consistent data across all components
- User refreshes page on any tab → data reinitializes correctly

**Error Handling Scenarios**
- Data service initialization fails → user sees appropriate error message
- Network connection lost during initialization → graceful degradation to fallbacks
- Invalid price data received → error handling prevents app crash
- Multiple rapid tab switches → no race conditions or duplicate initializations

### Mocking Requirements

**CentralizedDataService**: Mock the singleton service for unit tests
- Mock initialize() method to control timing and success/failure
- Mock getState() method to return predictable test data
- Mock subscribe() method to test component updates
- Mock getCurrentPrice() and loadHistoricalData() methods

**External APIs**: Mock Bitcoin price API responses
- Mock successful price data responses
- Mock API failure scenarios
- Mock network timeout conditions
- Mock rate limiting responses

**React Router**: Mock navigation for tab switching tests
- Mock route changes to test navigation scenarios
- Mock browser back/forward navigation
- Mock direct URL access to specific tabs

**Time-based Tests**: Mock Date and setTimeout for initialization timing
- Mock initialization delays to test loading states
- Mock timeout scenarios for error handling
- Mock rapid successive calls to test race conditions

## Test Implementation Strategy

### Test File Organization
```
app/simulation/__tests__/
├── providers/
│   ├── DataServiceProvider.test.tsx
│   └── DataServiceProvider.integration.test.tsx
├── hooks/
│   ├── useCentralizedData.test.ts
│   └── useCurrentPriceOnly.test.ts
├── components/
│   └── ATHAlert.test.tsx
└── e2e/
    ├── navigation-scenarios.test.tsx
    └── data-consistency.test.tsx
```

### Mock Setup
- Create shared mock factory for CentralizedDataService
- Implement test utilities for provider testing
- Set up integration test environment with full app context
- Configure E2E test environment with real navigation

### Coverage Requirements
- Unit tests: 100% coverage for new components and modified hooks
- Integration tests: All tab navigation scenarios covered
- Feature tests: All user workflows from issue acceptance criteria
- Error handling: All failure modes tested with appropriate fallbacks

### Performance Testing
- Measure initialization time impact on app startup
- Test memory usage with provider pattern
- Verify no memory leaks during navigation
- Benchmark data service subscription performance
