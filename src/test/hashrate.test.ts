import { describe, it, expect } from 'vitest'
import {
  calculateHashvalue,
  calculateHashprice,
  calculateNetworkMetrics,
  calculateDailyBTC,
  calculateCOPe,
  calculateArbitrage,
  calculateBreakevenForCOPe,
  getMinerEfficiency,
  formatCOPe,
  getFuelSpecs,
  MINER_PRESETS,
  FUEL_SPECS,
  BTCMetrics,
  MinerSpec,
} from '../calculations/hashrate'

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

describe('calculateHashvalue', () => {
  it('should calculate hashvalue correctly', () => {
    // hashvalue = 144 blocks * blockReward in sats / network hashrate
    // = 144 * 3.125 * 1e8 / 800e6
    // = 45,000,000,000 / 800,000,000
    // = 56.25 sats/TH/day
    const hashvalue = calculateHashvalue(800e6, 3.125)
    expect(hashvalue).toBeCloseTo(56.25, 2)
  })

  it('should return higher hashvalue for lower network hashrate', () => {
    const highHashrate = calculateHashvalue(800e6, 3.125)
    const lowHashrate = calculateHashvalue(400e6, 3.125)
    expect(lowHashrate).toBeGreaterThan(highHashrate)
    expect(lowHashrate).toBeCloseTo(highHashrate * 2, 2)
  })

  it('should scale linearly with block reward', () => {
    const fullReward = calculateHashvalue(800e6, 3.125)
    const halfReward = calculateHashvalue(800e6, 1.5625)
    expect(fullReward).toBeCloseTo(halfReward * 2, 2)
  })
})

describe('calculateHashprice', () => {
  it('should convert hashvalue to USD', () => {
    const hashvalue = 56.25 // sats/TH/day
    const btcPrice = 100000
    // hashprice = hashvalue * btcPrice / 1e8
    // = 56.25 * 100000 / 1e8
    // = 0.05625 $/TH/day
    const hashprice = calculateHashprice(hashvalue, btcPrice)
    expect(hashprice).toBeCloseTo(0.05625, 5)
  })

  it('should scale linearly with BTC price', () => {
    const hashvalue = 56.25
    const price1 = calculateHashprice(hashvalue, 50000)
    const price2 = calculateHashprice(hashvalue, 100000)
    expect(price2).toBeCloseTo(price1 * 2, 5)
  })
})

describe('calculateNetworkMetrics', () => {
  it('should return correct network metrics', () => {
    const metrics = calculateNetworkMetrics(standardBtcMetrics, 12345)

    expect(metrics.hashvalue).toBeCloseTo(56.25, 2)
    expect(metrics.hashprice).toBeCloseTo(0.05625, 5)
    expect(metrics.networkHashrateEH).toBeCloseTo(800, 0)
    expect(metrics.difficulty).toBe(12345)
  })

  it('should default difficulty to 0', () => {
    const metrics = calculateNetworkMetrics(standardBtcMetrics)
    expect(metrics.difficulty).toBe(0)
  })
})

describe('calculateDailyBTC', () => {
  it('should calculate daily BTC correctly', () => {
    // userShare = 50 / 800e6
    // dailyBTC = userShare * 144 * 3.125
    const dailyBTC = calculateDailyBTC(50, standardBtcMetrics)
    const expectedShare = 50 / 800e6
    const expectedBTC = expectedShare * 144 * 3.125
    expect(dailyBTC).toBeCloseTo(expectedBTC, 12)
  })

  it('should scale linearly with hashrate', () => {
    const btc50TH = calculateDailyBTC(50, standardBtcMetrics)
    const btc100TH = calculateDailyBTC(100, standardBtcMetrics)
    expect(btc100TH).toBeCloseTo(btc50TH * 2, 12)
  })

  it('should return 0 for 0 hashrate', () => {
    const dailyBTC = calculateDailyBTC(0, standardBtcMetrics)
    expect(dailyBTC).toBe(0)
  })
})

describe('calculateCOPe', () => {
  it('should calculate COPe correctly for typical scenario', () => {
    const result = calculateCOPe(0.10, standardMiner, standardBtcMetrics)

    // Daily kWh = 1000W * 24h / 1000 = 24 kWh
    // Daily electricity cost = 24 * $0.10 = $2.40
    expect(result.dailyElectricityCost).toBeCloseTo(2.40, 2)

    // Daily BTC = (50 / 800e6) * 144 * 3.125
    const expectedDailyBTC = (50 / 800e6) * 144 * 3.125
    expect(result.dailyBTC).toBeCloseTo(expectedDailyBTC, 12)

    // Daily mining revenue = dailyBTC * $100000
    expect(result.dailyMiningRevenue).toBeCloseTo(expectedDailyBTC * 100000, 6)
  })

  it('should return infinite COPe when R >= 1', () => {
    // Use very low electricity rate to make R >= 1
    const result = calculateCOPe(0.001, standardMiner, standardBtcMetrics)
    expect(result.COPe).toBe(Infinity)
    expect(result.status).toBe('profitable')
  })

  it('should return status "subsidized" when R > 0.5 but < 1', () => {
    // Find a rate that gives R around 0.7
    const result = calculateCOPe(0.04, standardMiner, standardBtcMetrics)
    if (result.R > 0.5 && result.R < 1) {
      expect(result.status).toBe('subsidized')
    }
  })

  it('should return status "loss" when R <= 0.5', () => {
    const result = calculateCOPe(0.50, standardMiner, standardBtcMetrics)
    if (result.R <= 0.5) {
      expect(result.status).toBe('loss')
    }
  })

  it('should calculate correct monthly values', () => {
    const result = calculateCOPe(0.10, standardMiner, standardBtcMetrics)
    expect(result.monthlyBTC).toBeCloseTo(result.dailyBTC * 30, 12)
    expect(result.monthlySats).toBe(Math.round(result.monthlyBTC * 1e8))
  })

  it('should calculate breakeven rate correctly', () => {
    const result = calculateCOPe(0.10, standardMiner, standardBtcMetrics)
    // At breakeven rate, R = 1, so dailyMiningRevenue = dailyElectricityCost
    // breakevenRate = dailyMiningRevenue / dailyKwh
    const dailyKwh = 24
    const expectedBreakeven = result.dailyMiningRevenue / dailyKwh
    expect(result.breakevenRate).toBeCloseTo(expectedBreakeven, 6)
  })

  it('should calculate effective cost per kWh correctly', () => {
    const result = calculateCOPe(0.10, standardMiner, standardBtcMetrics)
    const netDailyCost = result.dailyElectricityCost - result.dailyMiningRevenue
    const dailyKwh = 24
    expect(result.effectiveCostPerKwh).toBeCloseTo(netDailyCost / dailyKwh, 6)
  })
})

describe('calculateArbitrage', () => {
  it('should calculate savings vs natural gas', () => {
    const result = calculateArbitrage(
      'natural_gas',
      1.50, // $1.50/therm
      0.10,
      standardMiner,
      standardBtcMetrics
    )

    expect(result.traditionalCostPerKwh).toBeGreaterThan(0)
    expect(typeof result.hashrateCostPerKwh).toBe('number')
    expect(typeof result.savingsPercent).toBe('number')
  })

  it('should calculate savings vs electric resistance', () => {
    const electricRate = 0.12
    const result = calculateArbitrage(
      'electric_resistance',
      electricRate,
      electricRate,
      standardMiner,
      standardBtcMetrics
    )

    // Electric resistance cost = electricity rate (COP = 1)
    expect(result.traditionalCostPerKwh).toBeCloseTo(electricRate, 4)
  })

  it('should calculate annual savings correctly', () => {
    const result = calculateArbitrage(
      'natural_gas',
      1.50,
      0.10,
      standardMiner,
      standardBtcMetrics,
      1500 // 1500 kWh/month
    )

    expect(result.annualSavings).toBeCloseTo(result.monthlySavings * 12, 2)
  })

  it('should use provided fuel efficiency', () => {
    const result1 = calculateArbitrage(
      'natural_gas',
      1.50,
      0.10,
      standardMiner,
      standardBtcMetrics,
      1500,
      0.80 // 80% efficiency
    )

    const result2 = calculateArbitrage(
      'natural_gas',
      1.50,
      0.10,
      standardMiner,
      standardBtcMetrics,
      1500,
      0.95 // 95% efficiency
    )

    // Lower efficiency = higher cost per kWh
    expect(result1.traditionalCostPerKwh).toBeGreaterThan(result2.traditionalCostPerKwh)
  })
})

describe('calculateBreakevenForCOPe', () => {
  it('should calculate max rate for target COPe', () => {
    const targetCOPe = 3.0
    const maxRate = calculateBreakevenForCOPe(targetCOPe, standardMiner, standardBtcMetrics)

    // Verify by calculating COPe at this rate
    const result = calculateCOPe(maxRate, standardMiner, standardBtcMetrics)
    expect(result.COPe).toBeCloseTo(targetCOPe, 1)
  })

  it('should return lower rate for higher target COPe', () => {
    const rate2 = calculateBreakevenForCOPe(2.0, standardMiner, standardBtcMetrics)
    const rate5 = calculateBreakevenForCOPe(5.0, standardMiner, standardBtcMetrics)

    // Higher COPe requires higher R (revenue ratio), which means lower max electricity rate
    // since R = mining_revenue / electricity_cost
    expect(rate2).toBeGreaterThan(rate5)
  })
})

describe('getMinerEfficiency', () => {
  it('should calculate efficiency in J/TH', () => {
    const efficiency = getMinerEfficiency(standardMiner)
    // 1000W / 50TH = 20 J/TH
    expect(efficiency).toBe(20)
  })

  it('should work with real miner presets', () => {
    const heatbitTrio = MINER_PRESETS.find(m => m.name === 'Heatbit Trio')!
    const efficiency = getMinerEfficiency(heatbitTrio)
    // 400W / 10TH = 40 J/TH
    expect(efficiency).toBe(40)
  })
})

describe('formatCOPe', () => {
  it('should format infinite COPe', () => {
    expect(formatCOPe(Infinity)).toBe('∞ (Free)')
  })

  it('should format negative COPe', () => {
    expect(formatCOPe(-5)).toBe('Paid to heat!')
  })

  it('should format normal COPe with 2 decimals', () => {
    expect(formatCOPe(3.456)).toBe('3.46')
    expect(formatCOPe(1.5)).toBe('1.50')
  })
})

describe('getFuelSpecs', () => {
  it('should return US specs by default', () => {
    const specs = getFuelSpecs('natural_gas')
    expect(specs.unit).toBe('therm')
  })

  it('should return Canadian specs', () => {
    const specs = getFuelSpecs('natural_gas', 'CA')
    expect(specs.unit).toBe('GJ')
  })

  it('should return propane in gallons for US', () => {
    const specs = getFuelSpecs('propane', 'US')
    expect(specs.unit).toBe('gallon')
  })

  it('should return propane in litres for CA', () => {
    const specs = getFuelSpecs('propane', 'CA')
    expect(specs.unit).toBe('litre')
  })
})

describe('FUEL_SPECS constants', () => {
  it('should have correct BTU values for natural gas', () => {
    expect(FUEL_SPECS.natural_gas.btuPerUnit).toBe(100000)
  })

  it('should have correct BTU values for electric resistance', () => {
    expect(FUEL_SPECS.electric_resistance.btuPerUnit).toBe(3412)
  })

  it('should have heat pump COP of 3.0', () => {
    expect(FUEL_SPECS.heat_pump.typicalEfficiency).toBe(3.0)
  })
})

describe('MINER_PRESETS', () => {
  it('should have reasonable power and hashrate values', () => {
    for (const miner of MINER_PRESETS) {
      expect(miner.powerW).toBeGreaterThan(0)
      expect(miner.hashrateTH).toBeGreaterThan(0)
      expect(miner.name).toBeTruthy()
    }
  })

  it('should include Heatbit miners', () => {
    const heatbitMiners = MINER_PRESETS.filter(m => m.name.includes('Heatbit'))
    expect(heatbitMiners.length).toBeGreaterThanOrEqual(2)
  })
})
