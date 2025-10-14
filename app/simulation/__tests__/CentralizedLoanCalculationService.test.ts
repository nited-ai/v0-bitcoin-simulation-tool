import { centralizedLoanCalculationService } from "@/src/modules/strategies/services/CentralizedLoanCalculationService"

describe('CentralizedLoanCalculationService helpers', () => {
  describe('lockedBTCUnderTargetLtv', () => {
    it('returns 0 when btcPrice is 0 or negative', () => {
      expect(centralizedLoanCalculationService.lockedBTCUnderTargetLtv(10000, 0, 50)).toBe(0)
      expect(centralizedLoanCalculationService.lockedBTCUnderTargetLtv(10000, -20000, 50)).toBe(0)
    })

    it('returns 0 when totalDebt is 0 or negative', () => {
      expect(centralizedLoanCalculationService.lockedBTCUnderTargetLtv(0, 50000, 50)).toBe(0)
      expect(centralizedLoanCalculationService.lockedBTCUnderTargetLtv(-100, 50000, 50)).toBe(0)
    })

    it('returns 0 when targetLtvPercent is 0 or negative', () => {
      expect(centralizedLoanCalculationService.lockedBTCUnderTargetLtv(10000, 50000, 0)).toBe(0)
      expect(centralizedLoanCalculationService.lockedBTCUnderTargetLtv(10000, 50000, -10)).toBe(0)
    })

    it('calculates locked BTC for typical values', () => {
      // debt=$10,000, price=$50,000, targetLTV=50% -> lockedBTC = (10000 / 0.5) / 50000 = 0.4 BTC
      const locked = centralizedLoanCalculationService.lockedBTCUnderTargetLtv(10000, 50000, 50)
      expect(locked).toBeCloseTo(0.4, 10)
    })

    it('handles different target LTV percentages', () => {
      // 25% target -> (10000 / 0.25) / 50000 = 0.8 BTC
      expect(centralizedLoanCalculationService.lockedBTCUnderTargetLtv(10000, 50000, 25)).toBeCloseTo(0.8, 10)
      // 75% target -> (10000 / 0.75) / 50000 = 0.266666...
      expect(centralizedLoanCalculationService.lockedBTCUnderTargetLtv(10000, 50000, 75)).toBeCloseTo(0.2666666667, 10)
    })
  })

  describe('netBtcAfterPayoff', () => {
    it('returns totalBtc when btcPrice is 0 or debt is 0/negative', () => {
      expect(centralizedLoanCalculationService.netBtcAfterPayoff(2, 10000, 0)).toBe(2)
      expect(centralizedLoanCalculationService.netBtcAfterPayoff(2, 0, 50000)).toBe(2)
      expect(centralizedLoanCalculationService.netBtcAfterPayoff(2, -1000, 50000)).toBe(2)
    })

    it('calculates remaining BTC after paying off debt', () => {
      // totalBtc=2 BTC, price=$50k, debt=$10k -> debt in BTC=0.2 -> net=1.8
      const net = centralizedLoanCalculationService.netBtcAfterPayoff(2, 10000, 50000)
      expect(net).toBeCloseTo(1.8, 10)
    })

    it('handles debt exceeding BTC value (can go negative)', () => {
      // totalBtc=0.1 BTC, price=$20k, debt=$5k -> debt BTC=0.25 -> net=-0.15
      const net = centralizedLoanCalculationService.netBtcAfterPayoff(0.1, 5000, 20000)
      expect(net).toBeCloseTo(-0.15, 10)
    })
  })
})

