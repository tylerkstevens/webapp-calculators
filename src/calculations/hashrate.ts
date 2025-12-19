/**
 * Hashrate heating calculations - COPe and arbitrage metrics.
 *
 * These calculations help users understand the economic efficiency of
 * hashrate heating compared to traditional heating methods.
 */

// ============================================================================
// Types
// ============================================================================

export interface MinerSpec {
  name: string
  powerW: number      // Power consumption in watts
  hashrateTH: number  // Hashrate in TH/s
}

export interface BTCMetrics {
  btcPrice: number          // BTC price in USD
  networkHashrate: number   // Network hashrate in TH/s
  blockReward: number       // Current block reward (3.125 BTC)
}

export interface COPeResult {
  R: number                    // Revenue ratio (0-1+)
  COPe: number                 // Coefficient of Performance - Economic
  effectiveCostPerKwh: number  // Net cost per kWh of heat after BTC offset
  effectiveCostPerMMBTU: number // Net cost per MMBTU
  effectiveCostPerTherm: number // Net cost per therm
  breakevenRate: number        // Electricity rate where COPe = infinity
  dailyElectricityCost: number // Daily electricity cost in USD
  dailyMiningRevenue: number   // Daily mining revenue in USD
  dailyBTC: number             // Daily BTC mined
  monthlyBTC: number           // Monthly BTC mined
  monthlySats: number          // Monthly sats mined
  status: 'profitable' | 'subsidized' | 'loss'
}

export interface NetworkMetrics {
  hashvalue: number     // sats/TH/s/day
  hashprice: number     // $/TH/day
  networkHashrateEH: number // Network hashrate in EH/s
  difficulty: number    // Raw difficulty
}

export interface ArbitrageResult {
  traditionalCostPerKwh: number   // Cost per kWh using traditional fuel
  hashrateCostPerKwh: number      // Net cost per kWh using hashrate heating
  savingsPercent: number          // % savings vs traditional
  monthlySavings: number          // Monthly savings in USD (estimate)
  annualSavings: number           // Annual savings in USD (estimate)
}

// ============================================================================
// Constants
// ============================================================================

export const MINER_PRESETS: MinerSpec[] = [
  { name: 'Heatbit Trio', powerW: 400, hashrateTH: 10 },
  { name: 'Avalon Mini 3', powerW: 850, hashrateTH: 40 },
  { name: 'Avalon Q', powerW: 1700, hashrateTH: 90 },
  { name: 'Heat Core HS05', powerW: 5000, hashrateTH: 228 },
]

// Default custom miner specs for the calculator
export const DEFAULT_CUSTOM_MINER: MinerSpec = {
  name: 'Custom',
  powerW: 1000,
  hashrateTH: 50,
}

// Fuel heating efficiency and BTU content
export const FUEL_SPECS = {
  natural_gas: {
    label: 'Natural Gas',
    unit: 'therm',
    btuPerUnit: 100000,
    typicalEfficiency: 0.92,  // 92% AFUE for modern furnace
  },
  propane: {
    label: 'Propane',
    unit: 'gallon',
    btuPerUnit: 91500,
    typicalEfficiency: 0.90,
  },
  heating_oil: {
    label: 'Heating Oil',
    unit: 'gallon',
    btuPerUnit: 138500,
    typicalEfficiency: 0.85,
  },
  electric_resistance: {
    label: 'Electric Resistance',
    unit: 'kWh',
    btuPerUnit: 3412,
    typicalEfficiency: 1.0,
  },
  heat_pump: {
    label: 'Heat Pump',
    unit: 'kWh',
    btuPerUnit: 3412,
    typicalEfficiency: 3.0,  // COP of 3.0
  },
} as const

export type FuelType = keyof typeof FUEL_SPECS

// BTU per kWh (for conversions)
const BTU_PER_KWH = 3412

// Conversion constants for heat cost units
const KWH_PER_MMBTU = 293.07  // 1 MMBTU = 293.07 kWh
const KWH_PER_THERM = 29.307  // 1 therm = 29.307 kWh

// ============================================================================
// Network Metrics Calculations
// ============================================================================

/**
 * Calculate hashvalue - sats earned per TH/s per day.
 * This is the Bitcoin-denominated mining yield.
 *
 * @param networkHashrateTH - Network hashrate in TH/s
 * @param blockReward - Current block reward in BTC
 * @returns Hashvalue in sats/TH/s/day
 */
export function calculateHashvalue(networkHashrateTH: number, blockReward: number): number {
  // Daily blocks × block reward in sats / network hashrate
  // = 144 × (blockReward × 1e8) / networkHashrateTH
  const dailySatsTotal = 144 * blockReward * 1e8
  return dailySatsTotal / networkHashrateTH
}

/**
 * Calculate hashprice - USD earned per TH/s per day.
 * This is the USD-denominated mining yield.
 *
 * @param hashvalue - Hashvalue in sats/TH/s/day
 * @param btcPrice - Current BTC price in USD
 * @returns Hashprice in $/TH/day
 */
export function calculateHashprice(hashvalue: number, btcPrice: number): number {
  return (hashvalue * btcPrice) / 1e8
}

/**
 * Calculate network metrics from BTC data.
 *
 * @param btcMetrics - BTC metrics from API
 * @param difficulty - Network difficulty (optional)
 * @returns NetworkMetrics object
 */
export function calculateNetworkMetrics(
  btcMetrics: BTCMetrics,
  difficulty: number = 0
): NetworkMetrics {
  const hashvalue = calculateHashvalue(btcMetrics.networkHashrate, btcMetrics.blockReward)
  const hashprice = calculateHashprice(hashvalue, btcMetrics.btcPrice)
  const networkHashrateEH = btcMetrics.networkHashrate / 1e6 // TH to EH

  return {
    hashvalue,
    hashprice,
    networkHashrateEH,
    difficulty,
  }
}

// ============================================================================
// Core Calculations
// ============================================================================

/**
 * Calculate daily BTC mining revenue for a given hashrate.
 *
 * @param hashrateTH - Miner hashrate in TH/s
 * @param btcMetrics - Current BTC network metrics
 * @returns Daily BTC earned
 */
export function calculateDailyBTC(hashrateTH: number, btcMetrics: BTCMetrics): number {
  // Blocks per day (approximately 144)
  const blocksPerDay = 144

  // User's share of network hashrate
  const userShare = hashrateTH / btcMetrics.networkHashrate

  // Daily BTC earned
  return userShare * blocksPerDay * btcMetrics.blockReward
}

/**
 * Calculate COPe (Coefficient of Performance - Economic).
 *
 * Formula: COPe = 1 / (1 - R)
 * Where R = Daily Mining Revenue / Daily Electricity Cost
 *
 * @param electricityRate - Electricity rate in $/kWh
 * @param miner - Miner specifications
 * @param btcMetrics - Current BTC network metrics
 * @returns COPe calculation result
 */
export function calculateCOPe(
  electricityRate: number,
  miner: MinerSpec,
  btcMetrics: BTCMetrics
): COPeResult {
  // Daily electricity consumption and cost
  const dailyKwh = (miner.powerW / 1000) * 24
  const dailyElectricityCost = dailyKwh * electricityRate

  // Daily mining revenue
  const dailyBTC = calculateDailyBTC(miner.hashrateTH, btcMetrics)
  const dailyMiningRevenue = dailyBTC * btcMetrics.btcPrice

  // Monthly BTC calculations
  const monthlyBTC = dailyBTC * 30
  const monthlySats = Math.round(monthlyBTC * 1e8)

  // Revenue ratio (R) - also known as Heating Subsidy
  const R = dailyElectricityCost > 0 ? dailyMiningRevenue / dailyElectricityCost : 0

  // COPe calculation
  // When R = 1, COPe = infinity (free heating)
  // When R > 1, COPe = negative (getting paid to heat)
  let COPe: number
  if (R >= 1) {
    COPe = Infinity
  } else {
    COPe = 1 / (1 - R)
  }

  // Effective cost per kWh of heat
  const netDailyCost = dailyElectricityCost - dailyMiningRevenue
  const effectiveCostPerKwh = netDailyCost / dailyKwh

  // Convert to other heat cost units
  // $/MMBTU = $/kWh × kWh/MMBTU
  const effectiveCostPerMMBTU = effectiveCostPerKwh * KWH_PER_MMBTU
  // $/therm = $/kWh × kWh/therm
  const effectiveCostPerTherm = effectiveCostPerKwh * KWH_PER_THERM

  // Break-even electricity rate (where R = 1, i.e., free heating)
  const breakevenRate = (dailyBTC * btcMetrics.btcPrice) / dailyKwh

  // Determine status
  let status: 'profitable' | 'subsidized' | 'loss'
  if (R >= 1) {
    status = 'profitable'  // Mining covers all costs or more
  } else if (R > 0.5) {
    status = 'subsidized'  // Mining significantly reduces costs
  } else {
    status = 'loss'        // Still paying most of electricity cost
  }

  return {
    R,
    COPe,
    effectiveCostPerKwh,
    effectiveCostPerMMBTU,
    effectiveCostPerTherm,
    breakevenRate,
    dailyElectricityCost,
    dailyMiningRevenue,
    dailyBTC,
    monthlyBTC,
    monthlySats,
    status,
  }
}

/**
 * Calculate arbitrage/savings compared to traditional heating.
 *
 * @param fuelType - Traditional heating fuel type
 * @param fuelRate - Fuel cost per unit ($/therm, $/gallon, etc.) - for electric types, this should be the electricity rate
 * @param electricityRate - Electricity rate in $/kWh (for miner)
 * @param miner - Miner specifications
 * @param btcMetrics - Current BTC network metrics
 * @param monthlyHeatKwh - Estimated monthly heat consumption in kWh (default: 1500 kWh)
 * @param fuelEfficiency - Fuel efficiency: AFUE (0-1) for combustion, COP for heat pump, 1.0 for electric resistance
 * @returns Arbitrage calculation result
 */
export function calculateArbitrage(
  fuelType: FuelType,
  fuelRate: number,
  electricityRate: number,
  miner: MinerSpec,
  btcMetrics: BTCMetrics,
  monthlyHeatKwh: number = 1500,
  fuelEfficiency?: number
): ArbitrageResult {
  const fuel = FUEL_SPECS[fuelType]

  // Traditional heating cost per kWh of heat delivered
  // Cost = (kWh × BTU/kWh) / (BTU/unit × efficiency) × $/unit
  const btuNeeded = BTU_PER_KWH  // BTU per kWh of heat
  // Use provided efficiency, or fall back to default for the fuel type
  // Electric resistance always uses 1.0 (100% efficient)
  const efficiency = fuelType === 'electric_resistance'
    ? 1.0
    : (fuelEfficiency ?? fuel.typicalEfficiency)
  const fuelUnitsNeeded = btuNeeded / (fuel.btuPerUnit * efficiency)
  const traditionalCostPerKwh = fuelUnitsNeeded * fuelRate

  // Hashrate heating cost per kWh (net after BTC revenue)
  const copeResult = calculateCOPe(electricityRate, miner, btcMetrics)
  const hashrateCostPerKwh = copeResult.effectiveCostPerKwh

  // Savings calculation
  const savingsPercent = traditionalCostPerKwh > 0
    ? ((traditionalCostPerKwh - hashrateCostPerKwh) / traditionalCostPerKwh) * 100
    : 0

  // Monthly/annual savings based on estimated heat consumption
  const monthlySavings = (traditionalCostPerKwh - hashrateCostPerKwh) * monthlyHeatKwh
  const annualSavings = monthlySavings * 12

  return {
    traditionalCostPerKwh,
    hashrateCostPerKwh,
    savingsPercent,
    monthlySavings,
    annualSavings,
  }
}

/**
 * Calculate break-even electricity rate for a target COPe.
 *
 * @param targetCOPe - Desired COPe (e.g., 3.0 to match heat pump)
 * @param miner - Miner specifications
 * @param btcMetrics - Current BTC network metrics
 * @returns Maximum electricity rate to achieve target COPe
 */
export function calculateBreakevenForCOPe(
  targetCOPe: number,
  miner: MinerSpec,
  btcMetrics: BTCMetrics
): number {
  // COPe = 1 / (1 - R)
  // R = 1 - 1/COPe
  // R = dailyMiningRevenue / dailyElectricityCost
  // rate = dailyMiningRevenue / (dailyKwh × (1 - 1/COPe))

  const targetR = 1 - (1 / targetCOPe)
  const dailyKwh = (miner.powerW / 1000) * 24
  const dailyBTC = calculateDailyBTC(miner.hashrateTH, btcMetrics)
  const dailyMiningRevenue = dailyBTC * btcMetrics.btcPrice

  // R = dailyMiningRevenue / (dailyKwh × rate)
  // rate = dailyMiningRevenue / (dailyKwh × R)
  const maxRate = dailyMiningRevenue / (dailyKwh * targetR)

  return maxRate
}

/**
 * Get miner efficiency in J/TH (Joules per Terahash).
 */
export function getMinerEfficiency(miner: MinerSpec): number {
  // J/TH = (Watts × 1) / TH/s = W/TH = J/TH
  return miner.powerW / miner.hashrateTH
}

/**
 * Format COPe for display.
 */
export function formatCOPe(cope: number): string {
  if (!isFinite(cope)) {
    return '∞ (Free)'
  }
  if (cope < 0) {
    return 'Paid to heat!'
  }
  return cope.toFixed(2)
}
