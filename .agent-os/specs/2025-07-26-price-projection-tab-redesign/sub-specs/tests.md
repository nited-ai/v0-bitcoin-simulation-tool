# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-07-26-price-projection-tab-redesign/spec.md

> Created: 2025-07-26
> Version: 1.0.0

## Test Coverage

### Unit Tests

**TabNavigation Component**
- Renders all four tabs (Parameters, Price Projection, Strategy, Results)
- Switches between tabs correctly
- Maintains state when switching tabs
- Handles keyboard navigation (arrow keys, tab key)
- Applies correct ARIA attributes for accessibility

**PriceModelSelector Component**
- Renders dropdown with all available models
- Shows correct model descriptions
- Triggers onChange callback when model is selected
- Validates model selection state
- Handles loading states during model switching

**PriceChart Component**
- Renders historical data correctly from CSV
- Displays projected data from selected model
- Shows visual separator between historical and projected data
- Scales Y-axis appropriately for data range
- Renders chart legend with correct colors and labels
- Handles empty or invalid data gracefully

**ModelConfiguration Component**
- Renders correct form fields based on selected model
- Validates input ranges (Manual Growth: -100% to +500%)
- Updates chart when parameters change
- Persists form state during tab switches
- Shows validation errors for invalid inputs

**PriceLineSelector Component**
- Renders interactive legend with clickable elements
- Highlights selected price line visually
- Stores selection in React context
- Provides visual feedback on hover/selection
- Integrates with strategy tab data flow

### Integration Tests

**Tab Navigation Flow**
- User can navigate between all tabs without data loss
- Price projection data persists when switching to Strategy tab
- Selected price line is available in Strategy tab
- URL updates correctly for deep linking
- Browser back/forward buttons work correctly

**Price Model Workflow**
- Select model → Configure parameters → Generate projection → Select price line
- Model switching preserves chart state appropriately
- Parameter changes trigger real-time chart updates
- Price line selection updates strategy integration data
- Error states are handled gracefully throughout workflow

**Chart Data Integration**
- Historical CSV data loads and displays correctly
- Model projections integrate seamlessly with historical data
- Chart updates in real-time when parameters change
- Multiple price lines render correctly with proper styling
- Chart performance remains smooth with large datasets

### Feature Tests

**Complete Price Projection Workflow**
- User opens Price Projection tab
- Selects Manual Growth Rates model
- Configures 12 annual growth rates
- Views updated price projection chart
- Selects "Support Line" for strategy use
- Switches to Strategy tab and confirms price line is available

**Model Switching Scenario**
- User starts with Manual Growth model
- Switches to Power Law model
- Configures prognosis line selector
- Views different projection results
- Switches back to Manual Growth
- Confirms previous parameters are preserved

**Responsive Design Testing**
- Price Projection tab works correctly on mobile devices
- Chart remains readable and interactive on small screens
- Form inputs are accessible on touch devices
- Tab navigation works with touch gestures
- All interactive elements have appropriate touch targets

### Mocking Requirements

**Historical Data Service**
- Mock CSV data loading for consistent test results
- Mock API calls for current Bitcoin price
- Mock data conversion (USD to EUR) functionality

**Price Model Services**
- Mock Manual Growth model calculations
- Mock Power Law model projections
- Mock Cycle Repeat model calculations
- Mock model confidence scoring

**Chart Rendering**
- Mock Recharts components for unit tests
- Mock chart data processing functions
- Mock responsive chart behavior

**React Context**
- Mock price line selection context
- Mock tab navigation state
- Mock model configuration state

## Performance Tests

**Chart Rendering Performance**
- Chart renders within 500ms with 4000+ historical data points
- Real-time updates complete within 100ms when parameters change
- Memory usage remains stable during extended use
- No memory leaks when switching between models repeatedly

**Data Processing Performance**
- Model calculations complete within 200ms for 144-month projections
- CSV data parsing completes within 100ms
- Price line calculations complete within 50ms

## Accessibility Tests

**Screen Reader Compatibility**
- All chart data is available via screen reader
- Form inputs have proper labels and descriptions
- Tab navigation announces current tab correctly
- Error messages are announced appropriately

**Keyboard Navigation**
- All interactive elements are reachable via keyboard
- Tab order is logical and intuitive
- Escape key closes dropdowns and modals
- Enter/Space keys activate buttons and selections

**Color Contrast**
- All text meets WCAG AA contrast requirements
- Chart colors are distinguishable for colorblind users
- Interactive elements have sufficient contrast in all states
