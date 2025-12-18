/**
 * Unit conversion functions for energy analysis.
 * All conversions are pure functions with no side effects.
 * Conversion factors are based on standard industry values.
 */

import { FuelType } from '../types/audit'

// ============================================================================
// Energy Conversion Constants
// ============================================================================

export const BTU_PER_THERM = 100_000
export const BTU_PER_KWH = 3_412
export const BTU_PER_GALLON_PROPANE = 91_500
export const BTU_PER_GALLON_OIL = 138_500
export const BTU_PER_CCF = 102_700  // CCF = hundred cubic feet of natural gas

export const KWH_PER_THERM = 29.3
export const KWH_PER_GALLON_PROPANE = 26.8
export const KWH_PER_GALLON_OIL = 40.6

// Satoshis per bitcoin
export const SATS_PER_BTC = 100_000_000

// Standard month/year constants
export const HOURS_PER_MONTH = [744, 672, 744, 720, 744, 720, 744, 744, 720, 744, 720, 744]
export const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
export const HOURS_PER_DAY = 24

// Air properties for infiltration calculations
export const AIR_HEAT_CAPACITY_FACTOR = 1.08  // BTU/h per CFM per °F

// ============================================================================
// Energy Conversions
// ============================================================================

const BTU_CONVERSIONS: Record<FuelType, number> = {
  therms: BTU_PER_THERM,
  kwh: BTU_PER_KWH,
  propane_gallons: BTU_PER_GALLON_PROPANE,
  oil_gallons: BTU_PER_GALLON_OIL,
  ccf: BTU_PER_CCF,
}

const KWH_CONVERSIONS: Record<FuelType, number> = {
  therms: KWH_PER_THERM,
  kwh: 1.0,
  propane_gallons: KWH_PER_GALLON_PROPANE,
  oil_gallons: KWH_PER_GALLON_OIL,
  ccf: BTU_PER_CCF / BTU_PER_KWH,
}

/**
 * Convert fuel quantity to BTU.
 */
export function fuelToBtu(quantity: number, fuelType: FuelType): number {
  return quantity * BTU_CONVERSIONS[fuelType]
}

/**
 * Convert fuel quantity to kWh.
 */
export function fuelToKwh(quantity: number, fuelType: FuelType): number {
  return quantity * KWH_CONVERSIONS[fuelType]
}

/**
 * Convert BTU to kWh.
 */
export function btuToKwh(btu: number): number {
  return btu / BTU_PER_KWH
}

/**
 * Convert kWh to BTU.
 */
export function kwhToBtu(kwh: number): number {
  return kwh * BTU_PER_KWH
}

// ============================================================================
// Power Conversions
// ============================================================================

/**
 * Convert BTU/h to kW.
 */
export function btuPerHourToKw(btuPerHour: number): number {
  return btuPerHour / BTU_PER_KWH
}

/**
 * Convert kW to BTU/h.
 */
export function kwToBtuPerHour(kw: number): number {
  return kw * BTU_PER_KWH
}

// ============================================================================
// HLC (Heat Loss Coefficient) Conversions
// ============================================================================

/**
 * Convert HLC from rate-based to HDD-based units.
 * HLC_rate (BTU/h/°F) × 24 h/day = HLC_HDD (BTU/(°F-day))
 */
export function hlcRateToHdd(hlcRateBtuPerHourPerF: number): number {
  return hlcRateBtuPerHourPerF * HOURS_PER_DAY
}

/**
 * Convert HLC from HDD-based to rate-based units.
 * HLC_HDD (BTU/(°F-day)) / 24 h/day = HLC_rate (BTU/h/°F)
 */
export function hlcHddToRate(hlcHddBtuPerFDay: number): number {
  return hlcHddBtuPerFDay / HOURS_PER_DAY
}

/**
 * Convert HLC from BTU/h/°F to kW/°F.
 */
export function hlcBtuToKw(hlcBtuPerHourPerF: number): number {
  return hlcBtuPerHourPerF / BTU_PER_KWH
}

/**
 * Convert HLC from kW/°F to BTU/h/°F.
 */
export function hlcKwToBtu(hlcKwPerF: number): number {
  return hlcKwPerF * BTU_PER_KWH
}

// ============================================================================
// Temperature Conversions
// ============================================================================

/**
 * Convert Fahrenheit to Celsius.
 */
export function fahrenheitToCelsius(fahrenheit: number): number {
  return (fahrenheit - 32) * 5 / 9
}

/**
 * Convert Celsius to Fahrenheit.
 */
export function celsiusToFahrenheit(celsius: number): number {
  return celsius * 9 / 5 + 32
}

// ============================================================================
// Bitcoin Conversions
// ============================================================================

/**
 * Convert satoshis to BTC.
 */
export function satsToBtc(sats: number): number {
  return sats / SATS_PER_BTC
}

/**
 * Convert BTC to satoshis.
 */
export function btcToSats(btc: number): number {
  return btc * SATS_PER_BTC
}

// ============================================================================
// Fuel Cost Conversions
// ============================================================================

/**
 * Convert fuel cost per unit to equivalent cost per kWh of heat delivered.
 * Accounts for heating system efficiency (AFUE).
 *
 * @param fuelPrice - Cost per unit of fuel ($/unit)
 * @param fuelType - Type of fuel
 * @param afue - Annual Fuel Utilization Efficiency (0.0-1.0), default 1.0
 * @returns Cost per kWh of heat delivered ($/kWh)
 */
export function fuelCostToKwhCost(
  fuelPrice: number,
  fuelType: FuelType,
  afue: number = 1.0
): number {
  if (afue <= 0 || afue > 1.0) {
    throw new Error(`AFUE must be between 0 and 1, got ${afue}`)
  }

  const kwhPerUnit = KWH_CONVERSIONS[fuelType]

  // Cost per kWh of fuel energy
  const costPerKwhEnergy = fuelPrice / kwhPerUnit

  // Adjust for efficiency (lower efficiency = higher cost per kWh delivered)
  const costPerKwhDelivered = costPerKwhEnergy / afue

  return costPerKwhDelivered
}

// ============================================================================
// Fuel Type Display Names
// ============================================================================

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  therms: 'Natural Gas (therms)',
  kwh: 'Electric (kWh)',
  propane_gallons: 'Propane (gallons)',
  oil_gallons: 'Heating Oil (gallons)',
  ccf: 'Natural Gas (CCF)',
}

export const FUEL_TYPE_UNITS: Record<FuelType, string> = {
  therms: 'therms',
  kwh: 'kWh',
  propane_gallons: 'gallons',
  oil_gallons: 'gallons',
  ccf: 'CCF',
}

// ============================================================================
// Typical AFUE Values by Fuel Type
// ============================================================================

export const TYPICAL_AFUE: Record<FuelType, number> = {
  therms: 0.85,         // Gas furnace
  kwh: 1.0,             // Electric resistance (or heat pump COP)
  propane_gallons: 0.85, // Propane furnace
  oil_gallons: 0.80,    // Oil furnace
  ccf: 0.85,            // Gas furnace
}
