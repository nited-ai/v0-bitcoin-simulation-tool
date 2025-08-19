# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-08-18-dynamic-ath-calculation/spec.md

> Created: 2025-08-18
> Status: Ready for Implementation

## Tasks

- [ ] 1. Create ATH JSON File and Service
  - [ ] 1.1 Write tests for ATH service functionality
  - [ ] 1.2 Create `public/data/bitcoin/ath.json` with initial ATH data
  - [ ] 1.3 Create `lib/services/ath-service.ts` file
  - [ ] 1.4 Implement getCurrentATH() to fetch from JSON + fallback to 124277.98
  - [ ] 1.5 Implement updateATH() to update JSON file on server side
  - [ ] 1.6 Add checkAndUpdateATH() to compare with current prices
  - [ ] 1.7 Verify ATH service tests pass

- [ ] 2. Integrate with Daily Update Service
  - [ ] 2.1 Write tests for daily update integration
  - [ ] 2.2 Modify `/api/bitcoin-prices/daily-update` to include ATH checking
  - [ ] 2.3 Call ATH service when new daily prices are processed
  - [ ] 2.4 Compare processed high prices with stored ATH from JSON
  - [ ] 2.5 Update ATH JSON file automatically when new highs detected
  - [ ] 2.6 Verify daily update integration tests pass

- [ ] 3. Update PriceDropToleranceCard Component
  - [ ] 3.1 Write tests for updated PriceDropToleranceCard
  - [ ] 3.2 Import ATH service and use getCurrentATH()
  - [ ] 3.3 Replace hard-coded 125000 with ATH service call
  - [ ] 3.4 Update fallback ATH calculation to use service
  - [ ] 3.5 Verify component tests pass with dynamic ATH

- [ ] 4. Update Calculations Service
  - [ ] 4.1 Write tests for updated calculationsService
  - [ ] 4.2 Import ATH service and use getCurrentATH()
  - [ ] 4.3 Replace hard-coded 125000 with ATH service call
  - [ ] 4.4 Update ATH calculations to use service
  - [ ] 4.5 Verify calculations service tests pass with dynamic ATH

- [ ] 5. End-to-End Testing and Validation
  - [ ] 5.1 Test Parameters tab displays correct initial ATH (124277.98)
  - [ ] 5.2 Test ATH updates automatically when daily update service runs
  - [ ] 5.3 Verify ATH JSON file persists and is accessible to all users
  - [ ] 5.4 Test liquidation calculations use the current ATH value from JSON
  - [ ] 5.5 Verify all existing functionality works with dynamic ATH
  - [ ] 5.6 Test ATH service gracefully handles JSON file errors
  - [ ] 5.7 Verify all tests pass and feature is complete
