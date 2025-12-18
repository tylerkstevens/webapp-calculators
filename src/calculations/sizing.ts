/**
 * Miner sizing and selection for heating applications.
 *
 * This module determines heating system capacity requirements and selects
 * bitcoin miners based on baseload and extreme sizing methodologies.
 */

import {
  SizingMethod,
  SizingResult,
  MonthlySizingProfile,
  MinerSpec,
  HeatingApplication,
} from '../types/audit'

import { HOURS_PER_MONTH } from './conversions'

// ============================================================================
// Default Miner Database
// ============================================================================

export const DEFAULT_MINERS: MinerSpec[] = [
  {
    modelName: 'Heat Core HS05',
    maxPowerKw: 5.0,
    hashrateTh: 228,
    costUsd: 4999,
    heatingApplications: ['forced_air', 'hydronic'],
  },
  {
    modelName: 'Heat Core HS03',
    maxPowerKw: 3.0,
    hashrateTh: 136,
    costUsd: 2999,
    heatingApplications: ['forced_air', 'hydronic'],
  },
  {
    modelName: 'Antminer S21 Hydro',
    maxPowerKw: 5.3,
    hashrateTh: 335,
    costUsd: 5500,
    heatingApplications: ['hydronic'],
  },
  {
    modelName: 'Generic 3kW Unit',
    maxPowerKw: 3.0,
    hashrateTh: 150,
    costUsd: 3000,
    heatingApplications: ['forced_air', 'hydronic', 'radiant'],
  },
]

// ============================================================================
// Baseload Sizing
// ============================================================================

/**
 * Calculate baseload sizing from monthly heat load profile.
 * Baseload = average power in coldest month (month with highest heat load).
 * This optimizes for high utilization (>90% duty cycle in coldest month).
 *
 * @param monthlyHeatLoad - Heat load in kWh for each month (12 values)
 * @returns Baseload capacity in kW
 */
export function calculateBaseloadSizing(monthlyHeatLoad: number[]): number {
  if (monthlyHeatLoad.length !== 12) {
    throw new Error(`Expected 12 months of data, got ${monthlyHeatLoad.length}`)
  }

  // Find coldest month (highest heat load)
  const coldestMonthIdx = monthlyHeatLoad.indexOf(Math.max(...monthlyHeatLoad))
  const coldestMonthLoad = monthlyHeatLoad[coldestMonthIdx]

  // Calculate average power for that month
  const hours = HOURS_PER_MONTH[coldestMonthIdx]
  const baseloadKw = coldestMonthLoad / hours

  return baseloadKw
}

/**
 * Identify the coldest month (1-indexed).
 */
export function identifyColdestMonth(monthlyHeatLoad: number[]): number {
  const coldestIdx = monthlyHeatLoad.indexOf(Math.max(...monthlyHeatLoad))
  return coldestIdx + 1  // Convert to 1-indexed
}

// ============================================================================
// Extreme Sizing
// ============================================================================

/**
 * Calculate extreme sizing based on ASHRAE 99% design condition.
 * Extreme sizing = HLC × (T_target - T_design_99%)
 * This represents traditional HVAC sizing approach.
 *
 * @param hlcRate - Heat loss coefficient in kW/°F
 * @param targetTemp - Target indoor temperature (°F)
 * @param designTemp99 - ASHRAE 99% design temperature (°F)
 * @returns Extreme capacity in kW
 */
export function calculateExtremeSizing(
  hlcRate: number,
  targetTemp: number,
  designTemp99: number
): number {
  const deltaT = targetTemp - designTemp99
  const extremeKw = hlcRate * deltaT
  return extremeKw
}

// ============================================================================
// Miner Selection
// ============================================================================

/**
 * Filter miners compatible with heating application.
 */
export function filterCompatibleMiners(
  miners: MinerSpec[],
  application: HeatingApplication
): MinerSpec[] {
  return miners.filter(m => m.heatingApplications.includes(application))
}

/**
 * Calculate miner efficiency in W/TH.
 */
export function getMinerEfficiency(miner: MinerSpec): number {
  return miner.hashrateTh > 0 ? (miner.maxPowerKw * 1000) / miner.hashrateTh : 0
}

/**
 * Calculate miner cost per TH.
 */
export function getMinerCostPerTh(miner: MinerSpec): number {
  return miner.hashrateTh > 0 ? miner.costUsd / miner.hashrateTh : 0
}

/**
 * Select optimal miner for required power.
 *
 * @param requiredPowerKw - Required heating power in kW
 * @param availableMiners - List of available miner models
 * @param optimization - Optimization criterion
 * @returns Selected miner, or null if no suitable miners
 */
export function selectMiner(
  requiredPowerKw: number,
  availableMiners: MinerSpec[],
  optimization: 'cost_per_th' | 'efficiency' | 'power_match' = 'cost_per_th'
): MinerSpec | null {
  if (availableMiners.length === 0) {
    return null
  }

  // Filter miners that can meet requirement with reasonable quantity (<= 10 units)
  const suitableMiners = availableMiners.filter(
    m => m.maxPowerKw > 0 && (requiredPowerKw / m.maxPowerKw) <= 10
  )

  if (suitableMiners.length === 0) {
    return null
  }

  // Select based on optimization criterion
  switch (optimization) {
    case 'cost_per_th':
      return suitableMiners.reduce((best, m) =>
        getMinerCostPerTh(m) < getMinerCostPerTh(best) ? m : best
      )
    case 'efficiency':
      return suitableMiners.reduce((best, m) =>
        getMinerEfficiency(m) < getMinerEfficiency(best) ? m : best
      )
    case 'power_match':
      return suitableMiners.reduce((best, m) =>
        Math.abs(m.maxPowerKw - requiredPowerKw) < Math.abs(best.maxPowerKw - requiredPowerKw) ? m : best
      )
    default:
      return suitableMiners[0]
  }
}

/**
 * Calculate number of miners needed to meet power requirement.
 */
export function calculateMinerQuantity(requiredPowerKw: number, miner: MinerSpec): number {
  return Math.ceil(requiredPowerKw / miner.maxPowerKw)
}

/**
 * Create sizing result with all calculated values.
 */
export function createSizingResult(
  sizingType: SizingMethod,
  requiredPowerKw: number,
  miner: MinerSpec | null,
  quantity: number
): SizingResult {
  if (miner === null) {
    return {
      sizingType,
      requiredPowerKw,
      totalCapacityKw: 0,
      totalHashrateTh: 0,
      totalCostUsd: 0,
      capacityUtilization: 0,
      minerQuantity: 0,
    }
  }

  const totalCapacity = miner.maxPowerKw * quantity
  const totalHashrate = miner.hashrateTh * quantity
  const totalCost = miner.costUsd * quantity
  const utilization = totalCapacity > 0 ? (requiredPowerKw / totalCapacity) * 100 : 0

  return {
    sizingType,
    requiredPowerKw,
    totalCapacityKw: totalCapacity,
    totalHashrateTh: totalHashrate,
    totalCostUsd: totalCost,
    capacityUtilization: utilization,
    minerQuantity: quantity,
  }
}

/**
 * Complete system sizing: select miner and calculate quantities.
 */
export function sizeSystem(
  requiredPowerKw: number,
  availableMiners: MinerSpec[],
  sizingType: SizingMethod = 'baseload',
  optimization: 'cost_per_th' | 'efficiency' | 'power_match' = 'cost_per_th'
): SizingResult {
  const miner = selectMiner(requiredPowerKw, availableMiners, optimization)

  if (miner === null) {
    return createSizingResult(sizingType, requiredPowerKw, null, 0)
  }

  const quantity = calculateMinerQuantity(requiredPowerKw, miner)
  return createSizingResult(sizingType, requiredPowerKw, miner, quantity)
}

// ============================================================================
// Monthly Duty Cycle Calculations
// ============================================================================

/**
 * Calculate duty cycle for each month.
 * Duty cycle = average_power / total_capacity
 *
 * @param monthlyHeatLoad - Heat load in kWh for each month (12 values)
 * @param totalCapacityKw - Total installed miner capacity
 * @returns List of duty cycles (0-1) for each month
 */
export function calculateMonthlyDutyCycles(
  monthlyHeatLoad: number[],
  totalCapacityKw: number
): number[] {
  return monthlyHeatLoad.map((heatKwh, i) => {
    const hours = HOURS_PER_MONTH[i]
    const avgPower = heatKwh / hours
    return totalCapacityKw > 0 ? Math.min(avgPower / totalCapacityKw, 1.0) : 0
  })
}

/**
 * Calculate effective hashrate accounting for duty cycle.
 */
export function calculateEffectiveHashrate(dutyCycle: number, maxHashrateTh: number): number {
  return dutyCycle * maxHashrateTh
}

/**
 * Generate monthly sizing profile with duty cycles.
 */
export function generateMonthlySizingProfile(
  monthlyHeatLoad: number[],
  sizingResult: SizingResult
): MonthlySizingProfile[] {
  const dutyCycles = calculateMonthlyDutyCycles(
    monthlyHeatLoad,
    sizingResult.totalCapacityKw
  )

  return monthlyHeatLoad.map((heatKwh, i) => {
    const avgPower = heatKwh / HOURS_PER_MONTH[i]
    const effectiveHashrate = calculateEffectiveHashrate(
      dutyCycles[i],
      sizingResult.totalHashrateTh
    )

    return {
      month: i + 1,
      heatLoadKwh: heatKwh,
      averagePowerKw: avgPower,
      dutyCycle: dutyCycles[i],
      effectiveHashrateTh: effectiveHashrate,
    }
  })
}

// ============================================================================
// Summary Statistics
// ============================================================================

/**
 * Calculate annual average statistics.
 */
export function calculateAnnualAverages(monthlyProfiles: MonthlySizingProfile[]): {
  annualHeatKwh: number
  averageDutyCycle: number
  averageHashrateTh: number
  peakDutyCycle: number
} {
  const totalHeat = monthlyProfiles.reduce((sum, p) => sum + p.heatLoadKwh, 0)
  const avgDutyCycle = monthlyProfiles.reduce((sum, p) => sum + p.dutyCycle, 0) / 12
  const avgHashrate = monthlyProfiles.reduce((sum, p) => sum + p.effectiveHashrateTh, 0) / 12
  const peakDutyCycle = Math.max(...monthlyProfiles.map(p => p.dutyCycle))

  return {
    annualHeatKwh: totalHeat,
    averageDutyCycle: avgDutyCycle,
    averageHashrateTh: avgHashrate,
    peakDutyCycle,
  }
}

/**
 * Check if system can meet heating demand without backup.
 * Returns months where duty cycle exceeds 100%.
 */
export function checkCapacityShortfall(monthlyProfiles: MonthlySizingProfile[]): number[] {
  return monthlyProfiles
    .filter(p => p.dutyCycle >= 1.0)
    .map(p => p.month)
}

/**
 * Calculate annual operating hours at full capacity.
 */
export function calculateAnnualOperatingHours(monthlyProfiles: MonthlySizingProfile[]): number {
  return monthlyProfiles.reduce((total, p, i) => {
    return total + (p.dutyCycle * HOURS_PER_MONTH[i])
  }, 0)
}
