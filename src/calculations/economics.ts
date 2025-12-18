/**
 * Economic analysis for bitcoin heating systems.
 *
 * This module implements the Freeze Frame economic analysis method:
 * - Current moment snapshot using current BTC price and hashvalue
 */

import {
  EconomicInputs,
  MonthlyEconomics,
  FreezeFrameResult,
} from '../types/audit'

import { HOURS_PER_MONTH, DAYS_PER_MONTH } from './conversions'

// ============================================================================
// Revenue Calculations
// ============================================================================

/**
 * Calculate BTC mining revenue for a month.
 *
 * @param effectiveHashrateTh - Effective hashrate in TH/s
 * @param hashpriceUsdPerThDay - Hashprice in $/TH/day
 * @param daysInMonth - Number of days in the month
 * @param poolFeePercent - Mining pool fee as decimal (0.02 = 2%)
 * @returns Tuple of [gross revenue, pool fee]
 */
export function calculateMonthlyBtcRevenue(
  effectiveHashrateTh: number,
  hashpriceUsdPerThDay: number,
  daysInMonth: number,
  poolFeePercent: number = 0.02
): { grossRevenue: number; poolFee: number } {
  // Gross revenue = hashrate × hashprice × days
  const grossRevenue = effectiveHashrateTh * hashpriceUsdPerThDay * daysInMonth

  // Pool fee
  const poolFee = grossRevenue * poolFeePercent

  return { grossRevenue, poolFee }
}

/**
 * Calculate value of heat delivered (fuel cost avoided).
 *
 * @param heatDeliveredKwh - Heat energy delivered in kWh
 * @param fuelCostPerKwh - Fuel cost per kWh of delivered heat
 * @returns Value of heat in dollars
 */
export function calculateMonthlyHeatingValue(
  heatDeliveredKwh: number,
  fuelCostPerKwh: number
): number {
  return heatDeliveredKwh * fuelCostPerKwh
}

/**
 * Calculate electricity cost for a month.
 *
 * @param powerKw - System power consumption in kW
 * @param hoursInMonth - Number of hours in the month
 * @param dutyCycle - Average duty cycle (0-1)
 * @param electricityRateKwh - Electricity rate in $/kWh
 * @returns Electricity cost in dollars
 */
export function calculateMonthlyElectricityCost(
  powerKw: number,
  hoursInMonth: number,
  dutyCycle: number,
  electricityRateKwh: number
): number {
  // Energy consumed = power × hours × duty cycle
  const energyKwh = powerKw * hoursInMonth * dutyCycle

  // Cost = energy × rate
  return energyKwh * electricityRateKwh
}

// ============================================================================
// Monthly Economics Calculation
// ============================================================================

/**
 * Calculate freeze frame economics for a single month.
 */
export function calculateFreezeFrameMonth(
  month: number,
  heatLoadKwh: number,
  dutyCycle: number,
  maxHashrateTh: number,
  powerKw: number,
  hoursInMonth: number,
  daysInMonth: number,
  hashpriceUsdPerThDay: number,
  fuelCostPerKwh: number,
  electricityRateKwh: number,
  poolFeePercent: number = 0.02
): MonthlyEconomics {
  // Effective hashrate accounting for duty cycle
  const effectiveHashrate = dutyCycle * maxHashrateTh

  // Revenue
  const { grossRevenue, poolFee } = calculateMonthlyBtcRevenue(
    effectiveHashrate,
    hashpriceUsdPerThDay,
    daysInMonth,
    poolFeePercent
  )
  const btcRevenueNet = grossRevenue - poolFee

  const heatingValue = calculateMonthlyHeatingValue(heatLoadKwh, fuelCostPerKwh)
  const totalRevenue = btcRevenueNet + heatingValue

  // Costs
  const electricityCost = calculateMonthlyElectricityCost(
    powerKw,
    hoursInMonth,
    dutyCycle,
    electricityRateKwh
  )

  const totalCost = electricityCost + poolFee

  // Profit
  const netProfit = totalRevenue - totalCost

  return {
    month,
    heatDeliveredKwh: heatLoadKwh,
    dutyCycle,
    effectiveHashrateTh: effectiveHashrate,
    btcRevenueUsd: btcRevenueNet,
    heatingValueUsd: heatingValue,
    totalRevenueUsd: totalRevenue,
    electricityCostUsd: electricityCost,
    poolFeeUsd: poolFee,
    totalCostUsd: totalCost,
    netProfitUsd: netProfit,
  }
}

// ============================================================================
// Freeze Frame Analysis
// ============================================================================

/**
 * Perform freeze frame economic analysis.
 * Uses current moment prices to calculate expected economics.
 *
 * @param inputs - Economic inputs with current prices
 * @returns FreezeFrameResult with monthly and annual economics
 */
export function analyzeFreezeFrame(inputs: EconomicInputs): FreezeFrameResult {
  // Validate inputs
  if (inputs.monthlyHeatLoadKwh.length !== 12) {
    throw new Error('monthlyHeatLoadKwh must have 12 values')
  }
  if (inputs.monthlyDutyCycles.length !== 12) {
    throw new Error('monthlyDutyCycles must have 12 values')
  }

  // Calculate monthly economics
  const monthlyResults: MonthlyEconomics[] = []

  for (let i = 0; i < 12; i++) {
    const monthResult = calculateFreezeFrameMonth(
      i + 1,
      inputs.monthlyHeatLoadKwh[i],
      inputs.monthlyDutyCycles[i],
      inputs.totalHashrateTh,
      inputs.totalPowerKw,
      HOURS_PER_MONTH[i],
      DAYS_PER_MONTH[i],
      inputs.hashpriceUsdPerThDay,
      inputs.fuelCostPerKwh,
      inputs.electricityRateKwh,
      inputs.poolFeePercent
    )
    monthlyResults.push(monthResult)
  }

  // Calculate annual totals
  const annualBtcRevenue = monthlyResults.reduce((sum, m) => sum + m.btcRevenueUsd, 0)
  const annualHeatingValue = monthlyResults.reduce((sum, m) => sum + m.heatingValueUsd, 0)
  const annualTotalRevenue = monthlyResults.reduce((sum, m) => sum + m.totalRevenueUsd, 0)
  const annualElectricityCost = monthlyResults.reduce((sum, m) => sum + m.electricityCostUsd, 0)
  const annualPoolFee = monthlyResults.reduce((sum, m) => sum + m.poolFeeUsd, 0)
  const annualTotalCost = monthlyResults.reduce((sum, m) => sum + m.totalCostUsd, 0)
  const annualNetProfit = monthlyResults.reduce((sum, m) => sum + m.netProfitUsd, 0)

  // Calculate revenue split
  const revenueSplitBtc = annualTotalRevenue > 0 ? (annualBtcRevenue / annualTotalRevenue) * 100 : 0
  const revenueSplitHeat = annualTotalRevenue > 0 ? (annualHeatingValue / annualTotalRevenue) * 100 : 0

  // Effective heating cost (net cost after BTC revenue)
  const totalHeatKwh = inputs.monthlyHeatLoadKwh.reduce((sum, kwh) => sum + kwh, 0)
  const netHeatingCost = annualElectricityCost - annualBtcRevenue
  const effectiveHeatingCostPerKwh = totalHeatKwh > 0 ? netHeatingCost / totalHeatKwh : 0

  // Simple payback
  let simplePaybackYears: number | null = null
  if (inputs.capitalCostUsd !== undefined && annualNetProfit > 0) {
    simplePaybackYears = inputs.capitalCostUsd / annualNetProfit
  }

  return {
    method: 'freeze_frame',
    monthlyEconomics: monthlyResults,
    annualBtcRevenueUsd: annualBtcRevenue,
    annualHeatingValueUsd: annualHeatingValue,
    annualTotalRevenueUsd: annualTotalRevenue,
    annualElectricityCostUsd: annualElectricityCost,
    annualPoolFeeUsd: annualPoolFee,
    annualTotalCostUsd: annualTotalCost,
    annualNetProfitUsd: annualNetProfit,
    revenueSplitBtcPct: revenueSplitBtc,
    revenueSplitHeatPct: revenueSplitHeat,
    effectiveHeatingCostPerKwh,
    simplePaybackYears,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate hashprice from hashvalue and BTC price.
 * hashprice ($/TH/day) = hashvalue (sats/TH/day) × btcPrice / 100,000,000
 */
export function calculateHashprice(hashvalueSats: number, btcPriceUsd: number): number {
  return (hashvalueSats * btcPriceUsd) / 100_000_000
}

/**
 * Calculate break-even electricity rate.
 * At this rate, BTC revenue exactly covers electricity cost.
 */
export function calculateBreakEvenElectricityRate(
  hashrateTh: number,
  hashpriceUsdPerThDay: number,
  powerKw: number,
  poolFeePercent: number = 0.02
): number {
  // Daily BTC revenue (net of pool fee)
  const dailyBtcRevenue = hashrateTh * hashpriceUsdPerThDay * (1 - poolFeePercent)

  // Daily electricity consumption (kWh)
  const dailyKwh = powerKw * 24

  // Break-even rate = revenue / consumption
  return dailyKwh > 0 ? dailyBtcRevenue / dailyKwh : 0
}

/**
 * Format currency value for display.
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Format percentage for display.
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Calculate annual totals from monthly data.
 */
export function calculateAnnualFromMonthly(monthlyValues: number[]): number {
  return monthlyValues.reduce((sum, v) => sum + v, 0)
}
