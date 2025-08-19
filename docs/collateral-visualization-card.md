# Collateral Visualization Card

## Overview

The `CollateralVisualizationCard` is a new component that provides a visual representation of collateral distribution using a combined pie chart approach. It displays the relationship between free and locked collateral in an intuitive, interactive format.

## Features

### Visual Design
- **Donut Chart**: Uses recharts PieChart with inner radius for donut effect
- **Color Scheme**: 
  - Free Collateral: Bitcoin Orange (#f97316)
  - Locked Collateral: Red (#ef4444)
- **Percentage Labels**: Displayed outside the chart segments
- **Center Text**: Shows BTC amounts in "Free/Locked" format
- **Interactive Tooltips**: Detailed explanations for each segment

### Data Integration
- Uses the same collateral calculation logic as `CollateralAnalysisCard`
- Real-time updates based on simulation parameters
- Integrates with platform configurations and risk management settings

### Responsive Design
- Adapts to different screen sizes (sm:, lg: breakpoints)
- Flexible legend layout (column on mobile, row on desktop)
- Appropriate sizing for various container widths

## Implementation Details

### Component Structure
```
CollateralVisualizationCard/
├── Card Header (with PieChart icon)
├── Card Content
    ├── Empty State (when BTC amount = 0)
    ├── Pie Chart Container
    │   ├── ResponsiveContainer
    │   ├── PieChart with Pie and Cells
    │   ├── LabelList for percentages
    │   └── Center Text Overlay
    └── Legend with Tooltips
```

### Data Flow
1. **Input**: Simulation parameters from `useSimulation()` context
2. **Calculation**: Same logic as `CollateralAnalysisCard` for consistency
3. **Transformation**: Convert to chart-friendly data format
4. **Rendering**: Display as interactive donut chart

### Key Calculations
```javascript
// Calculate total loan cost including interest
const monthlyInterestRate = annualInterestRate / 100 / 12
const monthlyInterestPayment = currentLoanAmount * monthlyInterestRate
const totalInterestPayment = loanTermMonths === Infinity
  ? monthlyInterestPayment * 12
  : monthlyInterestPayment * loanTermMonths
const totalLoanCost = currentLoanAmount + originationFee + totalInterestPayment

// BTC locked as collateral - CORRECTED to use totalLoanCost
const btcLockedAsCollateral = totalLoanCost / (targetLtv / 100) / initialBtcPrice

// Free BTC amount
const freeBtcAmount = Math.max(0, btcAmount - btcLockedAsCollateral)

// Percentages
const freeCollateralPercentage = (freeBtcAmount / btcAmount) * 100
const collateralUtilization = (btcLockedAsCollateral / btcAmount) * 100
```

## Integration

### Location
- **Tab**: Parameters
- **Position**: Right column, below LoanParametersCard
- **Layout**: Part of the 2-column grid system

### Dependencies
- `recharts`: For pie chart rendering
- `@/components/ui/*`: shadcn/ui components
- `lucide-react`: Icons
- Simulation context and platform configurations

## Usage Examples

### Basic Usage
The component automatically integrates with the simulation context:

```tsx
import { CollateralVisualizationCard } from '../parameters/CollateralVisualizationCard'

// In Parameters tab
<CollateralVisualizationCard />
```

### Data Format
The component expects simulation parameters with:
- `btcAmount`: Total BTC stack
- `initialBtcPrice`: BTC price in USD
- `loanAmountPercent`: Loan amount as percentage of stack
- `riskManagement.targetLtv`: Target loan-to-value ratio
- `platform`: Platform configuration key

## Testing

### Test Coverage
- ✅ Basic collateral calculations
- ✅ Percentage calculations (should sum to 100%)
- ✅ Edge cases (zero BTC, small loans)
- ✅ Data format validation
- ✅ Color scheme verification

### Test Results
```
Free Collateral: 74.9% (0.749 BTC)
Locked Collateral: 25.1% (0.251 BTC)
Total: 100.0% ✓
```

## Benefits

### User Experience
1. **Visual Clarity**: Immediate understanding of collateral distribution
2. **Interactive Learning**: Tooltips provide educational context
3. **Real-time Updates**: Changes reflect instantly as parameters adjust
4. **Consistent Data**: Uses same calculations as analysis cards

### Technical Benefits
1. **Modular Design**: Self-contained component with clear interfaces
2. **Type Safety**: Full TypeScript support with defined interfaces
3. **Performance**: Memoized calculations prevent unnecessary re-renders
4. **Accessibility**: Proper ARIA labels and keyboard navigation

## Future Enhancements

### Potential Improvements
1. **Animation**: Smooth transitions when data changes
2. **Export**: Allow users to export chart as image
3. **Customization**: User-selectable color themes
4. **Additional Metrics**: Show liquidation thresholds on chart
5. **Historical View**: Show collateral changes over time

### Integration Opportunities
1. **Strategy Tab**: Show projected collateral changes
2. **Results Tab**: Historical collateral utilization charts
3. **Risk Analysis**: Integrate with risk assessment tools

## Maintenance

### Code Quality
- Follows existing project patterns and conventions
- Uses established color scheme and design system
- Maintains consistency with other chart components
- Includes comprehensive error handling and edge cases

### Dependencies
- All dependencies are already present in the project
- No additional packages required
- Compatible with existing build and deployment pipeline
