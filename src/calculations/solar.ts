/**
 * Solar monetization calculations - Mining revenue from solar production.
 *
 * These calculations help users understand the potential bitcoin mining
 * revenue from their solar PV system.
 */

import { MinerSpec, MINER_PRESETS, DEFAULT_CUSTOM_MINER } from './hashrate'

// ============================================================================
// Types
// ============================================================================

export interface SolarMiningResult {
  // Solar production
  annualProductionKwh: number
  monthlyProductionKwh: number[]
  avgSunHoursPerDay: number

  // Mining capacity
  maxMiners: number
  actualMiners: number
  totalPowerW: number
  totalHashrateTH: number
  utilizationPercent: number   // % of solar capacity used for mining

  // Mining revenue
  dailyBtc: number
  monthlyBtc: number
  annualBtc: number
  dailyUsd: number
  monthlyUsd: number
  annualUsd: number

  // Monthly breakdown
  monthlyBtcBreakdown: number[]
  monthlyUsdBreakdown: number[]

  // Efficiency metrics
  effectiveRevenuePerKwh: number  // $/kWh earned from mining
  btcPerKwh: number               // BTC earned per kWh (in sats)
}

export interface NetMeteringComparison {
  // Net metering revenue
  excessKwh: number
  netMeteringRate: number
  netMeteringRevenue: number

  // Mining revenue (from excess only)
  miningRevenue: number
  miningBtc: number

  // Comparison
  advantageUsd: number           // Mining revenue - net metering revenue
  advantageMultiplier: number    // Mining revenue / net metering revenue
  recommendMining: boolean       // true if mining is more profitable
}

export interface BTCMetrics {
  btcPrice: number
  networkHashrate: number   // TH/s
  blockReward: number       // 3.125 BTC
}

// ============================================================================
// Re-export miner presets
// ============================================================================

export { MINER_PRESETS, DEFAULT_CUSTOM_MINER }
export type { MinerSpec }

// ============================================================================
// Core Calculations
// ============================================================================

/**
 * Calculate daily BTC mining based on hashrate and sun hours.
 *
 * @param hashrateTH - Total hashrate in TH/s
 * @param sunHoursPerDay - Average sun hours per day
 * @param btcMetrics - Current BTC network metrics
 * @returns Daily BTC earned
 */
export function calculateDailySolarBtc(
  hashrateTH: number,
  sunHoursPerDay: number,
  btcMetrics: BTCMetrics
): number {
  // Blocks per day (approximately 144)
  const blocksPerDay = 144

  // User's share of network hashrate
  const userShare = hashrateTH / btcMetrics.networkHashrate

  // Daily BTC if running 24 hours
  const dailyBtc24h = userShare * blocksPerDay * btcMetrics.blockReward

  // Adjust for sun hours (only mining during daylight)
  const dailyBtc = dailyBtc24h * (sunHoursPerDay / 24)

  return dailyBtc
}

/**
 * Calculate monthly BTC breakdown based on monthly sun hours.
 *
 * @param hashrateTH - Total hashrate in TH/s
 * @param monthlySunHours - Array of 12 monthly sun hours values
 * @param btcMetrics - Current BTC network metrics
 * @returns Array of 12 monthly BTC values
 */
export function calculateMonthlyBtcBreakdown(
  hashrateTH: number,
  monthlySunHours: number[],
  btcMetrics: BTCMetrics
): number[] {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

  return monthlySunHours.map((sunHours, index) => {
    const dailyBtc = calculateDailySolarBtc(hashrateTH, sunHours, btcMetrics)
    return dailyBtc * daysInMonth[index]
  })
}

/**
 * Calculate max miners a solar system can support.
 *
 * @param systemCapacityKw - Solar system size in kW
 * @param minerPowerW - Power per miner in watts
 * @returns Maximum number of miners
 */
export function calculateMaxMiners(
  systemCapacityKw: number,
  minerPowerW: number
): number {
  const systemWatts = systemCapacityKw * 1000
  return Math.floor(systemWatts / minerPowerW)
}

/**
 * Calculate sun hours from production data.
 *
 * @param annualKwh - Annual production in kWh
 * @param systemCapacityKw - System size in kW
 * @returns Average sun hours per day
 */
export function calculateSunHours(
  annualKwh: number,
  systemCapacityKw: number
): number {
  // sun_hours = annual_kwh / (system_kw * 365)
  return annualKwh / (systemCapacityKw * 365)
}

/**
 * Calculate complete solar mining results.
 *
 * @param systemCapacityKw - Solar system size in kW
 * @param annualProductionKwh - Annual solar production in kWh
 * @param monthlyProductionKwh - Monthly production breakdown (12 values)
 * @param monthlySunHours - Monthly sun hours (12 values)
 * @param miner - Miner specifications
 * @param minerQuantity - Number of miners to use
 * @param btcMetrics - Current BTC network metrics
 * @returns Complete solar mining calculation results
 */
export function calculateSolarMining(
  systemCapacityKw: number,
  annualProductionKwh: number,
  monthlyProductionKwh: number[],
  monthlySunHours: number[],
  miner: MinerSpec,
  minerQuantity: number,
  btcMetrics: BTCMetrics
): SolarMiningResult {
  // Calculate sun hours from production if not provided
  const avgSunHoursPerDay = calculateSunHours(annualProductionKwh, systemCapacityKw)

  // Mining capacity
  const maxMiners = calculateMaxMiners(systemCapacityKw, miner.powerW)
  const actualMiners = Math.min(minerQuantity, maxMiners)
  const totalPowerW = actualMiners * miner.powerW
  const totalHashrateTH = actualMiners * miner.hashrateTH
  const utilizationPercent = (totalPowerW / (systemCapacityKw * 1000)) * 100

  // Daily mining revenue
  const dailyBtc = calculateDailySolarBtc(totalHashrateTH, avgSunHoursPerDay, btcMetrics)
  const dailyUsd = dailyBtc * btcMetrics.btcPrice

  // Monthly breakdown
  const monthlyBtcBreakdown = calculateMonthlyBtcBreakdown(totalHashrateTH, monthlySunHours, btcMetrics)
  const monthlyUsdBreakdown = monthlyBtcBreakdown.map(btc => btc * btcMetrics.btcPrice)

  // Annual totals
  const annualBtc = monthlyBtcBreakdown.reduce((sum, btc) => sum + btc, 0)
  const annualUsd = annualBtc * btcMetrics.btcPrice
  const monthlyBtc = annualBtc / 12
  const monthlyUsd = annualUsd / 12

  // Efficiency metrics
  // How much kWh actually used for mining annually
  const annualMiningKwh = (totalPowerW / 1000) * avgSunHoursPerDay * 365
  const effectiveRevenuePerKwh = annualMiningKwh > 0 ? annualUsd / annualMiningKwh : 0
  const btcPerKwh = annualMiningKwh > 0 ? (annualBtc / annualMiningKwh) * 1e8 : 0 // in sats

  return {
    annualProductionKwh,
    monthlyProductionKwh,
    avgSunHoursPerDay,
    maxMiners,
    actualMiners,
    totalPowerW,
    totalHashrateTH,
    utilizationPercent,
    dailyBtc,
    monthlyBtc,
    annualBtc,
    dailyUsd,
    monthlyUsd,
    annualUsd,
    monthlyBtcBreakdown,
    monthlyUsdBreakdown,
    effectiveRevenuePerKwh,
    btcPerKwh,
  }
}

/**
 * Calculate net metering comparison for excess energy.
 *
 * @param excessKwh - Annual excess kWh sent to grid
 * @param netMeteringRate - Rate utility pays per kWh ($/kWh)
 * @param miner - Miner specifications
 * @param avgSunHoursPerDay - Average sun hours per day
 * @param btcMetrics - Current BTC network metrics
 * @returns Net metering vs mining comparison
 */
export function calculateNetMeteringComparison(
  excessKwh: number,
  netMeteringRate: number,
  miner: MinerSpec,
  avgSunHoursPerDay: number,
  btcMetrics: BTCMetrics
): NetMeteringComparison {
  // Net metering revenue
  const netMeteringRevenue = excessKwh * netMeteringRate

  // Calculate how many hours of mining the excess kWh represents
  const minerKwh = miner.powerW / 1000
  const miningHours = excessKwh / minerKwh

  // Calculate BTC mined during those hours
  // First, get hourly BTC rate based on sun hours model
  const dailyBtc = calculateDailySolarBtc(miner.hashrateTH, avgSunHoursPerDay, btcMetrics)
  const hourlyBtcRate = dailyBtc / avgSunHoursPerDay

  const miningBtc = hourlyBtcRate * miningHours
  const miningRevenue = miningBtc * btcMetrics.btcPrice

  // Comparison
  const advantageUsd = miningRevenue - netMeteringRevenue
  const advantageMultiplier = netMeteringRevenue > 0 ? miningRevenue / netMeteringRevenue : 0
  const recommendMining = miningRevenue > netMeteringRevenue

  return {
    excessKwh,
    netMeteringRate,
    netMeteringRevenue,
    miningRevenue,
    miningBtc,
    advantageUsd,
    advantageMultiplier,
    recommendMining,
  }
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format BTC value for display.
 */
export function formatBtc(btc: number, _decimals: number = 8): string {
  if (btc >= 1) {
    return btc.toFixed(4) + ' BTC'
  }
  const sats = Math.round(btc * 1e8)
  if (sats >= 1000000) {
    return (sats / 1000000).toFixed(2) + 'M sats'
  }
  if (sats >= 1000) {
    return (sats / 1000).toFixed(1) + 'k sats'
  }
  return sats.toLocaleString() + ' sats'
}

/**
 * Format USD value for display.
 */
export function formatUsd(usd: number): string {
  if (usd >= 1000) {
    return '$' + usd.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }
  return '$' + usd.toFixed(2)
}

/**
 * Format kWh value for display.
 */
export function formatKwh(kwh: number): string {
  if (kwh >= 1000) {
    return (kwh / 1000).toFixed(1) + ' MWh'
  }
  return kwh.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' kWh'
}

/**
 * Get month name from index (0-11).
 */
export function getMonthName(index: number, short: boolean = true): string {
  const months = short
    ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return months[index] || ''
}
