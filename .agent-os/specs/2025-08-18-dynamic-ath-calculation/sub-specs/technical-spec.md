# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-18-dynamic-ath-calculation/spec.md

> Created: 2025-08-18
> Version: 1.0.0

## Technical Requirements

- **ATH Configuration Constant**: Create a centralized configuration file with the current ATH value ($124,277.98)
- **Component Updates**: Update hard-coded ATH values in PriceDropToleranceCard and calculationsService
- **Documentation**: Add clear comments explaining how to update the ATH value when needed
- **Backward Compatibility**: Ensure existing functionality continues to work with the new ATH value
- **Simple Update Process**: Provide clear instructions for updating ATH when new all-time highs occur

## Approach Options

**Option A: Complex Dynamic ATH Service**
- Pros: Automatic updates, real-time calculation
- Cons: Over-engineered, complex infrastructure, potential performance issues

**Option B: Simple Configuration Constant** (Selected)
- Pros: Simple, maintainable, easy to update, no performance impact
- Cons: Requires manual updates when new ATHs occur

**Option C: Database-Driven ATH**
- Pros: Accurate historical data
- Cons: Additional complexity, database queries, over-engineered for the need

**Rationale:** The simple configuration constant approach is the most practical solution. It provides accurate ATH values without unnecessary complexity and can be easily updated when needed.

## External Dependencies

- **No new external libraries required** - Implementation uses existing codebase structure
- **Justification:** Simple constant replacement requires no additional dependencies

## Implementation Architecture

### ATH JSON File Structure
```json
{
  "meta": {
    "lastUpdated": "2025-08-18T16:06:26.679Z",
    "source": "historical_analysis",
    "version": "1.0.0"
  },
  "ath": {
    "value": 124277.98,
    "date": "2024-03-14",
    "timestamp": 1710374400000
  }
}
```

## Implementation Architecture

### ATH Configuration
- Create `public/data/bitcoin/ath.json` file with current ATH data
- Create simple ATH service to manage automatic updates
- Store current ATH in server-side JSON file for centralized persistence
- Fallback to constant (124277.98) when JSON file unavailable

### Component Updates
- Replace hard-coded `125000` in PriceDropToleranceCard.tsx with ATH service
- Replace hard-coded `125000` in calculationsService.ts with ATH service
- Components get current ATH from service (JSON file + fallback)

### Server-Side Update Integration
- Integrate with existing daily update service (`/api/bitcoin-prices/daily-update`)
- Compare fetched high prices with stored ATH value from JSON
- Update ATH JSON file when new high detected
- Follow same pattern as historical price JSON generation

### Automatic Update Process
1. Daily price fetching checks if current high > stored ATH from JSON file
2. If new ATH detected, update the ATH JSON file on server side
3. Components read from JSON file with fallback to constant
4. ATH service manages the automatic updates and JSON file operations

### Documentation
- Add comments explaining the ATH value and its source
- Include instructions for updating when new ATHs occur
- Document the last update date and value source
