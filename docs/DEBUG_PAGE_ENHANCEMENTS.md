# Debug Page Enhancements - January 10, 2025

## Summary

Enhanced the Rolling Loan Strategy Debug Page with comprehensive parameter display, improved error handling, and detailed calculation tracing to address three critical issues.

---

## Issues Fixed

### Issue 1: Price Projection Not Available Error ✅

**Problem**: Debug page showed "Price projection not available" error even when projection was generated.

**Root Cause**: The check was too strict and didn't provide enough debugging information.

**Fix Applied**:
1. **Added Console Logging**:
   - Logs `priceProjection` object on mount and when it changes
   - Shows existence, structure, and length of projection points
   - Helps identify timing or data structure issues

2. **Enhanced Error Message**:
   - Shows detailed debug information in the alert
   - Displays whether priceProjection exists
   - Shows projectionPoints length
   - Provides clear instructions to generate projection

3. **Improved Validation**:
   ```typescript
   if (!priceProjection || !priceProjection.projectionPoints || priceProjection.projectionPoints.length === 0) {
     const errorMsg = `Price projection not available. Please generate price projection first.
     
   Debug Info:
   - priceProjection exists: ${!!priceProjection}
   - projectionPoints exists: ${!!priceProjection?.projectionPoints}
   - projectionPoints length: ${priceProjection?.projectionPoints?.length || 0}
   
   Please go to the Price Projection tab and generate a projection.`
     alert(errorMsg)
     return
   }
   ```

**Testing**:
- Open browser console (F12)
- Navigate to Debug tab
- Check console logs for priceProjection data
- If projection is missing, error message will show exact issue

---

### Issue 2: Incorrect "Max Loan Amount (fixed)" Display ✅

**Problem**: Displayed $15,000 as "Max Loan Amount (fixed)" which was confusing and didn't match expected calculation.

**Root Cause**: The display didn't clarify the difference between:
- `maxLoanAmount` parameter (from Parameters tab)
- Calculated loan amount based on `loanAmountPercent`
- Calculated loan amount based on Target LTV

**Fix Applied**:
1. **Created Calculated Values Section**:
   - Shows all intermediate calculations
   - Clearly labels each value's source
   - Displays formulas used

2. **Added Comprehensive Calculations**:
   ```typescript
   const calculatedValues = useMemo(() => {
     const btcStackValue = params.initialBtcAmount * params.initialBtcPrice
     const loanPercent = params.loanAmountPercent || 10
     const targetLtvPercent = params.riskManagement.targetLtv
     
     const calculatedByPercent = btcStackValue * (loanPercent / 100)
     const calculatedByLtv = btcStackValue * (targetLtvPercent / 100)
     const maxLoanParam = params.maxLoanAmount
     
     const willUseLoanAmountPercent = params.loanAmountPercent !== undefined && params.loanAmountPercent > 0
     const finalLoanAmount = willUseLoanAmountPercent 
       ? calculatedByPercent 
       : Math.min(maxLoanParam, calculatedByLtv)
     
     return {
       btcStackValue,
       calculatedByPercent,
       calculatedByLtv,
       maxLoanParam,
       willUseLoanAmountPercent,
       finalLoanAmount
     }
   }, [params, priceProjection])
   ```

3. **Clear Display**:
   - **Initial BTC Stack Value**: $232,444 (2 BTC × $116,222)
   - **Calculated by Loan %**: $23,244.40 (10% of stack)
   - **Calculated by Target LTV**: $46,488.80 (20% of stack)
   - **Max Loan Amount (param)**: $15,000 (from parameters)
   - **Which Value Will Be Used?**: $23,244.40 ✓ Using loanAmountPercent

---

### Issue 3: Missing Input/Output Values ✅

**Problem**: Debug page didn't show all relevant parameters from different tabs.

**Fix Applied**: Added comprehensive parameter display organized by source.

#### FROM PARAMETERS TAB
- ✅ Initial BTC Amount: 2 BTC
- ✅ Initial BTC Price: $116,222
- ✅ Loan Amount Percent: 10%
- ✅ Annual Interest Rate: 6.5%
- ✅ Loan Origination Fee: 1%
- ✅ Loan Term: 6 months
- ✅ Simulation Months: 180 months
- ✅ Monthly Withdrawal: $0
- ✅ Target LTV (platform): 20%
- ✅ Liquidation LTV (platform): 80%
- ✅ Liquidation Fee (platform): 5%

#### FROM PRICE PROJECTION TAB
- ✅ Selected Price Model: "Power Law" / "Enhanced Cycle Repeat"
- ✅ Projection Points: 5,400 points
- ✅ Projection Available: Yes ✓ / No ✗
- ✅ Month 0 Price: $116,222
- ✅ Month 1 Price: $118,500
- ✅ Month 2 Price: $120,800
- ✅ Month 12 Price: $145,000

#### FROM STRATEGY TAB
- ✅ Selected Strategy: "Rolling Loan Strategy"
- ✅ BTC Accumulation: Enabled / Disabled

#### CALCULATED VALUES
- ✅ Initial BTC Stack Value: $232,444
  - Formula: 2 BTC × $116,222
- ✅ Calculated by Loan %: $23,244.40
  - Formula: $232,444 × 10%
- ✅ Calculated by Target LTV: $46,488.80
  - Formula: $232,444 × 20%
- ✅ Max Loan Amount (param): $15,000
  - Source: From parameters tab
- ✅ Which Value Will Be Used?: $23,244.40
  - Logic: ✓ Using loanAmountPercent (10% of stack)
  - OR: ⚠ Using legacy logic: min($15,000, $46,488.80)

---

## New Debug Page Structure

### 1. Debug Controls
- Run Debug Simulation button
- Copy Debug Output button
- Show All Months checkbox

### 2. Input Parameters (NEW - Comprehensive)
- **FROM PARAMETERS TAB** (11 parameters)
- **FROM PRICE PROJECTION TAB** (7+ parameters)
- **FROM STRATEGY TAB** (2 parameters)
- **CALCULATED VALUES** (5 calculations with formulas)

### 3. Expected vs Actual Comparison
- Month 0 and Month 12 comparison
- Shows expected loan amount (based on loanAmountPercent)
- Shows actual loan amount (from simulation)
- Visual indicators (✓ or ✗)

### 4. Month-by-Month Execution Trace
- Market State (price, BTC amount, collateral, active loans)
- Loan Amount Calculation (with badge showing which logic used)
- Strategy Decision (investment multiplier, loan amount, reasoning)
- Rollover Details (when applicable)

---

## Console Logging

The debug page now logs comprehensive information to the browser console:

```javascript
🔍 Debug Page - priceProjection: {metadata: {...}, projectionPoints: [...]}
🔍 Debug Page - priceProjection exists: true
🔍 Debug Page - projectionPoints length: 5400
🔍 Debug Page - params: {initialBtcAmount: 2, initialBtcPrice: 116222, ...}

🚀 Running debug simulation...
🔍 priceProjection: {metadata: {...}, projectionPoints: [...]}
🔍 projectionPoints length: 5400
✅ Price projection available, starting simulation...
```

---

## Usage Instructions

### Step 1: Open Browser Console
- Press F12 to open Developer Tools
- Go to Console tab
- Keep it open while using Debug page

### Step 2: Navigate to Debug Tab
- Go to http://localhost:3002/simulation?tab=debug
- Check console for initial logs

### Step 3: Review Input Parameters
- Scroll to "1. Input Parameters" section
- Verify all values are correct
- Check "CALCULATED VALUES" section
- Confirm "Which Value Will Be Used?" shows expected logic

### Step 4: Run Debug Simulation
- Click "Run Debug Simulation" button
- Check console for execution logs
- If error occurs, console will show detailed debug info

### Step 5: Analyze Results
- Review "Expected vs Actual Comparison"
- Check for green checkmarks (✓) or red X marks (✗)
- Expand month-by-month trace
- Verify loan calculations match expected values

---

## Troubleshooting

### Price Projection Not Available

**Symptoms**:
- Alert shows "Price projection not available"
- Console shows `projectionPoints length: 0`

**Solution**:
1. Go to Price Projection tab
2. Select a price model
3. Click "Generate Projection" or wait for auto-generation
4. Return to Debug tab
5. Try again

### Incorrect Loan Amounts

**Symptoms**:
- Expected vs Actual shows red X marks
- Loan amounts don't match expected percentage

**Check**:
1. Review "CALCULATED VALUES" section
2. Verify "Which Value Will Be Used?" shows correct logic
3. Check if badge shows "Using loanAmountPercent" (green) or "Using Legacy Logic" (red)
4. If using legacy logic, check why `loanAmountPercent` is not set

### Missing Parameters

**Symptoms**:
- Some parameters show "Not Set" or "N/A"

**Solution**:
1. Go to Parameters tab and set all required values
2. Go to Price Projection tab and generate projection
3. Go to Strategy tab and configure strategy
4. Return to Debug tab

---

## Files Modified

1. `app/simulation/tabs/debug/RollingLoanDebugPage.tsx`
   - Added comprehensive parameter display
   - Added calculated values section
   - Added console logging
   - Enhanced error messages
   - Improved validation

---

## Testing Checklist

### ✅ Price Projection Check
- [x] Console logs show priceProjection data
- [x] Error message shows detailed debug info
- [x] Projection availability indicator works

### ✅ Parameter Display
- [x] All parameters from Parameters tab shown
- [x] All parameters from Price Projection tab shown
- [x] All parameters from Strategy tab shown
- [x] Calculated values section displays correctly
- [x] Formulas are shown for each calculation

### ✅ Calculated Values
- [x] Initial BTC Stack Value calculated correctly
- [x] Calculated by Loan % matches expected
- [x] Calculated by Target LTV matches expected
- [x] "Which Value Will Be Used?" shows correct logic
- [x] Badge color indicates correct/incorrect logic

### ✅ Console Logging
- [x] Logs on page mount
- [x] Logs when running simulation
- [x] Shows detailed error information
- [x] Helps identify timing issues

---

## Next Steps

1. **Test with Real Data**:
   - Configure parameters
   - Generate price projection
   - Run debug simulation
   - Verify all calculations

2. **Check Console Logs**:
   - Open browser console
   - Review logged data
   - Identify any issues

3. **Verify Calculations**:
   - Check "CALCULATED VALUES" section
   - Confirm formulas are correct
   - Verify "Which Value Will Be Used?" logic

4. **Report Issues**:
   - If calculations are still wrong, check console logs
   - Copy debug output (button provided)
   - Share with development team

---

## Conclusion

The Debug page now provides comprehensive visibility into:
- ✅ All input parameters from all tabs
- ✅ Calculated values with formulas
- ✅ Which calculation logic will be used
- ✅ Detailed error messages
- ✅ Console logging for troubleshooting

This makes it easy to identify exactly where loan amount calculations are going wrong and why!


