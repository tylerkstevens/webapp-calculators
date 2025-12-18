/**
 * Existing building analysis - Calculate HLC from utility bills.
 *
 * This module analyzes buildings with historical heating fuel consumption data
 * to determine their heat loss characteristics.
 */

import {
  FuelType,
  MonthlyBillData,
  HLCCalibrationResult,
} from '../types/audit'

import {
  fuelToKwh,
  HOURS_PER_MONTH,
  BTU_PER_KWH,
} from './conversions'

// ============================================================================
// Heat Delivered Calculation
// ============================================================================

/**
 * Calculate actual heat delivered to building from fuel consumption.
 * Accounts for heating system efficiency (AFUE).
 *
 * @param fuelQuantity - Amount of fuel consumed
 * @param fuelType - Type of fuel
 * @param afue - Annual Fuel Utilization Efficiency (0.0-1.0)
 * @returns Heat delivered in kWh
 */
export function calculateHeatDelivered(
  fuelQuantity: number,
  fuelType: FuelType,
  afue: number = 1.0
): number {
  if (afue <= 0 || afue > 1.0) {
    throw new Error(`AFUE must be between 0 and 1, got ${afue}`)
  }

  // Convert to kWh
  const energyKwh = fuelToKwh(fuelQuantity, fuelType)

  // Adjust for efficiency
  const heatDeliveredKwh = energyKwh * afue

  return heatDeliveredKwh
}

// ============================================================================
// HLC Calculation from Bills
// ============================================================================

/**
 * Calculate HLC for a single month from heat delivered and HDD.
 * HLC_HDD = heat_delivered / HDD
 *
 * @param heatDeliveredKwh - Heat delivered to space in kWh
 * @param hddReference - Heating degree days for that month
 * @returns HLC in kWh/(°F-day), or null if HDD is zero/negligible
 */
export function calculateMonthlyHLC(
  heatDeliveredKwh: number,
  hddReference: number
): number | null {
  // Avoid division by zero and filter out non-heating months
  if (hddReference < 1.0) {
    return null
  }

  // HLC_HDD = energy / degree-days
  const hlcHdd = heatDeliveredKwh / hddReference

  return hlcHdd
}

/**
 * Calculate monthly HLC values from utility bills.
 *
 * @param monthlyBills - List of monthly bill data (12 months)
 * @param afue - Heating system efficiency (0.0-1.0)
 * @returns List of HLC values in kWh/(°F-day) for each month (null for non-heating months)
 */
export function calculateHLCFromBills(
  monthlyBills: MonthlyBillData[],
  afue: number = 1.0
): (number | null)[] {
  if (monthlyBills.length !== 12) {
    throw new Error(`Expected 12 months of data, got ${monthlyBills.length}`)
  }

  const monthlyHLC: (number | null)[] = []

  for (const bill of monthlyBills) {
    // Calculate heat delivered accounting for efficiency
    const heatDelivered = calculateHeatDelivered(
      bill.fuelQuantity,
      bill.fuelType,
      afue
    )

    // Calculate HLC for this month
    const hlc = calculateMonthlyHLC(heatDelivered, bill.hddReference)
    monthlyHLC.push(hlc)
  }

  return monthlyHLC
}

// ============================================================================
// Outlier Detection
// ============================================================================

/**
 * Calculate quartiles for an array of numbers.
 */
function calculateQuartiles(values: number[]): { q1: number; q3: number } {
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length

  const q1Index = Math.floor(n * 0.25)
  const q3Index = Math.floor(n * 0.75)

  return {
    q1: sorted[q1Index],
    q3: sorted[q3Index],
  }
}

/**
 * Detect outliers using Interquartile Range (IQR) method.
 * Outliers are values below Q1 - (multiplier × IQR) or above Q3 + (multiplier × IQR).
 *
 * @param values - List of numeric values
 * @param multiplier - IQR multiplier (1.5 is standard)
 * @returns List of booleans, true if value is an outlier
 */
export function detectOutliersIQR(
  values: number[],
  multiplier: number = 1.5
): boolean[] {
  if (values.length < 4) {
    // Not enough data for meaningful IQR
    return values.map(() => false)
  }

  const { q1, q3 } = calculateQuartiles(values)
  const iqr = q3 - q1

  const lowerBound = q1 - (multiplier * iqr)
  const upperBound = q3 + (multiplier * iqr)

  return values.map(v => v < lowerBound || v > upperBound)
}

/**
 * Calculate median of an array.
 */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

/**
 * Calculate mean of an array.
 */
function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

// ============================================================================
// HLC Calibration
// ============================================================================

/**
 * Calibrate HLC by selecting representative value from monthly data.
 *
 * This function:
 * 1. Excludes shoulder months (low HDD)
 * 2. Optionally detects and excludes statistical outliers
 * 3. Calculates median or mean of remaining values
 * 4. Converts to multiple unit systems
 *
 * @param monthlyHLC - List of monthly HLC values (kWh/(°F-day))
 * @param monthlyBills - Original bill data (for HDD values)
 * @param method - 'median' (default) or 'mean'
 * @param excludeOutliers - Whether to exclude statistical outliers
 * @param hddThreshold - Minimum HDD to be considered a heating month
 * @returns HLCCalibrationResult with calibrated values
 */
export function calibrateHLC(
  monthlyHLC: (number | null)[],
  monthlyBills: MonthlyBillData[],
  method: 'median' | 'mean' = 'median',
  excludeOutliers: boolean = true,
  hddThreshold: number = 100.0
): HLCCalibrationResult {
  const excludedMonths: number[] = []
  const validValues: number[] = []
  const validIndices: number[] = []

  // Collect valid HLC values (exclude shoulder months)
  for (let i = 0; i < 12; i++) {
    const hlc = monthlyHLC[i]
    const bill = monthlyBills[i]

    if (hlc === null || bill.hddReference < hddThreshold) {
      excludedMonths.push(i)
      continue
    }

    validValues.push(hlc)
    validIndices.push(i)
  }

  if (validValues.length < 3) {
    throw new Error(
      `Insufficient valid heating months for calibration. Need at least 3, got ${validValues.length}`
    )
  }

  // Optionally detect and exclude outliers
  let finalValues = validValues
  if (excludeOutliers && validValues.length >= 4) {
    const outliers = detectOutliersIQR(validValues)

    for (let i = 0; i < outliers.length; i++) {
      if (outliers[i]) {
        excludedMonths.push(validIndices[i])
      }
    }

    finalValues = validValues.filter((_, i) => !outliers[i])
  }

  if (finalValues.length === 0) {
    throw new Error('All heating months were excluded as outliers')
  }

  // Calculate calibrated HLC
  const hlcHddCalibrated = method === 'median' ? median(finalValues) : mean(finalValues)

  // Convert to rate-based (kW/°F) - divide by 24 hours
  const hlcRateCalibrated = hlcHddCalibrated / 24

  // Convert to BTU/h/°F
  const hlcBtuCalibrated = hlcRateCalibrated * BTU_PER_KWH

  // Calculate annual heat from historical HDD
  const annualHdd = monthlyBills.reduce((sum, b) => sum + b.hddReference, 0)
  const annualHeatKwh = hlcHddCalibrated * annualHdd

  return {
    hlcHdd: hlcHddCalibrated,
    hlcRate: hlcRateCalibrated,
    hlcBtu: hlcBtuCalibrated,
    monthlyHlcValues: monthlyHLC,
    excludedMonths: [...new Set(excludedMonths)].sort((a, b) => a - b),
    method,
    annualHeatKwh,
  }
}

// ============================================================================
// Monthly Heat Load Profile Generation
// ============================================================================

/**
 * Generate monthly heat load profile using HLC and historical HDD data.
 *
 * @param hlcHdd - Calibrated heat loss coefficient in kWh/(°F-day)
 * @param hddHistorical - Historical average HDD for each month (12 values)
 * @returns Monthly heat load in kWh for each month (12 values)
 */
export function generateHeatLoadProfile(
  hlcHdd: number,
  hddHistorical: number[]
): number[] {
  if (hddHistorical.length !== 12) {
    throw new Error(`Expected 12 months of HDD data, got ${hddHistorical.length}`)
  }

  return hddHistorical.map(hdd => hlcHdd * hdd)
}

/**
 * Calculate average heating power (rate) for each month.
 *
 * @param monthlyHeatLoad - Monthly heat energy in kWh (12 values)
 * @returns Average heating power in kW for each month (12 values)
 */
export function calculateAverageMonthlyPower(monthlyHeatLoad: number[]): number[] {
  return monthlyHeatLoad.map((heatKwh, i) => heatKwh / HOURS_PER_MONTH[i])
}

// ============================================================================
// Summary Statistics
// ============================================================================

/**
 * Calculate annual heating statistics.
 */
export function calculateAnnualTotals(monthlyHeatLoad: number[]): {
  annualKwh: number
  coldestMonth: number
  coldestMonthKwh: number
  peakAveragePowerKw: number
} {
  const annualKwh = monthlyHeatLoad.reduce((sum, load) => sum + load, 0)
  const maxLoad = Math.max(...monthlyHeatLoad)
  const coldestMonthIdx = monthlyHeatLoad.indexOf(maxLoad)
  const coldestMonth = coldestMonthIdx + 1  // 1-indexed

  const avgPower = calculateAverageMonthlyPower(monthlyHeatLoad)
  const peakAveragePowerKw = Math.max(...avgPower)

  return {
    annualKwh,
    coldestMonth,
    coldestMonthKwh: monthlyHeatLoad[coldestMonthIdx],
    peakAveragePowerKw,
  }
}

// ============================================================================
// Helper: Create empty bill data
// ============================================================================

/**
 * Create initial empty bill data for 12 months.
 */
export function createEmptyBillData(
  fuelType: FuelType,
  hddData: number[]
): MonthlyBillData[] {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    fuelQuantity: 0,
    fuelType,
    totalCost: 0,
    hddReference: hddData[i] || 0,
  }))
}
