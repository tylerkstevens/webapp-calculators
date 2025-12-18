/**
 * Regional fuel prices by US state/region.
 * Data sourced from EIA (Energy Information Administration) averages.
 *
 * These are approximate averages - actual prices vary by provider and season.
 * Users should override with their actual rates for accurate calculations.
 */

export interface StateFuelPrices {
  electricity: number    // $/kWh
  naturalGas: number     // $/therm
  propane: number        // $/gallon
  heatingOil: number     // $/gallon
}

export interface StateInfo {
  name: string
  abbr: string
  prices: StateFuelPrices
}

// US National averages (fallback)
export const NATIONAL_AVERAGE: StateFuelPrices = {
  electricity: 0.16,
  naturalGas: 1.20,
  propane: 2.75,
  heatingOil: 3.80,
}

// State-level fuel prices (EIA data approximations)
// Prices as of late 2024 / early 2025
export const STATE_FUEL_PRICES: Record<string, StateInfo> = {
  AL: { name: 'Alabama', abbr: 'AL', prices: { electricity: 0.14, naturalGas: 1.15, propane: 2.60, heatingOil: 3.70 } },
  AK: { name: 'Alaska', abbr: 'AK', prices: { electricity: 0.24, naturalGas: 1.50, propane: 3.50, heatingOil: 4.20 } },
  AZ: { name: 'Arizona', abbr: 'AZ', prices: { electricity: 0.14, naturalGas: 1.30, propane: 2.80, heatingOil: 3.90 } },
  AR: { name: 'Arkansas', abbr: 'AR', prices: { electricity: 0.12, naturalGas: 1.10, propane: 2.50, heatingOil: 3.60 } },
  CA: { name: 'California', abbr: 'CA', prices: { electricity: 0.27, naturalGas: 1.80, propane: 3.20, heatingOil: 4.50 } },
  CO: { name: 'Colorado', abbr: 'CO', prices: { electricity: 0.14, naturalGas: 1.00, propane: 2.60, heatingOil: 3.80 } },
  CT: { name: 'Connecticut', abbr: 'CT', prices: { electricity: 0.26, naturalGas: 1.60, propane: 3.30, heatingOil: 4.00 } },
  DE: { name: 'Delaware', abbr: 'DE', prices: { electricity: 0.14, naturalGas: 1.30, propane: 2.90, heatingOil: 3.85 } },
  FL: { name: 'Florida', abbr: 'FL', prices: { electricity: 0.15, naturalGas: 1.40, propane: 2.80, heatingOil: 3.90 } },
  GA: { name: 'Georgia', abbr: 'GA', prices: { electricity: 0.13, naturalGas: 1.20, propane: 2.70, heatingOil: 3.75 } },
  HI: { name: 'Hawaii', abbr: 'HI', prices: { electricity: 0.43, naturalGas: 4.50, propane: 4.50, heatingOil: 5.00 } },
  ID: { name: 'Idaho', abbr: 'ID', prices: { electricity: 0.11, naturalGas: 1.10, propane: 2.70, heatingOil: 3.80 } },
  IL: { name: 'Illinois', abbr: 'IL', prices: { electricity: 0.15, naturalGas: 1.00, propane: 2.50, heatingOil: 3.70 } },
  IN: { name: 'Indiana', abbr: 'IN', prices: { electricity: 0.14, naturalGas: 1.00, propane: 2.45, heatingOil: 3.65 } },
  IA: { name: 'Iowa', abbr: 'IA', prices: { electricity: 0.13, naturalGas: 1.05, propane: 2.30, heatingOil: 3.60 } },
  KS: { name: 'Kansas', abbr: 'KS', prices: { electricity: 0.14, naturalGas: 1.10, propane: 2.40, heatingOil: 3.65 } },
  KY: { name: 'Kentucky', abbr: 'KY', prices: { electricity: 0.12, naturalGas: 1.10, propane: 2.50, heatingOil: 3.60 } },
  LA: { name: 'Louisiana', abbr: 'LA', prices: { electricity: 0.12, naturalGas: 1.00, propane: 2.40, heatingOil: 3.50 } },
  ME: { name: 'Maine', abbr: 'ME', prices: { electricity: 0.20, naturalGas: 1.70, propane: 3.20, heatingOil: 3.90 } },
  MD: { name: 'Maryland', abbr: 'MD', prices: { electricity: 0.15, naturalGas: 1.30, propane: 2.90, heatingOil: 3.85 } },
  MA: { name: 'Massachusetts', abbr: 'MA', prices: { electricity: 0.26, naturalGas: 1.70, propane: 3.40, heatingOil: 4.10 } },
  MI: { name: 'Michigan', abbr: 'MI', prices: { electricity: 0.18, naturalGas: 1.00, propane: 2.50, heatingOil: 3.70 } },
  MN: { name: 'Minnesota', abbr: 'MN', prices: { electricity: 0.14, naturalGas: 1.00, propane: 2.30, heatingOil: 3.65 } },
  MS: { name: 'Mississippi', abbr: 'MS', prices: { electricity: 0.12, naturalGas: 1.10, propane: 2.50, heatingOil: 3.55 } },
  MO: { name: 'Missouri', abbr: 'MO', prices: { electricity: 0.13, naturalGas: 1.05, propane: 2.40, heatingOil: 3.60 } },
  MT: { name: 'Montana', abbr: 'MT', prices: { electricity: 0.12, naturalGas: 1.00, propane: 2.60, heatingOil: 3.75 } },
  NE: { name: 'Nebraska', abbr: 'NE', prices: { electricity: 0.12, naturalGas: 1.00, propane: 2.35, heatingOil: 3.60 } },
  NV: { name: 'Nevada', abbr: 'NV', prices: { electricity: 0.14, naturalGas: 1.30, propane: 2.80, heatingOil: 3.90 } },
  NH: { name: 'New Hampshire', abbr: 'NH', prices: { electricity: 0.22, naturalGas: 1.70, propane: 3.30, heatingOil: 4.00 } },
  NJ: { name: 'New Jersey', abbr: 'NJ', prices: { electricity: 0.18, naturalGas: 1.20, propane: 3.00, heatingOil: 3.95 } },
  NM: { name: 'New Mexico', abbr: 'NM', prices: { electricity: 0.14, naturalGas: 1.00, propane: 2.60, heatingOil: 3.80 } },
  NY: { name: 'New York', abbr: 'NY', prices: { electricity: 0.22, naturalGas: 1.50, propane: 3.20, heatingOil: 4.10 } },
  NC: { name: 'North Carolina', abbr: 'NC', prices: { electricity: 0.13, naturalGas: 1.20, propane: 2.70, heatingOil: 3.70 } },
  ND: { name: 'North Dakota', abbr: 'ND', prices: { electricity: 0.11, naturalGas: 0.90, propane: 2.20, heatingOil: 3.55 } },
  OH: { name: 'Ohio', abbr: 'OH', prices: { electricity: 0.14, naturalGas: 1.00, propane: 2.40, heatingOil: 3.65 } },
  OK: { name: 'Oklahoma', abbr: 'OK', prices: { electricity: 0.12, naturalGas: 1.00, propane: 2.35, heatingOil: 3.55 } },
  OR: { name: 'Oregon', abbr: 'OR', prices: { electricity: 0.12, naturalGas: 1.20, propane: 2.80, heatingOil: 3.90 } },
  PA: { name: 'Pennsylvania', abbr: 'PA', prices: { electricity: 0.16, naturalGas: 1.20, propane: 2.90, heatingOil: 3.90 } },
  RI: { name: 'Rhode Island', abbr: 'RI', prices: { electricity: 0.24, naturalGas: 1.70, propane: 3.40, heatingOil: 4.05 } },
  SC: { name: 'South Carolina', abbr: 'SC', prices: { electricity: 0.13, naturalGas: 1.20, propane: 2.65, heatingOil: 3.65 } },
  SD: { name: 'South Dakota', abbr: 'SD', prices: { electricity: 0.12, naturalGas: 1.00, propane: 2.30, heatingOil: 3.60 } },
  TN: { name: 'Tennessee', abbr: 'TN', prices: { electricity: 0.12, naturalGas: 1.10, propane: 2.55, heatingOil: 3.60 } },
  TX: { name: 'Texas', abbr: 'TX', prices: { electricity: 0.13, naturalGas: 1.00, propane: 2.40, heatingOil: 3.60 } },
  UT: { name: 'Utah', abbr: 'UT', prices: { electricity: 0.11, naturalGas: 1.00, propane: 2.60, heatingOil: 3.80 } },
  VT: { name: 'Vermont', abbr: 'VT', prices: { electricity: 0.20, naturalGas: 1.70, propane: 3.25, heatingOil: 4.00 } },
  VA: { name: 'Virginia', abbr: 'VA', prices: { electricity: 0.13, naturalGas: 1.20, propane: 2.75, heatingOil: 3.75 } },
  WA: { name: 'Washington', abbr: 'WA', prices: { electricity: 0.11, naturalGas: 1.30, propane: 2.90, heatingOil: 4.00 } },
  WV: { name: 'West Virginia', abbr: 'WV', prices: { electricity: 0.12, naturalGas: 1.10, propane: 2.60, heatingOil: 3.70 } },
  WI: { name: 'Wisconsin', abbr: 'WI', prices: { electricity: 0.15, naturalGas: 1.00, propane: 2.35, heatingOil: 3.65 } },
  WY: { name: 'Wyoming', abbr: 'WY', prices: { electricity: 0.11, naturalGas: 0.95, propane: 2.50, heatingOil: 3.70 } },
}

// Get sorted list of states for dropdown
export const STATES_LIST = Object.values(STATE_FUEL_PRICES).sort((a, b) =>
  a.name.localeCompare(b.name)
)

/**
 * Get fuel prices for a state, with national average fallback.
 */
export function getStatePrices(stateAbbr: string | null): StateFuelPrices {
  if (stateAbbr && STATE_FUEL_PRICES[stateAbbr]) {
    return STATE_FUEL_PRICES[stateAbbr].prices
  }
  return NATIONAL_AVERAGE
}

/**
 * Get the appropriate unit label for a fuel type.
 */
export function getFuelUnit(fuelType: string): string {
  switch (fuelType) {
    case 'natural_gas':
      return '$/therm'
    case 'propane':
    case 'heating_oil':
      return '$/gallon'
    case 'electric_resistance':
    case 'heat_pump':
      return '$/kWh'
    default:
      return '$/unit'
  }
}

/**
 * Get the default rate for a fuel type from state prices.
 */
export function getDefaultFuelRate(fuelType: string, prices: StateFuelPrices): number {
  switch (fuelType) {
    case 'natural_gas':
      return prices.naturalGas
    case 'propane':
      return prices.propane
    case 'heating_oil':
      return prices.heatingOil
    case 'electric_resistance':
    case 'heat_pump':
      return prices.electricity
    default:
      return 0
  }
}
