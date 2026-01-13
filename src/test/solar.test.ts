import { describe, it, expect } from 'vitest'
import {
  calculateBtcFromKwh,
  calculateSolarMining,
  calculateNetMeteringComparison,
  calculateMonthlyExcessMining,
  formatBtc,
  formatUsd,
  formatKwh,
  getMonthName,
  DAYS_IN_MONTH,
  MinerSpec,
} from '../calculations/solar'

// Standard test fixtures
const standardHashvalueSats = 50 // 50 sats/TH/day (typical hashvalue)
const standardBtcPrice = 100000

const standardMiner: MinerSpec = {
  name: 'Test Miner',
  powerW: 1000,
  hashrateTH: 50, // Efficiency: 20 J/TH
}

// Monthly production in kWh for a 10kW system (typical seasonal pattern)
const standardMonthlyProduction = [
  800, 900, 1100, 1200, 1400, 1500, 1600, 1500, 1300, 1100, 900, 800
]

describe('calculateBtcFromKwh', () => {
  it('should calculate BTC from kWh using the rate-based formula', () => {
    const kwh = 1000
    const efficiencyJTH = 20 // 20 J/TH (1000W / 50TH)
    const hashvalueSats = 50
    const days = 30

    const btc = calculateBtcFromKwh(kwh, efficiencyJTH, hashvalueSats, days)

    // Manual calculation:
    // avgPowerW = 1000 * 1000 / (30 * 24) = 1388.89 W
    // avgHashrateTH = 1388.89 / 20 = 69.44 TH/s
    // sats = 69.44 * 50 * 30 = 104,166.67 sats
    // btc = 104,166.67 / 1e8 = 0.00104167
    expect(btc).toBeCloseTo(0.00104167, 6)
  })

  it('should scale linearly with kWh', () => {
    const efficiencyJTH = 20
    const hashvalueSats = 50
    const days = 30

    const btc1000 = calculateBtcFromKwh(1000, efficiencyJTH, hashvalueSats, days)
    const btc2000 = calculateBtcFromKwh(2000, efficiencyJTH, hashvalueSats, days)

    expect(btc2000).toBeCloseTo(btc1000 * 2, 10)
  })

  it('should scale linearly with hashvalue', () => {
    const kwh = 1000
    const efficiencyJTH = 20
    const days = 30

    const btc50 = calculateBtcFromKwh(kwh, efficiencyJTH, 50, days)
    const btc100 = calculateBtcFromKwh(kwh, efficiencyJTH, 100, days)

    expect(btc100).toBeCloseTo(btc50 * 2, 10)
  })

  it('should produce more BTC with better efficiency (lower J/TH)', () => {
    const kwh = 1000
    const hashvalueSats = 50
    const days = 30

    const btcBadEfficiency = calculateBtcFromKwh(kwh, 40, hashvalueSats, days) // 40 J/TH
    const btcGoodEfficiency = calculateBtcFromKwh(kwh, 20, hashvalueSats, days) // 20 J/TH

    // Better efficiency (lower J/TH) means more hashrate per watt, more BTC
    expect(btcGoodEfficiency).toBeCloseTo(btcBadEfficiency * 2, 10)
  })

  it('should return 0 for 0 kWh', () => {
    expect(calculateBtcFromKwh(0, 20, 50, 30)).toBe(0)
  })

  it('should return 0 for 0 efficiency', () => {
    expect(calculateBtcFromKwh(1000, 0, 50, 30)).toBe(0)
  })

  it('should return 0 for 0 hashvalue', () => {
    expect(calculateBtcFromKwh(1000, 20, 0, 30)).toBe(0)
  })

  it('should return 0 for 0 days', () => {
    expect(calculateBtcFromKwh(1000, 20, 50, 0)).toBe(0)
  })
})

describe('calculateSolarMining', () => {
  const annualProduction = standardMonthlyProduction.reduce((a, b) => a + b, 0)

  it('should return complete solar mining results', () => {
    const result = calculateSolarMining(
      annualProduction,
      standardMonthlyProduction,
      standardMiner,
      standardHashvalueSats,
      standardBtcPrice
    )

    expect(result.annualProductionKwh).toBe(annualProduction)
    expect(result.monthlyProductionKwh).toEqual(standardMonthlyProduction)
    expect(result.monthlyBtcBreakdown).toHaveLength(12)
    expect(result.monthlyUsdBreakdown).toHaveLength(12)
  })

  it('should calculate BTC directly from kWh', () => {
    const result = calculateSolarMining(
      annualProduction,
      standardMonthlyProduction,
      standardMiner,
      standardHashvalueSats,
      standardBtcPrice
    )

    // Revenue should be proportional to production
    expect(result.annualBtc).toBeGreaterThan(0)
    expect(result.annualUsd).toBeGreaterThan(0)
  })

  it('should have higher revenue in months with more production', () => {
    const result = calculateSolarMining(
      annualProduction,
      standardMonthlyProduction,
      standardMiner,
      standardHashvalueSats,
      standardBtcPrice
    )

    // July (index 6) has more production than January (index 0)
    expect(result.monthlyBtcBreakdown[6]).toBeGreaterThan(result.monthlyBtcBreakdown[0])
    expect(result.monthlyUsdBreakdown[6]).toBeGreaterThan(result.monthlyUsdBreakdown[0])
  })

  it('should have consistent monthly/annual breakdowns', () => {
    const result = calculateSolarMining(
      annualProduction,
      standardMonthlyProduction,
      standardMiner,
      standardHashvalueSats,
      standardBtcPrice
    )

    const sumMonthlyBtc = result.monthlyBtcBreakdown.reduce((a, b) => a + b, 0)
    expect(result.annualBtc).toBeCloseTo(sumMonthlyBtc, 10)

    const sumMonthlyUsd = result.monthlyUsdBreakdown.reduce((a, b) => a + b, 0)
    expect(result.annualUsd).toBeCloseTo(sumMonthlyUsd, 6)
  })

  it('should calculate efficiency metrics', () => {
    const result = calculateSolarMining(
      annualProduction,
      standardMonthlyProduction,
      standardMiner,
      standardHashvalueSats,
      standardBtcPrice
    )

    expect(result.effectiveRevenuePerKwh).toBeGreaterThan(0)
    expect(result.btcPerKwh).toBeGreaterThan(0)

    // effectiveRevenuePerKwh = annualUsd / annualKwh
    expect(result.effectiveRevenuePerKwh).toBeCloseTo(
      result.annualUsd / annualProduction,
      6
    )
  })

  it('should use miner efficiency correctly', () => {
    // More efficient miner should produce more BTC
    const efficientMiner: MinerSpec = { name: 'Efficient', powerW: 1000, hashrateTH: 100 } // 10 J/TH
    const inefficientMiner: MinerSpec = { name: 'Inefficient', powerW: 1000, hashrateTH: 50 } // 20 J/TH

    const efficientResult = calculateSolarMining(
      annualProduction,
      standardMonthlyProduction,
      efficientMiner,
      standardHashvalueSats,
      standardBtcPrice
    )

    const inefficientResult = calculateSolarMining(
      annualProduction,
      standardMonthlyProduction,
      inefficientMiner,
      standardHashvalueSats,
      standardBtcPrice
    )

    // Efficient miner (10 J/TH) should earn 2x more than inefficient (20 J/TH)
    expect(efficientResult.annualBtc).toBeCloseTo(inefficientResult.annualBtc * 2, 6)
  })
})

describe('calculateNetMeteringComparison', () => {
  it('should calculate net metering revenue', () => {
    const result = calculateNetMeteringComparison(
      1000, // 1000 kWh excess
      0.10, // $0.10/kWh
      standardMiner,
      standardHashvalueSats,
      standardBtcPrice
    )

    expect(result.netMeteringRevenue).toBe(100) // 1000 * 0.10
    expect(result.excessKwh).toBe(1000)
    expect(result.netMeteringRate).toBe(0.10)
  })

  it('should calculate mining revenue from excess kWh', () => {
    const result = calculateNetMeteringComparison(
      1000,
      0.10,
      standardMiner,
      standardHashvalueSats,
      standardBtcPrice
    )

    expect(result.miningBtc).toBeGreaterThan(0)
    expect(result.miningRevenue).toBeCloseTo(result.miningBtc * standardBtcPrice, 6)
  })

  it('should calculate advantage correctly', () => {
    const result = calculateNetMeteringComparison(
      1000,
      0.10,
      standardMiner,
      standardHashvalueSats,
      standardBtcPrice
    )

    expect(result.advantageUsd).toBeCloseTo(
      result.miningRevenue - result.netMeteringRevenue,
      6
    )
  })

  it('should calculate advantage multiplier', () => {
    const result = calculateNetMeteringComparison(
      1000,
      0.10,
      standardMiner,
      standardHashvalueSats,
      standardBtcPrice
    )

    expect(result.advantageMultiplier).toBeCloseTo(
      result.miningRevenue / result.netMeteringRevenue,
      6
    )
  })

  it('should recommend mining when more profitable', () => {
    const result = calculateNetMeteringComparison(
      1000,
      0.01, // Very low net metering rate
      standardMiner,
      standardHashvalueSats,
      standardBtcPrice
    )

    if (result.miningRevenue > result.netMeteringRevenue) {
      expect(result.recommendMining).toBe(true)
    }
  })

  it('should handle zero net metering rate', () => {
    const result = calculateNetMeteringComparison(
      1000,
      0,
      standardMiner,
      standardHashvalueSats,
      standardBtcPrice
    )

    expect(result.netMeteringRevenue).toBe(0)
    expect(result.advantageMultiplier).toBe(0) // Division by zero protection
  })
})

describe('calculateMonthlyExcessMining', () => {
  const monthlyExportKwh = [100, 80, 120, 150, 200, 250, 300, 280, 220, 160, 100, 80]

  it('should return 12 monthly values', () => {
    const result = calculateMonthlyExcessMining(
      monthlyExportKwh,
      standardMiner,
      standardHashvalueSats,
      standardBtcPrice
    )

    expect(result.monthlyBtc).toHaveLength(12)
    expect(result.monthlyUsd).toHaveLength(12)
  })

  it('should have proportional revenue to export kWh', () => {
    const result = calculateMonthlyExcessMining(
      monthlyExportKwh,
      standardMiner,
      standardHashvalueSats,
      standardBtcPrice
    )

    // July (index 6) has most export, should have highest revenue
    const maxBtcIndex = result.monthlyBtc.indexOf(Math.max(...result.monthlyBtc))
    expect(maxBtcIndex).toBe(6)
  })

  it('should correctly convert BTC to USD', () => {
    const result = calculateMonthlyExcessMining(
      monthlyExportKwh,
      standardMiner,
      standardHashvalueSats,
      standardBtcPrice
    )

    result.monthlyBtc.forEach((btc, i) => {
      expect(result.monthlyUsd[i]).toBeCloseTo(btc * standardBtcPrice, 6)
    })
  })
})

describe('DAYS_IN_MONTH', () => {
  it('should have 12 values', () => {
    expect(DAYS_IN_MONTH).toHaveLength(12)
  })

  it('should have correct days for each month', () => {
    expect(DAYS_IN_MONTH[0]).toBe(31) // January
    expect(DAYS_IN_MONTH[1]).toBe(28) // February (non-leap)
    expect(DAYS_IN_MONTH[2]).toBe(31) // March
    expect(DAYS_IN_MONTH[3]).toBe(30) // April
    expect(DAYS_IN_MONTH[6]).toBe(31) // July
    expect(DAYS_IN_MONTH[11]).toBe(31) // December
  })
})

describe('formatBtc', () => {
  it('should format whole BTC values', () => {
    expect(formatBtc(1.2345)).toBe('1.2345 BTC')
    expect(formatBtc(10)).toBe('10.0000 BTC')
  })

  it('should format large sat values as millions', () => {
    // 0.015 BTC = 1,500,000 sats = 1.50M sats
    expect(formatBtc(0.015)).toBe('1.50M sats')
  })

  it('should format medium sat values as thousands', () => {
    // 0.0001 BTC = 10,000 sats = 10.0k sats
    expect(formatBtc(0.0001)).toBe('10.0k sats')
  })

  it('should format small sat values as raw sats', () => {
    // 0.00000100 BTC = 100 sats
    expect(formatBtc(0.000001)).toBe('100 sats')
  })

  it('should handle very small values', () => {
    expect(formatBtc(0.00000001)).toBe('1 sats')
  })
})

describe('formatUsd', () => {
  it('should format large values without decimals', () => {
    expect(formatUsd(1234)).toBe('$1,234')
    expect(formatUsd(10000)).toBe('$10,000')
  })

  it('should format small values with 2 decimals', () => {
    expect(formatUsd(99.99)).toBe('$99.99')
    expect(formatUsd(0.50)).toBe('$0.50')
  })

  it('should handle edge case at 1000', () => {
    expect(formatUsd(1000)).toBe('$1,000')
    expect(formatUsd(999.99)).toBe('$999.99')
  })
})

describe('formatKwh', () => {
  it('should format large values as MWh', () => {
    expect(formatKwh(1500)).toBe('1.5 MWh')
    expect(formatKwh(10000)).toBe('10.0 MWh')
  })

  it('should format small values as kWh', () => {
    expect(formatKwh(500)).toBe('500 kWh')
    expect(formatKwh(999)).toBe('999 kWh')
  })

  it('should handle edge case at 1000', () => {
    expect(formatKwh(1000)).toBe('1.0 MWh')
  })
})

describe('getMonthName', () => {
  it('should return short month names by default', () => {
    expect(getMonthName(0)).toBe('Jan')
    expect(getMonthName(6)).toBe('Jul')
    expect(getMonthName(11)).toBe('Dec')
  })

  it('should return full month names when requested', () => {
    expect(getMonthName(0, false)).toBe('January')
    expect(getMonthName(6, false)).toBe('July')
    expect(getMonthName(11, false)).toBe('December')
  })

  it('should handle invalid indices', () => {
    expect(getMonthName(-1)).toBe('')
    expect(getMonthName(12)).toBe('')
  })
})
