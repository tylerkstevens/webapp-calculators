/**
 * Solar mining calculations - Estimate BTC mining potential from solar.
 *
 * These calculations help users understand how much Bitcoin they could
 * mine using their solar production.
 */

import { MinerSpec, BTCMetrics, MINER_PRESETS } from './hashrate'
import { AnnualSolarProfile } from '../api/solar'

// ============================================================================
// Types
// ============================================================================

export interface SolarMiningPotential {
  annualBtc: number           // Total annual BTC mined
  annualUsd: number           // Annual value in USD
  monthlyBtc: number[]        // BTC mined per month
  monthlyUsd: number[]        // USD value per month
  effectiveEarningsPerKwh: number  // $/kWh effective "payment" for solar
  hoursOfMiningPerDay: number[]    // Average mining hours per day by month
}

export interface ExcessSolarAnalysis {
  excessKwh: number           // Annual excess kWh
  currentCredits: number      // Current net metering credits ($)
  potentialBtc: number        // BTC if mined instead
  potentialUsd: number        // USD value of BTC
  opportunityCost: number     // Difference (potential - current)
  recommendation: 'mine' | 'grid' | 'neutral'
}

// ============================================================================
// Core Calculations
// ============================================================================

/**
 * Calculate daily BTC mining from hashrate.
 *
 * @param hashrateTH - Hashrate in TH/s
 * @param btcMetrics - Current BTC network metrics
 * @returns Daily BTC earned
 */
function calculateDailyBTC(hashrateTH: number, btcMetrics: BTCMetrics): number {
  const blocksPerDay = 144
  const userShare = hashrateTH / btcMetrics.networkHashrate
  return userShare * blocksPerDay * btcMetrics.blockReward
}

/**
 * Calculate mining potential from solar production.
 *
 * @param solarProfile - Annual solar production profile
 * @param systemSizeKw - Solar system size in kW
 * @param miner - Miner specifications
 * @param btcMetrics - Current BTC network metrics
 * @returns Solar mining potential breakdown
 */
export function calculateSolarMiningPotential(
  solarProfile: AnnualSolarProfile,
  systemSizeKw: number,
  miner: MinerSpec,
  btcMetrics: BTCMetrics
): SolarMiningPotential {
  const minerPowerKw = miner.powerW / 1000

  // Calculate monthly mining potential
  const monthlyBtc: number[] = []
  const monthlyUsd: number[] = []
  const hoursOfMiningPerDay: number[] = []

  const daysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

  for (let i = 0; i < 12; i++) {
    const avgDailySolarKwh = solarProfile.monthly[i].avgDailyKwh * systemSizeKw

    // How many hours per day can we run the miner?
    // If solar produces 20 kWh/day and miner uses 5 kW, we can run 4 hours
    const miningHoursPerDay = Math.min(avgDailySolarKwh / minerPowerKw, 24)
    hoursOfMiningPerDay.push(miningHoursPerDay)

    // Calculate daily BTC from full 24h operation
    const dailyBtcFull = calculateDailyBTC(miner.hashrateTH, btcMetrics)

    // Scale to actual mining hours
    const dailyBtcActual = dailyBtcFull * (miningHoursPerDay / 24)
    const monthlyBtcTotal = dailyBtcActual * daysPerMonth[i]

    monthlyBtc.push(monthlyBtcTotal)
    monthlyUsd.push(monthlyBtcTotal * btcMetrics.btcPrice)
  }

  // Calculate annual totals
  const annualBtc = monthlyBtc.reduce((sum, btc) => sum + btc, 0)
  const annualUsd = annualBtc * btcMetrics.btcPrice

  // Calculate effective earnings per kWh
  const annualSolarKwh = solarProfile.annualKwhPerKw * systemSizeKw
  const effectiveEarningsPerKwh = annualSolarKwh > 0 ? annualUsd / annualSolarKwh : 0

  return {
    annualBtc,
    annualUsd,
    monthlyBtc,
    monthlyUsd,
    effectiveEarningsPerKwh,
    hoursOfMiningPerDay,
  }
}

/**
 * Analyze excess solar potential - compare net metering to mining.
 *
 * @param annualExcessKwh - Annual excess kWh exported to grid
 * @param netMeteringRate - $/kWh credit for exported power
 * @param miner - Miner specifications
 * @param btcMetrics - Current BTC network metrics
 * @returns Excess solar analysis with recommendation
 */
export function analyzeExcessSolar(
  annualExcessKwh: number,
  netMeteringRate: number,
  miner: MinerSpec,
  btcMetrics: BTCMetrics
): ExcessSolarAnalysis {
  // Current value from net metering
  const currentCredits = annualExcessKwh * netMeteringRate

  // Mining potential from excess solar
  const minerPowerKw = miner.powerW / 1000

  // Assume excess is spread evenly across daylight hours (6h average)
  const avgExcessHoursPerDay = 6
  const avgDaysPerYear = 365

  // How many kWh excess per day on average?
  const avgDailyExcessKwh = annualExcessKwh / avgDaysPerYear

  // How many hours of mining can this support?
  const miningHoursPerDay = Math.min(avgDailyExcessKwh / minerPowerKw, avgExcessHoursPerDay)

  // BTC from mining
  const dailyBtcFull = calculateDailyBTC(miner.hashrateTH, btcMetrics)
  const dailyBtcActual = dailyBtcFull * (miningHoursPerDay / 24)
  const potentialBtc = dailyBtcActual * avgDaysPerYear
  const potentialUsd = potentialBtc * btcMetrics.btcPrice

  // Opportunity cost
  const opportunityCost = potentialUsd - currentCredits

  // Recommendation
  let recommendation: 'mine' | 'grid' | 'neutral'
  if (opportunityCost > currentCredits * 0.2) {
    recommendation = 'mine'  // Mining is >20% better
  } else if (opportunityCost < -currentCredits * 0.1) {
    recommendation = 'grid'  // Grid credits are >10% better
  } else {
    recommendation = 'neutral'
  }

  return {
    excessKwh: annualExcessKwh,
    currentCredits,
    potentialBtc,
    potentialUsd,
    opportunityCost,
    recommendation,
  }
}

/**
 * Calculate simple mining potential (no solar profile needed).
 *
 * @param annualSolarKwh - Annual solar production in kWh
 * @param miner - Miner specifications
 * @param btcMetrics - Current BTC network metrics
 * @returns Annual BTC and USD potential
 */
export function calculateSimpleMiningPotential(
  annualSolarKwh: number,
  miner: MinerSpec,
  btcMetrics: BTCMetrics
): { annualBtc: number; annualUsd: number; effectiveRate: number } {
  const minerPowerKw = miner.powerW / 1000

  // Total mining hours possible
  const totalMiningHours = annualSolarKwh / minerPowerKw

  // BTC per hour of mining
  const dailyBtc = calculateDailyBTC(miner.hashrateTH, btcMetrics)
  const btcPerHour = dailyBtc / 24

  // Annual totals
  const annualBtc = btcPerHour * totalMiningHours
  const annualUsd = annualBtc * btcMetrics.btcPrice
  const effectiveRate = annualSolarKwh > 0 ? annualUsd / annualSolarKwh : 0

  return {
    annualBtc,
    annualUsd,
    effectiveRate,
  }
}

/**
 * Get recommended miner for a given solar system size.
 *
 * @param systemSizeKw - Solar system size in kW
 * @returns Recommended miner and notes
 */
export function getRecommendedMiner(systemSizeKw: number): {
  miner: MinerSpec
  notes: string
} {
  // Sort miners by power
  const sortedMiners = [...MINER_PRESETS].sort((a, b) => a.powerW - b.powerW)

  // Average solar capacity factor is ~20%, so effective power is systemSizeKw * 0.2
  // But for mining, we want to maximize utilization during peak hours
  // A 10kW system produces ~40-50 kWh/day, peaking at ~7-8 kW
  // So we want a miner that can run at least 4-6 hours/day

  // Rule of thumb: miner power should be 50-80% of system size
  const targetPower = systemSizeKw * 0.6 * 1000 // watts

  // Find closest miner
  let bestMiner = sortedMiners[0]
  let bestDiff = Math.abs(bestMiner.powerW - targetPower)

  for (const miner of sortedMiners) {
    const diff = Math.abs(miner.powerW - targetPower)
    if (diff < bestDiff) {
      bestDiff = diff
      bestMiner = miner
    }
  }

  let notes: string
  if (bestMiner.powerW < targetPower * 0.5) {
    notes = 'Consider a larger miner to better utilize your solar capacity'
  } else if (bestMiner.powerW > targetPower * 1.5) {
    notes = 'This miner may require grid power during low-production periods'
  } else {
    notes = 'Good match for your solar system size'
  }

  return { miner: bestMiner, notes }
}

// Re-export types and presets from hashrate module
export { MINER_PRESETS } from './hashrate'
export type { MinerSpec, BTCMetrics } from './hashrate'
