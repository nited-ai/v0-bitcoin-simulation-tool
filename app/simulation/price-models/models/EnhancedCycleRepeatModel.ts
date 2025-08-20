  I need to implement a comprehensive Curve Controls feature for the Enhanced Cycle Repeat Model in `app\simulation\price-models\models\EnhancedCycleRepeatModel.ts`. Please implement the following changes in the specified priority order:  **PRIORITY 1: Curve Type Selection System** Add a new curve type selector with four mathematical projection methods:  1. **Logarithmic Curve** (Pure Cycle Repeat): Apply historical percentage movements exactly as extracted from 4 years ago - this maintains the current working implementation 2. **Linear Curve**: Transform historical movements to create steady, consistent growth rate over the projection period 3. **S-Curve (Sigmoid)**: Apply sigmoid transformation to historical movements - slow growth initially, then accelerating, then tapering 4. **Exponential Curve**: Apply exponential transformation to historical movements for accelerating compound growth  **Technical Requirements:** - All curves MUST start from the firsthistorical price we have (2013) and end with the last date of the price projection lengh. - Each curve type applies a different mathematical transformation to these base movements  **PRIORITY 2: Multi-Curve Chart Visualization** Implement simultaneous display of multiple curve projections: - Each curve type gets a distinct color (Logarithmic: blue, Linear: green, S-Curve: orange, Exponential: red) - Toggle system allowing users to show/hide individual curves - All enabled curves display simultaneously on the same chart for comparison - Maintain existing chart functionality (zoom, pan, legend)  **PRIORITY 3: Preset System Clarification** Correct the preset hierarchy (implement after curve types): - **Optimistic**: Pure cycle repeat (Logarithmic curve with minimal curve controls) - **Moderate**: Balanced approach with moderate curve adjustments - **Conservative**: Strong curve dampening effects - **Moonshots**: Most aggressive/bullish with growth-enhancing parameters (not pure repeat)  **PRIORITY 4: Parameter Integration** Define how existing Curve Controls parameters affect each curve type: - Market Maturity Impact: How does this modify Linear vs Exponential transformations? - Institutional Saturation: Different effects on S-Curve vs Logarithmic projections? - Cycle Evolution Rate: How does this interact with mathematical curve transformations?  **Context Notes:** - The current implementation successfully extracts 208 weekly movements and repeats them over 624 weeks - The diminishing returns system is working but needs reframing as "Curve Controls" - User mentioned a logarithmic function screenshot and Reddit post for reference (not provided in context) - Maintain backward compatibility with existing sessionStorage parameter system  **Implementation Order:** 1. First implement the four curve type mathematical transformations 2. Then add multi-curve chart display capability   3. Then update preset system with corrected hierarchy 4. Finally integrate curve controls parameters with each curve type  Please start with Priority 1 (Curve Type Selection) and ask for clarification on the mathematical transformations before proceeding to chart visualization.I need to implement a comprehensive Curve Controls feature for the Enhanced Cycle Repeat Model in `app\simulation\price-models\models\EnhancedCycleRepeatModel.ts`. Please implement the following changes in the specified priority order:

**PRIORITY 1: Curve Type Selection System**
Add a new curve type selector with four mathematical projection methods:

1. **Logarithmic Curve** (Pure Cycle Repeat): Apply historical percentage movements exactly as extracted from 4 years ago - this maintains the current working implementation
2. **Linear Curve**: Transform historical movements to create steady, consistent growth rate over the projection period
3. **S-Curve (Sigmoid)**: Apply sigmoid transformation to historical movements - slow growth initially, then accelerating, then tapering
4. **Exponential Curve**: Apply exponential transformation to historical movements for accelerating compound growth

**Technical Requirements:**
- All curves MUST start from the firsthistorical price we have (2013) and end with the last date of the price projection lengh.
- Each curve type applies a different mathematical transformation to these base movements

**PRIORITY 2: Multi-Curve Chart Visualization**
Implement simultaneous display of multiple curve projections:
- Each curve type gets a distinct color (Logarithmic: blue, Linear: green, S-Curve: orange, Exponential: red)
- Toggle system allowing users to show/hide individual curves
- All enabled curves display simultaneously on the same chart for comparison
- Maintain existing chart functionality (zoom, pan, legend)

**PRIORITY 3: Preset System Clarification**
Correct the preset hierarchy (implement after curve types):
- **Optimistic**: Pure cycle repeat (Logarithmic curve with minimal curve controls)
- **Moderate**: Balanced approach with moderate curve adjustments
- **Conservative**: Strong curve dampening effects
- **Moonshots**: Most aggressive/bullish with growth-enhancing parameters (not pure repeat)

**PRIORITY 4: Parameter Integration**
Define how existing Curve Controls parameters affect each curve type:
- Market Maturity Impact: How does this modify Linear vs Exponential transformations?
- Institutional Saturation: Different effects on S-Curve vs Logarithmic projections?
- Cycle Evolution Rate: How does this interact with mathematical curve transformations?

**Context Notes:**
- The current implementation successfully extracts 208 weekly movements and repeats them over 624 weeks
- The diminishing returns system is working but needs reframing as "Curve Controls"
- User mentioned a logarithmic function screenshot and Reddit post for reference (not provided in context)
- Maintain backward compatibility with existing sessionStorage parameter system

**Implementation Order:**
1. First implement the four curve type mathematical transformations
2. Then add multi-curve chart display capability  
3. Then update preset system with corrected hierarchy
4. Finally integrate curve controls parameters with each curve type

Please start with Priority 1 (Curve Type Selection) and ask for clarification on the mathematical transformations before proceeding to chart visualization.

Create the specs and tasks following  @.augment/rules/create-spec.md  rules and execute following the guidlines from @.augment/rules/execute-tasks.md 

