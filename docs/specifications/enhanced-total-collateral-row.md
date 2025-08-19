# Enhanced Total Collateral Row Specification

## Overview
Revamp the "Total Collateral" row in the BasicParametersCard component to display comprehensive Bitcoin price and collateral information, including dynamic ATH integration and risk-based color coding.

## Current State Analysis

### Existing Implementation
- **Location**: `app/simulation/components/parameters/BasicParametersCard.tsx` (lines 136-169)
- **Layout**: Two-column layout with inputs on left, collateral summary on right
- **Current Display**: 
  - Total USD value (`btcAmount × initialBtcPrice`)
  - BTC calculation breakdown
  - "Available for loan collateral" text
- **Styling**: Orange gradient background with centered content

### Property Names Issue
- **BasicParametersCard**: Uses `params.btcAmount` and `params.initialBtcPrice`
- **CalculationsService**: Uses `params.initialBtcAmount` and `params.initialBtcPrice`
- **Resolution**: Use BasicParametersCard property names for consistency

## Enhanced Requirements

### 1. Total Collateral Value (Enhanced)
- **Current**: Display total USD value
- **Enhancement**: Add BTC amount display and improve formatting
- **Formula**: `btcAmount × initialBtcPrice`
- **Format**: Large currency display with BTC breakdown

### 2. ATH Price (New)
- **Source**: Dynamic ATH service via `useATH()` hook
- **Display**: Current All-Time High price ($124,277.98)
- **Format**: Currency format with "ATH" label
- **Fallback**: Use fallback value during loading/errors

### 3. ATH Distance Analysis (New)
- **Percentage Distance**: `((ATH - currentPrice) / ATH) × 100`
- **USD Distance**: `ATH - currentPrice`
- **Color Coding**:
  - **Green**: Current price far below ATH (safer for loans)
  - **Yellow/Orange**: Moderate distance from ATH
  - **Red**: Current price near ATH (risky for loans)
- **Thresholds**:
  - Green: >30% below ATH
  - Yellow: 15-30% below ATH  
  - Red: <15% below ATH

## Technical Implementation

### 1. CalculationsService Extensions
**File**: `app/simulation/components/parameters/calculationsService.ts`

```typescript
interface ATHDistanceMetrics {
  athPrice: number
  currentPrice: number
  distancePercent: number
  distanceUSD: number
  riskLevel: 'low' | 'medium' | 'high'
  riskColor: string
}

class CalculationsService {
  calculateATHDistance(currentPrice: number, athPrice: number): ATHDistanceMetrics {
    const distancePercent = ((athPrice - currentPrice) / athPrice) * 100
    const distanceUSD = athPrice - currentPrice
    
    // Risk assessment based on distance from ATH
    let riskLevel: 'low' | 'medium' | 'high'
    let riskColor: string
    
    if (distancePercent > 30) {
      riskLevel = 'low'
      riskColor = '#22c55e' // Green
    } else if (distancePercent > 15) {
      riskLevel = 'medium' 
      riskColor = '#f59e0b' // Orange
    } else {
      riskLevel = 'high'
      riskColor = '#ef4444' // Red
    }
    
    return {
      athPrice,
      currentPrice,
      distancePercent: Math.max(0, distancePercent),
      distanceUSD: Math.max(0, distanceUSD),
      riskLevel,
      riskColor
    }
  }
}
```

### 2. Enhanced CollateralSummaryCard Component
**File**: `app/simulation/components/parameters/CollateralSummaryCard.tsx`

**Features**:
- Four-section vertical layout
- Dynamic ATH integration via `useATH()` hook
- Risk-based color coding
- Responsive design
- Loading states and error handling
- Consistent with existing card styling

**Layout Structure**:
```
┌─────────────────────────────────┐
│ Total Collateral Value          │
│ $116,566                        │
│ 1.0000 BTC × $116,566          │
├─────────────────────────────────┤
│ ATH Price                       │
│ $124,277.98                     │
├─────────────────────────────────┤
│ ATH Distance                    │
│ 6.2% / $7,711 below ATH        │
│ [Green color - Low Risk]        │
└─────────────────────────────────┘
```

### 3. Integration Points
- **BasicParametersCard**: Replace existing collateral display
- **useATH Hook**: Integrate for dynamic ATH data
- **CalculationsService**: Add ATH distance calculations
- **Error Handling**: Graceful fallbacks for ATH service failures

## Design Specifications

### Visual Design
- **Container**: Maintain existing orange gradient background
- **Typography**: 
  - Large values: 2xl-3xl font weight bold
  - Labels: sm font weight medium
  - Descriptions: xs muted foreground
- **Spacing**: Consistent padding and margins
- **Colors**: Risk-based color coding for ATH distance

### Responsive Behavior
- **Mobile**: Stack sections vertically with reduced padding
- **Desktop**: Maintain current card width and layout
- **Tablet**: Optimize spacing for medium screens

### Accessibility
- **Color Contrast**: Ensure WCAG compliance
- **Screen Readers**: Proper ARIA labels
- **Tooltips**: Explanatory content for complex metrics

## Testing Requirements

### Unit Tests
- ATH distance calculation accuracy
- Risk level determination logic
- Color coding assignment
- Error handling scenarios

### Integration Tests  
- Component rendering with various ATH values
- Loading states and error states
- Responsive behavior across screen sizes

### Visual Tests
- Color coding accuracy
- Layout consistency
- Typography and spacing

## Implementation Phases

### Phase 1: CalculationsService Extension
- Add ATH distance calculation methods
- Implement risk assessment logic
- Add comprehensive unit tests

### Phase 2: CollateralSummaryCard Component
- Create new component with four-section layout
- Integrate useATH hook
- Implement risk-based styling

### Phase 3: BasicParametersCard Integration
- Replace existing collateral display
- Ensure layout consistency
- Add error boundaries

### Phase 4: Testing & Validation
- Comprehensive test coverage
- Visual regression testing
- Performance optimization

## Success Criteria
- ✅ Dynamic ATH integration working
- ✅ Accurate ATH distance calculations
- ✅ Risk-based color coding functional
- ✅ Responsive design maintained
- ✅ Error handling robust
- ✅ Test coverage >90%
- ✅ Performance impact minimal
