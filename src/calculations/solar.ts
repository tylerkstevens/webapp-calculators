/**
 * Solar monetization calculations - Mining revenue from solar production.
 *
 * Core formula: monthly_sats = (kWh × 1000 / efficiency_J_TH) × (hashvalue_sats / 24)
 *
 * This calculator answers: "What if all my solar energy was mined?"
 * Only miner efficiency matters - not power or hashrate individually.
 */

import { MinerSpec, MINER_PRESETS, DEFAULT_CUSTOM_MINER } from './hashrate'

// ============================================================================
// Constants
// ============================================================================

export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

// ============================================================================
// Types
// ============================================================================

export interface SolarMiningResult {
  // Solar production
  annualProductionKwh: number
  monthlyProductionKwh: number[]

  // Mining revenue
  monthlyBtc: number
  annualBtc: number
  monthlyUsd: number
  annualUsd: number

  // Monthly breakdown
  monthlyBtcBreakdown: number[]
  monthlyUsdBreakdown: number[]

  // Efficiency metrics
  effectiveRevenuePerKwh: number  // $/kWh earned from mining
  btcPerKwh: number               // sats earned per kWh
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

// ============================================================================
// Re-export miner presets
// ============================================================================

export { MINER_PRESETS, DEFAULT_CUSTOM_MINER }
export type { MinerSpec }

// ============================================================================
// Core Calculation
// ============================================================================

/**
 * Calculate BTC revenue from kWh using the rate-based formula.
 *
 * Formula: sats = (kWh × 1000 / efficiency_J_TH) × (hashvalue_sats / 24)
 *
 * This treats kWh as average power over the period, converting to equivalent
 * hashrate, then multiplying by hashvalue to get revenue.
 *
 * @param kwh - Energy in kilowatt-hours
 * @param efficiencyJTH - Miner efficiency in J/TH (watts per terahash)
 * @param hashvalueSats - Hashvalue in sats/TH/day
 * @param days - Number of days in the period
 * @returns BTC earned
 */
export function calculateBtcFromKwh(
  kwh: number,
  efficiencyJTH: number,
  hashvalueSats: number,
  days: number
): number {
  if (kwh <= 0 || efficiencyJTH <= 0 || hashvalueSats <= 0 || days <= 0) {
    return 0
  }

  const totalHours = days * 24
  // Average power in watts over the period
  const avgPowerW = (kwh * 1000) / totalHours
  // Equivalent hashrate at this power level
  const avgHashrateTH = avgPowerW / efficiencyJTH
  // BTC earned (hashvalue is sats/TH/day)
  const sats = avgHashrateTH * hashvalueSats * days
  return sats / 1e8
}

// ============================================================================
// Main Calculation Functions
// ============================================================================

/**
 * Calculate complete solar mining results.
 *
 * @param annualProductionKwh - Annual solar production in kWh
 * @param monthlyProductionKwh - Monthly production breakdown (12 values)
 * @param miner - Miner specifications (only efficiency is used)
 * @param hashvalueSats - Hashvalue in sats/TH/day
 * @param btcPrice - Current BTC price in USD
 * @returns Complete solar mining calculation results
 */
export function calculateSolarMining(
  annualProductionKwh: number,
  monthlyProductionKwh: number[],
  miner: MinerSpec,
  hashvalueSats: number,
  btcPrice: number
): SolarMiningResult {
  // Calculate efficiency from miner specs
  const efficiencyJTH = miner.powerW / miner.hashrateTH

  // Calculate monthly BTC breakdown directly from kWh
  const monthlyBtcBreakdown = monthlyProductionKwh.map((kwh, i) => {
    return calculateBtcFromKwh(kwh, efficiencyJTH, hashvalueSats, DAYS_IN_MONTH[i])
  })

  // Convert to USD
  const monthlyUsdBreakdown = monthlyBtcBreakdown.map(btc => btc * btcPrice)

  // Annual totals
  const annualBtc = monthlyBtcBreakdown.reduce((sum, btc) => sum + btc, 0)
  const annualUsd = annualBtc * btcPrice
  const monthlyBtc = annualBtc / 12
  const monthlyUsd = annualUsd / 12

  // Efficiency metrics
  const effectiveRevenuePerKwh = annualProductionKwh > 0 ? annualUsd / annualProductionKwh : 0
  const btcPerKwh = annualProductionKwh > 0 ? (annualBtc / annualProductionKwh) * 1e8 : 0

  return {
    annualProductionKwh,
    monthlyProductionKwh,
    monthlyBtc,
    annualBtc,
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
 * @param miner - Miner specifications (only efficiency is used)
 * @param hashvalueSats - Hashvalue in sats/TH/day
 * @param btcPrice - Current BTC price in USD
 * @returns Net metering vs mining comparison
 */
export function calculateNetMeteringComparison(
  excessKwh: number,
  netMeteringRate: number,
  miner: MinerSpec,
  hashvalueSats: number,
  btcPrice: number
): NetMeteringComparison {
  // Net metering revenue
  const netMeteringRevenue = excessKwh * netMeteringRate

  // Mining revenue using same kWh-based formula
  const efficiencyJTH = miner.powerW / miner.hashrateTH
  const miningBtc = calculateBtcFromKwh(excessKwh, efficiencyJTH, hashvalueSats, 365)
  const miningRevenue = miningBtc * btcPrice

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

/**
 * Calculate monthly BTC breakdown for excess energy.
 *
 * @param monthlyExportKwh - Monthly excess kWh (12 values)
 * @param miner - Miner specifications
 * @param hashvalueSats - Hashvalue in sats/TH/day
 * @param btcPrice - Current BTC price in USD
 * @returns Object with monthly BTC and USD arrays
 */
export function calculateMonthlyExcessMining(
  monthlyExportKwh: number[],
  miner: MinerSpec,
  hashvalueSats: number,
  btcPrice: number
): { monthlyBtc: number[], monthlyUsd: number[] } {
  const efficiencyJTH = miner.powerW / miner.hashrateTH

  const monthlyBtc = monthlyExportKwh.map((kwh, i) => {
    return calculateBtcFromKwh(kwh, efficiencyJTH, hashvalueSats, DAYS_IN_MONTH[i])
  })

  const monthlyUsd = monthlyBtc.map(btc => btc * btcPrice)

  return { monthlyBtc, monthlyUsd }
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format BTC value for display.
 */
export function formatBtc(btc: number): string {
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
