import { describe, it, expect } from 'vitest'
import {
  calculateDailySolarBtc,
  calculateMonthlyBtcBreakdown,
  calculateMaxMiners,
  calculateSunHours,
  calculateSolarMining,
  calculateNetMeteringComparison,
  formatBtc,
  formatUsd,
  formatKwh,
  getMonthName,
  BTCMetrics,
  MinerSpec,
} from '../calculations/solar'

// Standard test fixtures
const standardBtcMetrics: BTCMetrics = {
  btcPrice: 100000,
  networkHashrate: 800e6, // 800 EH/s in TH/s
  blockReward: 3.125,
}

const standardMiner: MinerSpec = {
  name: 'Test Miner',
  powerW: 1000,
  hashrateTH: 50,
}

// Monthly sun hours for a typical location (approx 5 hours avg per day)
const standardMonthlySunHours = [3.5, 4.0, 5.0, 5.5, 6.5, 7.0, 7.5, 7.0, 6.0, 5.0, 4.0, 3.5]

// Monthly production in kWh for a 10kW system
const standardMonthlyProduction = [
  800, 900, 1100, 1200, 1400, 1500, 1600, 1500, 1300, 1100, 900, 800
]

describe('calculateDailySolarBtc', () => {
  it('should calculate daily BTC based on sun hours', () => {
    const avgSunHours = 5
    const hashrateTH = 50
    const dailyBtc = calculateDailySolarBtc(hashrateTH, avgSunHours, standardBtcMetrics)

    // Full day BTC = (50 / 800e6) * 144 * 3.125
    const fullDayBtc = (50 / 800e6) * 144 * 3.125
    // Adjusted for sun hours = fullDayBtc * (5 / 24)
    const expectedBtc = fullDayBtc * (avgSunHours / 24)

    expect(dailyBtc).toBeCloseTo(expectedBtc, 12)
  })

  it('should scale linearly with sun hours', () => {
    const btc5Hours = calculateDailySolarBtc(50, 5, standardBtcMetrics)
    const btc10Hours = calculateDailySolarBtc(50, 10, standardBtcMetrics)

    expect(btc10Hours).toBeCloseTo(btc5Hours * 2, 12)
  })

  it('should scale linearly with hashrate', () => {
    const btc50TH = calculateDailySolarBtc(50, 5, standardBtcMetrics)
    const btc100TH = calculateDailySolarBtc(100, 5, standardBtcMetrics)

    expect(btc100TH).toBeCloseTo(btc50TH * 2, 12)
  })

  it('should return 0 for 0 hashrate', () => {
    const dailyBtc = calculateDailySolarBtc(0, 5, standardBtcMetrics)
    expect(dailyBtc).toBe(0)
  })

  it('should return 0 for 0 sun hours', () => {
    const dailyBtc = calculateDailySolarBtc(50, 0, standardBtcMetrics)
    expect(dailyBtc).toBe(0)
  })
})

describe('calculateMonthlyBtcBreakdown', () => {
  it('should return array of 12 monthly values', () => {
    const breakdown = calculateMonthlyBtcBreakdown(50, standardMonthlySunHours, standardBtcMetrics)
    expect(breakdown).toHaveLength(12)
  })

  it('should have higher BTC in summer months (more sun hours)', () => {
    const breakdown = calculateMonthlyBtcBreakdown(50, standardMonthlySunHours, standardBtcMetrics)

    // July (index 6) should be higher than January (index 0)
    expect(breakdown[6]).toBeGreaterThan(breakdown[0])
  })

  it('should account for days in month', () => {
    const breakdown = calculateMonthlyBtcBreakdown(50, standardMonthlySunHours, standardBtcMetrics)

    // February (28 days) vs March (31 days) with similar sun hours
    // March has more sun hours (5.0 vs 4.0) so should be higher
    expect(breakdown[2]).toBeGreaterThan(breakdown[1])
  })

  it('should return all zeros for 0 hashrate', () => {
    const breakdown = calculateMonthlyBtcBreakdown(0, standardMonthlySunHours, standardBtcMetrics)
    breakdown.forEach(btc => expect(btc).toBe(0))
  })
})

describe('calculateMaxMiners', () => {
  it('should calculate max miners based on system capacity', () => {
    // 10kW system / 1000W miner = 10 miners
    const maxMiners = calculateMaxMiners(10, 1000)
    expect(maxMiners).toBe(10)
  })

  it('should floor the result', () => {
    // 10kW / 1500W = 6.67 -> 6 miners
    const maxMiners = calculateMaxMiners(10, 1500)
    expect(maxMiners).toBe(6)
  })

  it('should return 0 for small system', () => {
    // 0.5kW / 1000W = 0.5 -> 0 miners
    const maxMiners = calculateMaxMiners(0.5, 1000)
    expect(maxMiners).toBe(0)
  })

  it('should handle large systems', () => {
    // 100kW / 3000W = 33.33 -> 33 miners
    const maxMiners = calculateMaxMiners(100, 3000)
    expect(maxMiners).toBe(33)
  })
})

describe('calculateSunHours', () => {
  it('should calculate average sun hours from annual production', () => {
    // 10kW system producing 15000 kWh/year
    // sunHours = 15000 / (10 * 365) = 4.11 hours/day
    const sunHours = calculateSunHours(15000, 10)
    expect(sunHours).toBeCloseTo(4.11, 2)
  })

  it('should return higher hours for higher production', () => {
    const hours1 = calculateSunHours(10000, 10)
    const hours2 = calculateSunHours(20000, 10)
    expect(hours2).toBeCloseTo(hours1 * 2, 2)
  })

  it('should return lower hours for larger system (same production)', () => {
    const hours5kw = calculateSunHours(10000, 5)
    const hours10kw = calculateSunHours(10000, 10)
    expect(hours5kw).toBeCloseTo(hours10kw * 2, 2)
  })
})

describe('calculateSolarMining', () => {
  const annualProduction = standardMonthlyProduction.reduce((a, b) => a + b, 0)

  it('should return complete solar mining results', () => {
    const result = calculateSolarMining(
      10, // 10kW system
      annualProduction,
      standardMonthlyProduction,
      standardMonthlySunHours,
      standardMiner,
      standardBtcMetrics
    )

    expect(result.annualProductionKwh).toBe(annualProduction)
    expect(result.monthlyProductionKwh).toEqual(standardMonthlyProduction)
    // New model: 100% utilization
    expect(result.totalPowerW).toBe(10 * 1000) // Full system capacity
    expect(result.totalHashrateTH).toBe((10 * 1000 / 1000) * 50) // Efficiency-based
  })

  it('should use full system capacity', () => {
    const result = calculateSolarMining(
      10,
      annualProduction,
      standardMonthlyProduction,
      standardMonthlySunHours,
      standardMiner,
      standardBtcMetrics
    )

    // New model: always uses 100% of system capacity
    expect(result.totalPowerW).toBe(10 * 1000)
    expect(result.totalHashrateTH).toBe((10 * 1000 / standardMiner.powerW) * standardMiner.hashrateTH)
  })

  it('should calculate correct total hashrate based on efficiency', () => {
    const result = calculateSolarMining(
      10,
      annualProduction,
      standardMonthlyProduction,
      standardMonthlySunHours,
      standardMiner,
      standardBtcMetrics
    )

    // New model: efficiency-based calculation
    const systemPowerW = 10 * 1000
    const expectedHashrate = (systemPowerW / standardMiner.powerW) * standardMiner.hashrateTH
    expect(result.totalHashrateTH).toBe(expectedHashrate)
    expect(result.totalPowerW).toBe(systemPowerW)
  })

  it('should calculate revenue based on actual solar production', () => {
    const result = calculateSolarMining(
      10,
      annualProduction,
      standardMonthlyProduction,
      standardMonthlySunHours,
      standardMiner,
      standardBtcMetrics
    )

    // Revenue should be based on actual solar production hours, not 24/7 mining
    expect(result.annualBtc).toBeGreaterThan(0)
    expect(result.annualUsd).toBeGreaterThan(0)
    expect(result.effectiveRevenuePerKwh).toBeGreaterThan(0)
  })

  it('should have consistent monthly/annual breakdowns', () => {
    const result = calculateSolarMining(
      10,
      annualProduction,
      standardMonthlyProduction,
      standardMonthlySunHours,
      standardMiner,
      standardBtcMetrics
    )

    const sumMonthlyBtc = result.monthlyBtcBreakdown.reduce((a, b) => a + b, 0)
    expect(result.annualBtc).toBeCloseTo(sumMonthlyBtc, 10)

    const sumMonthlyUsd = result.monthlyUsdBreakdown.reduce((a, b) => a + b, 0)
    expect(result.annualUsd).toBeCloseTo(sumMonthlyUsd, 6)
  })

  it('should calculate efficiency metrics', () => {
    const result = calculateSolarMining(
      10,
      annualProduction,
      standardMonthlyProduction,
      standardMonthlySunHours,
      standardMiner,
      standardBtcMetrics
    )

    expect(result.effectiveRevenuePerKwh).toBeGreaterThan(0)
    expect(result.btcPerKwh).toBeGreaterThan(0)
  })
})

describe('calculateNetMeteringComparison', () => {
  it('should calculate net metering revenue', () => {
    const result = calculateNetMeteringComparison(
      1000, // 1000 kWh excess
      0.10, // $0.10/kWh
      standardMiner,
      5, // 5 sun hours
      standardBtcMetrics
    )

    expect(result.netMeteringRevenue).toBe(100) // 1000 * 0.10
    expect(result.excessKwh).toBe(1000)
    expect(result.netMeteringRate).toBe(0.10)
  })

  it('should calculate mining revenue from excess', () => {
    const result = calculateNetMeteringComparison(
      1000,
      0.10,
      standardMiner,
      5,
      standardBtcMetrics
    )

    expect(result.miningBtc).toBeGreaterThan(0)
    expect(result.miningRevenue).toBeCloseTo(result.miningBtc * 100000, 6)
  })

  it('should calculate advantage correctly', () => {
    const result = calculateNetMeteringComparison(
      1000,
      0.10,
      standardMiner,
      5,
      standardBtcMetrics
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
      5,
      standardBtcMetrics
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
      5,
      standardBtcMetrics
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
      5,
      standardBtcMetrics
    )

    expect(result.netMeteringRevenue).toBe(0)
    expect(result.advantageMultiplier).toBe(0) // Division by zero protection
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
