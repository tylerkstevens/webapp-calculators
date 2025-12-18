/**
 * TypeScript interfaces for Exergy Audit calculations
 */

// ============================================================================
// Enums / Type Unions
// ============================================================================

export type FuelType = 'therms' | 'kwh' | 'propane_gallons' | 'oil_gallons' | 'ccf'

export type FoundationType = 'slab_on_grade' | 'basement' | 'crawlspace' | 'none'

export type BuildingEra = 'pre_1980' | '1980_2000' | '2000_2010' | '2010_2020' | 'post_2020'

export type WindowType = 'pre_2000_single' | '2000_double' | '2010_low_e' | 'post_2020_triple'

export type ACHTightness = 'new_tight' | 'new_standard' | 'retrofit_tight' | 'standard_existing' | 'leaky_old'

export type SizingMethod = 'baseload' | 'extreme'

export type HeatingApplication = 'forced_air' | 'hydronic' | 'radiant'

// ============================================================================
// Utility Bill Data (Existing Buildings)
// ============================================================================

/** Form input for a single month's bill (strings for form binding) */
export interface MonthlyBillInput {
  month: number           // 1-12
  fuelQuantity: string    // String for form input
  totalCost: string       // String for form input
}

/** Processed bill data with HDD reference */
export interface MonthlyBillData {
  month: number
  fuelQuantity: number
  fuelType: FuelType
  totalCost: number
  hddReference: number
}

// ============================================================================
// HLC Results (Existing Buildings)
// ============================================================================

export interface HLCCalibrationResult {
  hlcHdd: number                    // kWh/(°F-day) - primary unit
  hlcRate: number                   // kW/°F - for sizing
  hlcBtu: number                    // BTU/h/°F - for HVAC context
  monthlyHlcValues: (number | null)[]  // HLC for each month (null = excluded)
  excludedMonths: number[]          // Month indices excluded as outliers
  method: 'median' | 'mean'
  annualHeatKwh: number             // Total annual heat load
}

// ============================================================================
// Manual J Envelope (New Buildings)
// ============================================================================

export interface EnvelopeComponent {
  area: number            // Square feet
  rValue: number          // Thermal resistance (hr·ft²·°F/BTU)
}

export interface BuildingEnvelope {
  walls?: EnvelopeComponent
  roof?: EnvelopeComponent
  aboveGradeFloor?: EnvelopeComponent
  windows?: EnvelopeComponent
  doors?: EnvelopeComponent
  foundationType: FoundationType
  basementWalls?: EnvelopeComponent
  basementFloor?: EnvelopeComponent
  slabPerimeter: number         // Linear feet
  slabFFactor: number           // BTU/h/ft/°F
  conditionedVolume: number     // Cubic feet
  ach: number                   // Air changes per hour
}

export interface HLCBreakdown {
  hlcConductive: number         // BTU/h/°F
  hlcInfiltration: number       // BTU/h/°F
  hlcSlab: number               // BTU/h/°F
  hlcBasement: number           // BTU/h/°F
  hlcTotal: number              // BTU/h/°F (sum of above)
  pctConductive: number         // % of total
  pctInfiltration: number       // % of total
  pctSlab: number               // % of total
  pctBasement: number           // % of total
  conductiveDetails: Record<string, number>  // Breakdown by component
}

// ============================================================================
// Sizing
// ============================================================================

export interface MinerSpec {
  modelName: string
  maxPowerKw: number        // Maximum power consumption
  hashrateTh: number        // Hashrate in TH/s at max power
  costUsd: number           // Equipment cost
  heatingApplications: HeatingApplication[]
}

export interface SizingResult {
  sizingType: SizingMethod
  requiredPowerKw: number       // Required heating power
  totalCapacityKw: number       // Total installed capacity
  totalHashrateTh: number       // Total system hashrate
  totalCostUsd: number          // Total equipment cost
  capacityUtilization: number   // % of required power met
  minerQuantity: number         // Number of miners needed
}

export interface MonthlySizingProfile {
  month: number                 // 1-12
  heatLoadKwh: number           // Total heat energy for month
  averagePowerKw: number        // Average heating power
  dutyCycle: number             // % of time at full power (0-1)
  effectiveHashrateTh: number   // Hashrate accounting for duty cycle
}

// ============================================================================
// Economics
// ============================================================================

export interface EconomicInputs {
  totalHashrateTh: number           // Total system hashrate
  totalPowerKw: number              // Total power consumption
  monthlyHeatLoadKwh: number[]      // 12 months
  monthlyDutyCycles: number[]       // 12 months (0-1)
  hashpriceUsdPerThDay: number      // $/TH/day
  btcPriceUsd: number               // USD per BTC
  fuelCostPerKwh: number            // $/kWh delivered heat (displaced fuel)
  electricityRateKwh: number        // $/kWh electricity
  capitalCostUsd?: number           // Total upfront cost (for payback)
  poolFeePercent: number            // Mining pool fee (0.02 = 2%)
}

export interface MonthlyEconomics {
  month: number                     // 1-12
  heatDeliveredKwh: number          // Heat energy delivered
  dutyCycle: number                 // Average duty cycle (0-1)
  effectiveHashrateTh: number       // Hashrate accounting for duty cycle
  btcRevenueUsd: number             // Bitcoin mining revenue (net of pool fee)
  heatingValueUsd: number           // Value of heat (fuel cost avoided)
  totalRevenueUsd: number           // BTC + heating value
  electricityCostUsd: number        // Cost of electricity
  poolFeeUsd: number                // Mining pool fee
  totalCostUsd: number              // Total operating costs
  netProfitUsd: number              // Revenue - costs
}

export interface FreezeFrameResult {
  method: 'freeze_frame'
  monthlyEconomics: MonthlyEconomics[]
  annualBtcRevenueUsd: number
  annualHeatingValueUsd: number
  annualTotalRevenueUsd: number
  annualElectricityCostUsd: number
  annualPoolFeeUsd: number
  annualTotalCostUsd: number
  annualNetProfitUsd: number
  revenueSplitBtcPct: number        // % revenue from BTC
  revenueSplitHeatPct: number       // % revenue from heat
  effectiveHeatingCostPerKwh: number // Net cost after BTC revenue
  simplePaybackYears: number | null  // Capital / annual profit
}

// ============================================================================
// Weather/Location
// ============================================================================

export interface GeoResult {
  latitude: number
  longitude: number
  displayName: string
}

export interface MonthlyHDD {
  year: number
  month: number           // 1-12
  hdd: number             // Heating degree days (base 65°F)
}

export interface LocationData {
  latitude: number
  longitude: number
  address?: string
  state?: string
  designTemp99?: number   // 99% design temperature (°F)
  historicalHDD: number[] // 12-month average HDD profile
}

// ============================================================================
// Form State
// ============================================================================

export interface ExistingBuildingInputs {
  fuelType: FuelType
  afue: string                      // String for form binding
  monthlyBills: MonthlyBillInput[]  // 12 months
}

export interface NewBuildingInputs {
  buildingEra: BuildingEra
  floorArea: string                 // sq ft
  ceilingHeight: string             // ft
  windowType: WindowType
  foundationType: FoundationType
  achTightness: ACHTightness
  slabPerimeter: string             // linear ft (if slab)
  // Advanced overrides
  customWallRValue?: string
  customRoofRValue?: string
  customWindowRValue?: string
}

// ============================================================================
// Month Constants
// ============================================================================

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const

export const MONTH_ABBREV = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
] as const
