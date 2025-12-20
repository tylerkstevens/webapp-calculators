/**
 * Regional fuel prices by country and region.
 * Data sourced from EIA (US) and Statistics Canada / NRCan (Canada).
 *
 * These are approximate averages - actual prices vary by provider and season.
 * Users should override with their actual rates for accurate calculations.
 */

// Country codes
export type Country = 'US' | 'CA'

// Base fuel prices interface (used by both countries)
export interface RegionalFuelPrices {
  electricity: number    // $/kWh (local currency)
  naturalGas: number     // $/therm (US) or $/GJ (CA)
  propane: number        // $/gallon (US) or $/litre (CA)
  heatingOil: number     // $/gallon (US) or $/litre (CA)
  woodPellets?: number   // $/ton (optional, more common in Canada)
}

export interface RegionInfo {
  name: string
  code: string
  prices: RegionalFuelPrices
}

// Country metadata
export interface CountryInfo {
  name: string
  currency: string
  currencySymbol: string
  units: {
    naturalGas: string
    propane: string
    heatingOil: string
    woodPellets: string
  }
  regions: Record<string, RegionInfo>
  nationalAverage: RegionalFuelPrices
}

// Legacy aliases for backwards compatibility
export type StateFuelPrices = RegionalFuelPrices
export interface StateInfo {
  name: string
  abbr: string
  prices: StateFuelPrices
}

// US National averages (fallback)
// Sources: EIA Electric Power Monthly, EIA Natural Gas Monthly, EIA Heating Oil and Propane Update
export const US_NATIONAL_AVERAGE: RegionalFuelPrices = {
  electricity: 0.17,
  naturalGas: 2.00,   // $/therm (EIA average ~$24.56/Mcf ÷ 10)
  propane: 2.60,
  heatingOil: 3.80,
  woodPellets: 280,  // $/ton
}

// Legacy alias
export const NATIONAL_AVERAGE = US_NATIONAL_AVERAGE

// Canada National averages (fallback) - in CAD
// Natural gas is delivered residential rate (includes distribution/transmission)
export const CANADA_NATIONAL_AVERAGE: RegionalFuelPrices = {
  electricity: 0.17,      // CAD/kWh
  naturalGas: 13.80,      // CAD/GJ (delivered residential, not wholesale AECO-C)
  propane: 0.99,          // CAD/litre
  heatingOil: 1.55,       // CAD/litre
  woodPellets: 350,       // CAD/ton
}

// State-level fuel prices (EIA data approximations)
// Sources: EIA Electric Power Monthly, EIA Natural Gas Monthly, EIA Heating Oil and Propane Update
// Prices as of late 2024 / early 2025
export const STATE_FUEL_PRICES: Record<string, StateInfo> = {
  AL: { name: 'Alabama', abbr: 'AL', prices: { electricity: 0.14, naturalGas: 1.85, propane: 2.60, heatingOil: 3.70 } },
  AK: { name: 'Alaska', abbr: 'AK', prices: { electricity: 0.23, naturalGas: 2.20, propane: 3.50, heatingOil: 4.20 } },
  AZ: { name: 'Arizona', abbr: 'AZ', prices: { electricity: 0.14, naturalGas: 1.95, propane: 2.80, heatingOil: 3.90 } },
  AR: { name: 'Arkansas', abbr: 'AR', prices: { electricity: 0.10, naturalGas: 1.75, propane: 2.10, heatingOil: 3.60 } },
  CA: { name: 'California', abbr: 'CA', prices: { electricity: 0.27, naturalGas: 2.50, propane: 3.20, heatingOil: 4.50 } },
  CO: { name: 'Colorado', abbr: 'CO', prices: { electricity: 0.14, naturalGas: 1.65, propane: 2.40, heatingOil: 3.80 } },
  CT: { name: 'Connecticut', abbr: 'CT', prices: { electricity: 0.22, naturalGas: 2.30, propane: 3.40, heatingOil: 4.00 } },
  DE: { name: 'Delaware', abbr: 'DE', prices: { electricity: 0.14, naturalGas: 2.00, propane: 3.20, heatingOil: 3.85 } },
  FL: { name: 'Florida', abbr: 'FL', prices: { electricity: 0.14, naturalGas: 2.10, propane: 2.80, heatingOil: 3.90 } },
  GA: { name: 'Georgia', abbr: 'GA', prices: { electricity: 0.13, naturalGas: 1.90, propane: 2.70, heatingOil: 3.75 } },
  HI: { name: 'Hawaii', abbr: 'HI', prices: { electricity: 0.41, naturalGas: 5.50, propane: 4.50, heatingOil: 5.00 } },
  ID: { name: 'Idaho', abbr: 'ID', prices: { electricity: 0.10, naturalGas: 1.70, propane: 2.30, heatingOil: 3.80 } },
  IL: { name: 'Illinois', abbr: 'IL', prices: { electricity: 0.15, naturalGas: 1.60, propane: 2.10, heatingOil: 3.70 } },
  IN: { name: 'Indiana', abbr: 'IN', prices: { electricity: 0.14, naturalGas: 1.60, propane: 2.05, heatingOil: 3.65 } },
  IA: { name: 'Iowa', abbr: 'IA', prices: { electricity: 0.13, naturalGas: 1.65, propane: 2.00, heatingOil: 3.60 } },
  KS: { name: 'Kansas', abbr: 'KS', prices: { electricity: 0.14, naturalGas: 1.70, propane: 2.10, heatingOil: 3.65 } },
  KY: { name: 'Kentucky', abbr: 'KY', prices: { electricity: 0.12, naturalGas: 1.75, propane: 2.20, heatingOil: 3.60 } },
  LA: { name: 'Louisiana', abbr: 'LA', prices: { electricity: 0.10, naturalGas: 1.60, propane: 2.20, heatingOil: 3.50 } },
  ME: { name: 'Maine', abbr: 'ME', prices: { electricity: 0.20, naturalGas: 2.40, propane: 3.40, heatingOil: 3.90 } },
  MD: { name: 'Maryland', abbr: 'MD', prices: { electricity: 0.15, naturalGas: 2.00, propane: 3.20, heatingOil: 3.85 } },
  MA: { name: 'Massachusetts', abbr: 'MA', prices: { electricity: 0.22, naturalGas: 2.40, propane: 3.50, heatingOil: 4.10 } },
  MI: { name: 'Michigan', abbr: 'MI', prices: { electricity: 0.18, naturalGas: 1.60, propane: 2.10, heatingOil: 3.70 } },
  MN: { name: 'Minnesota', abbr: 'MN', prices: { electricity: 0.14, naturalGas: 1.60, propane: 2.00, heatingOil: 3.65 } },
  MS: { name: 'Mississippi', abbr: 'MS', prices: { electricity: 0.12, naturalGas: 1.75, propane: 2.30, heatingOil: 3.55 } },
  MO: { name: 'Missouri', abbr: 'MO', prices: { electricity: 0.13, naturalGas: 1.65, propane: 2.10, heatingOil: 3.60 } },
  MT: { name: 'Montana', abbr: 'MT', prices: { electricity: 0.12, naturalGas: 1.60, propane: 2.30, heatingOil: 3.75 } },
  NE: { name: 'Nebraska', abbr: 'NE', prices: { electricity: 0.12, naturalGas: 1.60, propane: 2.00, heatingOil: 2.75 } },
  NV: { name: 'Nevada', abbr: 'NV', prices: { electricity: 0.14, naturalGas: 1.95, propane: 2.60, heatingOil: 3.90 } },
  NH: { name: 'New Hampshire', abbr: 'NH', prices: { electricity: 0.22, naturalGas: 2.40, propane: 3.50, heatingOil: 4.00 } },
  NJ: { name: 'New Jersey', abbr: 'NJ', prices: { electricity: 0.18, naturalGas: 1.90, propane: 3.30, heatingOil: 3.95 } },
  NM: { name: 'New Mexico', abbr: 'NM', prices: { electricity: 0.14, naturalGas: 1.60, propane: 2.40, heatingOil: 3.80 } },
  NY: { name: 'New York', abbr: 'NY', prices: { electricity: 0.22, naturalGas: 2.20, propane: 3.40, heatingOil: 4.10 } },
  NC: { name: 'North Carolina', abbr: 'NC', prices: { electricity: 0.13, naturalGas: 1.90, propane: 2.70, heatingOil: 3.70 } },
  ND: { name: 'North Dakota', abbr: 'ND', prices: { electricity: 0.10, naturalGas: 1.50, propane: 1.90, heatingOil: 3.55 } },
  OH: { name: 'Ohio', abbr: 'OH', prices: { electricity: 0.14, naturalGas: 1.60, propane: 2.15, heatingOil: 3.65 } },
  OK: { name: 'Oklahoma', abbr: 'OK', prices: { electricity: 0.10, naturalGas: 1.60, propane: 2.10, heatingOil: 3.55 } },
  OR: { name: 'Oregon', abbr: 'OR', prices: { electricity: 0.12, naturalGas: 1.85, propane: 2.60, heatingOil: 3.90 } },
  PA: { name: 'Pennsylvania', abbr: 'PA', prices: { electricity: 0.16, naturalGas: 1.90, propane: 3.20, heatingOil: 3.90 } },
  RI: { name: 'Rhode Island', abbr: 'RI', prices: { electricity: 0.22, naturalGas: 2.40, propane: 3.50, heatingOil: 4.05 } },
  SC: { name: 'South Carolina', abbr: 'SC', prices: { electricity: 0.13, naturalGas: 1.90, propane: 2.55, heatingOil: 3.65 } },
  SD: { name: 'South Dakota', abbr: 'SD', prices: { electricity: 0.12, naturalGas: 1.60, propane: 1.95, heatingOil: 3.60 } },
  TN: { name: 'Tennessee', abbr: 'TN', prices: { electricity: 0.12, naturalGas: 1.80, propane: 2.40, heatingOil: 3.60 } },
  TX: { name: 'Texas', abbr: 'TX', prices: { electricity: 0.13, naturalGas: 1.60, propane: 2.20, heatingOil: 3.60 } },
  UT: { name: 'Utah', abbr: 'UT', prices: { electricity: 0.11, naturalGas: 1.50, propane: 2.40, heatingOil: 3.80 } },
  VT: { name: 'Vermont', abbr: 'VT', prices: { electricity: 0.20, naturalGas: 2.40, propane: 3.40, heatingOil: 4.00 } },
  VA: { name: 'Virginia', abbr: 'VA', prices: { electricity: 0.13, naturalGas: 1.90, propane: 2.80, heatingOil: 3.75 } },
  WA: { name: 'Washington', abbr: 'WA', prices: { electricity: 0.10, naturalGas: 1.95, propane: 2.70, heatingOil: 4.00 } },
  WV: { name: 'West Virginia', abbr: 'WV', prices: { electricity: 0.12, naturalGas: 1.75, propane: 2.50, heatingOil: 3.70 } },
  WI: { name: 'Wisconsin', abbr: 'WI', prices: { electricity: 0.15, naturalGas: 1.60, propane: 2.00, heatingOil: 3.65 } },
  WY: { name: 'Wyoming', abbr: 'WY', prices: { electricity: 0.11, naturalGas: 1.55, propane: 2.30, heatingOil: 3.70 } },
}

// Get sorted list of states for dropdown
export const STATES_LIST = Object.values(STATE_FUEL_PRICES).sort((a, b) =>
  a.name.localeCompare(b.name)
)

// Canadian provincial fuel prices (Statistics Canada / NRCan data)
// Natural gas prices are delivered residential rates (includes commodity + distribution)
// Sources: Canadian Gas Association, Natural Resources Canada, Statistics Canada
// Prices in CAD as of late 2024 / early 2025
export const PROVINCE_FUEL_PRICES: Record<string, RegionInfo> = {
  AB: { name: 'Alberta', code: 'AB', prices: { electricity: 0.18, naturalGas: 11.50, propane: 0.85, heatingOil: 1.55, woodPellets: 320 } },
  BC: { name: 'British Columbia', code: 'BC', prices: { electricity: 0.13, naturalGas: 13.00, propane: 0.95, heatingOil: 1.78, woodPellets: 340 } },
  MB: { name: 'Manitoba', code: 'MB', prices: { electricity: 0.10, naturalGas: 10.50, propane: 0.88, heatingOil: 1.50, woodPellets: 330 } },
  NB: { name: 'New Brunswick', code: 'NB', prices: { electricity: 0.14, naturalGas: 18.00, propane: 1.05, heatingOil: 1.55, woodPellets: 360 } },
  NL: { name: 'Newfoundland and Labrador', code: 'NL', prices: { electricity: 0.14, naturalGas: 20.00, propane: 1.15, heatingOil: 1.60, woodPellets: 380 } },
  NS: { name: 'Nova Scotia', code: 'NS', prices: { electricity: 0.18, naturalGas: 18.50, propane: 1.10, heatingOil: 1.58, woodPellets: 365 } },
  NT: { name: 'Northwest Territories', code: 'NT', prices: { electricity: 0.38, naturalGas: 16.00, propane: 1.40, heatingOil: 1.90, woodPellets: 450 } },
  NU: { name: 'Nunavut', code: 'NU', prices: { electricity: 0.55, naturalGas: 25.00, propane: 1.90, heatingOil: 2.30, woodPellets: 600 } },
  ON: { name: 'Ontario', code: 'ON', prices: { electricity: 0.15, naturalGas: 14.00, propane: 0.95, heatingOil: 1.52, woodPellets: 350 } },
  PE: { name: 'Prince Edward Island', code: 'PE', prices: { electricity: 0.18, naturalGas: 19.00, propane: 1.08, heatingOil: 1.55, woodPellets: 370 } },
  QC: { name: 'Quebec', code: 'QC', prices: { electricity: 0.08, naturalGas: 15.50, propane: 0.98, heatingOil: 1.48, woodPellets: 340 } },
  SK: { name: 'Saskatchewan', code: 'SK', prices: { electricity: 0.19, naturalGas: 11.00, propane: 0.82, heatingOil: 1.45, woodPellets: 325 } },
  YT: { name: 'Yukon', code: 'YT', prices: { electricity: 0.16, naturalGas: 17.00, propane: 1.30, heatingOil: 1.80, woodPellets: 420 } },
}

// Get sorted list of provinces for dropdown
export const PROVINCES_LIST = Object.values(PROVINCE_FUEL_PRICES).sort((a, b) =>
  a.name.localeCompare(b.name)
)

// Country definitions with all metadata
export const COUNTRIES: Record<Country, CountryInfo> = {
  US: {
    name: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    units: {
      naturalGas: '$/therm',
      propane: '$/gallon',
      heatingOil: '$/gallon',
      woodPellets: '$/ton',
    },
    regions: STATE_FUEL_PRICES as unknown as Record<string, RegionInfo>,
    nationalAverage: US_NATIONAL_AVERAGE,
  },
  CA: {
    name: 'Canada',
    currency: 'CAD',
    currencySymbol: 'C$',
    units: {
      naturalGas: 'C$/GJ',
      propane: 'C$/litre',
      heatingOil: 'C$/litre',
      woodPellets: 'C$/ton',
    },
    regions: PROVINCE_FUEL_PRICES,
    nationalAverage: CANADA_NATIONAL_AVERAGE,
  },
}

// Get list of regions for a country
export function getRegionsList(country: Country): RegionInfo[] {
  return Object.values(COUNTRIES[country].regions).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
}

// Get currency symbol for a country
export function getCurrencySymbol(country: Country): string {
  return COUNTRIES[country].currencySymbol
}

/**
 * Get fuel prices for a region, with national average fallback.
 */
export function getRegionPrices(country: Country, regionCode: string | null): RegionalFuelPrices {
  const countryData = COUNTRIES[country]
  if (regionCode && countryData.regions[regionCode]) {
    return countryData.regions[regionCode].prices
  }
  return countryData.nationalAverage
}

/**
 * Get fuel prices for a US state, with national average fallback.
 * @deprecated Use getRegionPrices instead
 */
export function getStatePrices(stateAbbr: string | null): StateFuelPrices {
  return getRegionPrices('US', stateAbbr)
}

/**
 * Get the appropriate unit label for a fuel type.
 */
export function getFuelUnit(fuelType: string, country: Country = 'US'): string {
  const symbol = COUNTRIES[country].currencySymbol

  switch (fuelType) {
    case 'natural_gas':
      return country === 'US' ? '$/therm' : 'C$/GJ'
    case 'propane':
      return country === 'US' ? '$/gallon' : 'C$/litre'
    case 'heating_oil':
      return country === 'US' ? '$/gallon' : 'C$/litre'
    case 'wood_pellets':
      return country === 'US' ? '$/ton' : 'C$/ton'
    case 'electric_resistance':
    case 'heat_pump':
      return country === 'US' ? '$/kWh' : 'C$/kWh'
    default:
      return `${symbol}/unit`
  }
}

/**
 * Get the default rate for a fuel type from regional prices.
 */
export function getDefaultFuelRate(fuelType: string, prices: RegionalFuelPrices): number {
  switch (fuelType) {
    case 'natural_gas':
      return prices.naturalGas
    case 'propane':
      return prices.propane
    case 'heating_oil':
      return prices.heatingOil
    case 'wood_pellets':
      return prices.woodPellets ?? 300
    case 'electric_resistance':
    case 'heat_pump':
      return prices.electricity
    default:
      return 0
  }
}

// Energy content conversions by country
// These are used to convert fuel rates to $/kWh equivalent for comparison
export const ENERGY_CONVERSIONS = {
  US: {
    naturalGas: 29.307,    // kWh per therm
    propane: 26.82,        // kWh per gallon
    heatingOil: 40.59,     // kWh per gallon
    woodPellets: 4836,     // kWh per ton (~16.5M BTU/ton)
  },
  CA: {
    naturalGas: 277.78,    // kWh per GJ
    propane: 7.08,         // kWh per litre
    heatingOil: 10.73,     // kWh per litre
    woodPellets: 4836,     // kWh per ton (same as US)
  },
}

// Typical heating equipment efficiencies
export const FUEL_EFFICIENCIES: Record<string, number> = {
  natural_gas: 0.92,       // Condensing furnace
  propane: 0.90,           // High-efficiency furnace
  heating_oil: 0.85,       // Oil furnace
  wood_pellets: 0.80,      // Pellet stove
  electric_resistance: 1.0, // Baseboard/space heater
  heat_pump: 3.0,          // COP (coefficient of performance)
}
