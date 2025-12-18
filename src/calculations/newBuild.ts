/**
 * New building thermal modeling - Calculate HLC from building envelope.
 *
 * This module analyzes new construction or buildings without utility bill history
 * using Manual J-based thermal modeling principles.
 */

import {
  FoundationType,
  BuildingEra,
  WindowType,
  ACHTightness,
  EnvelopeComponent,
  BuildingEnvelope,
  HLCBreakdown,
} from '../types/audit'

import {
  AIR_HEAT_CAPACITY_FACTOR,
} from './conversions'

// ============================================================================
// R-Value Defaults by Building Era
// ============================================================================

export const R_VALUE_DEFAULTS: Record<string, Record<BuildingEra, number>> = {
  walls: {
    pre_1980: 5.0,
    '1980_2000': 11.0,
    '2000_2010': 13.0,
    '2010_2020': 20.0,
    post_2020: 25.0,
  },
  roof: {
    pre_1980: 10.0,
    '1980_2000': 19.0,
    '2000_2010': 30.0,
    '2010_2020': 38.0,
    post_2020: 49.0,
  },
  floor: {
    pre_1980: 0.0,
    '1980_2000': 11.0,
    '2000_2010': 19.0,
    '2010_2020': 30.0,
    post_2020: 30.0,
  },
  basement_walls: {
    pre_1980: 0.0,
    '1980_2000': 5.0,
    '2000_2010': 10.0,
    '2010_2020': 15.0,
    post_2020: 20.0,
  },
}

// Window U-factors by era (U-factor = 1/R-value)
export const WINDOW_U_FACTORS: Record<WindowType, number> = {
  pre_2000_single: 1.00,   // R-1
  '2000_double': 0.50,     // R-2
  '2010_low_e': 0.30,      // R-3.3
  post_2020_triple: 0.20,  // R-5
}

// ACH (Air Changes per Hour) by construction tightness
export const ACH_DEFAULTS: Record<ACHTightness, number> = {
  new_tight: 0.35,         // Post-2015, blower door tested
  new_standard: 0.50,      // Post-2010
  retrofit_tight: 0.75,    // Well-sealed retrofit
  standard_existing: 1.25, // Average existing
  leaky_old: 2.50,        // Pre-1980, no weatherization
}

// Slab F-factors (BTU/h/ft/°F)
export const F_FACTOR_DEFAULTS = {
  uninsulated: 1.35,
  r5_vertical: 0.90,
  r10_vertical: 0.69,
  r10_horizontal: 0.73,
}

// ============================================================================
// R-Value Estimation
// ============================================================================

/**
 * Estimate R-value based on building era and component type.
 */
export function estimateRValue(
  component: 'walls' | 'roof' | 'floor' | 'basement_walls',
  era: BuildingEra
): number {
  return R_VALUE_DEFAULTS[component][era]
}

/**
 * Estimate window R-value from type/era.
 */
export function estimateWindowRValue(windowType: WindowType): number {
  const uFactor = WINDOW_U_FACTORS[windowType]
  return 1.0 / uFactor
}

/**
 * Estimate air changes per hour from construction tightness.
 */
export function estimateACH(tightness: ACHTightness): number {
  return ACH_DEFAULTS[tightness]
}

/**
 * Get default F-factor for slab edge.
 */
export function getDefaultFFactor(insulation: keyof typeof F_FACTOR_DEFAULTS = 'r10_horizontal'): number {
  return F_FACTOR_DEFAULTS[insulation]
}

// ============================================================================
// HLC Component Calculations
// ============================================================================

/**
 * Calculate conductive heat loss coefficient from building envelope.
 * UA = Area / R-value for each component.
 *
 * @param envelope - Building envelope specification
 * @returns Tuple of [total HLC in BTU/h/°F, detailed breakdown]
 */
export function calculateConductiveHLC(
  envelope: BuildingEnvelope
): { total: number; details: Record<string, number> } {
  let hlcTotal = 0
  const details: Record<string, number> = {}

  // Walls
  if (envelope.walls) {
    const hlcWalls = envelope.walls.area / envelope.walls.rValue
    hlcTotal += hlcWalls
    details.walls = hlcWalls
  }

  // Roof
  if (envelope.roof) {
    const hlcRoof = envelope.roof.area / envelope.roof.rValue
    hlcTotal += hlcRoof
    details.roof = hlcRoof
  }

  // Above-grade floor (e.g., floor over garage)
  if (envelope.aboveGradeFloor) {
    const hlcFloor = envelope.aboveGradeFloor.area / envelope.aboveGradeFloor.rValue
    hlcTotal += hlcFloor
    details.above_grade_floor = hlcFloor
  }

  // Windows
  if (envelope.windows) {
    const hlcWindows = envelope.windows.area / envelope.windows.rValue
    hlcTotal += hlcWindows
    details.windows = hlcWindows
  }

  // Doors
  if (envelope.doors) {
    const hlcDoors = envelope.doors.area / envelope.doors.rValue
    hlcTotal += hlcDoors
    details.doors = hlcDoors
  }

  return { total: hlcTotal, details }
}

/**
 * Calculate infiltration heat loss coefficient.
 * Q_infiltration = Volume × ACH × 1.08
 *
 * @param volume - Conditioned space volume (cubic feet)
 * @param ach - Air changes per hour
 * @returns Infiltration HLC in BTU/h/°F
 */
export function calculateInfiltrationHLC(volume: number, ach: number): number {
  // CFM = Volume × ACH / 60
  // But simplified formula: HLC = Volume × ACH × 1.08 / 60
  // The 1.08 factor accounts for air heat capacity
  return (volume * ach * AIR_HEAT_CAPACITY_FACTOR) / 60
}

/**
 * Calculate slab edge heat loss coefficient.
 * Q_slab = Perimeter × F-factor
 *
 * @param perimeter - Exposed slab perimeter (linear feet)
 * @param fFactor - Heat loss per ft of perimeter per °F (BTU/h/ft/°F)
 * @returns Slab edge HLC in BTU/h/°F
 */
export function calculateSlabHLC(perimeter: number, fFactor: number): number {
  return perimeter * fFactor
}

/**
 * Calculate basement/ground contact heat loss coefficient.
 *
 * @param basementWalls - Basement wall component (area/R-value)
 * @param basementFloor - Basement floor component (area/R-value)
 * @returns Basement HLC in BTU/h/°F
 */
export function calculateBasementHLC(
  basementWalls?: EnvelopeComponent,
  basementFloor?: EnvelopeComponent
): number {
  let hlcBasement = 0

  if (basementWalls && basementWalls.rValue > 0) {
    hlcBasement += basementWalls.area / basementWalls.rValue
  }

  if (basementFloor && basementFloor.rValue > 0) {
    hlcBasement += basementFloor.area / basementFloor.rValue
  }

  return hlcBasement
}

// ============================================================================
// Total HLC Calculation
// ============================================================================

/**
 * Calculate total HLC from all building envelope components.
 *
 * @param envelope - Complete building envelope specification
 * @returns HLCBreakdown with total and component details
 */
export function calculateTotalHLC(envelope: BuildingEnvelope): HLCBreakdown {
  // Conductive losses
  const { total: hlcConductive, details: conductiveDetails } = calculateConductiveHLC(envelope)

  // Infiltration
  const hlcInfiltration = calculateInfiltrationHLC(
    envelope.conditionedVolume,
    envelope.ach
  )

  // Slab edge
  let hlcSlab = 0
  if (envelope.foundationType === 'slab_on_grade') {
    hlcSlab = calculateSlabHLC(envelope.slabPerimeter, envelope.slabFFactor)
  }

  // Basement/ground contact
  let hlcBasement = 0
  if (envelope.foundationType === 'basement' || envelope.foundationType === 'crawlspace') {
    hlcBasement = calculateBasementHLC(
      envelope.basementWalls,
      envelope.basementFloor
    )
  }

  // Total
  const hlcTotal = hlcConductive + hlcInfiltration + hlcSlab + hlcBasement

  // Calculate percentages
  const pctConductive = hlcTotal > 0 ? (hlcConductive / hlcTotal) * 100 : 0
  const pctInfiltration = hlcTotal > 0 ? (hlcInfiltration / hlcTotal) * 100 : 0
  const pctSlab = hlcTotal > 0 ? (hlcSlab / hlcTotal) * 100 : 0
  const pctBasement = hlcTotal > 0 ? (hlcBasement / hlcTotal) * 100 : 0

  return {
    hlcConductive,
    hlcInfiltration,
    hlcSlab,
    hlcBasement,
    hlcTotal,
    pctConductive,
    pctInfiltration,
    pctSlab,
    pctBasement,
    conductiveDetails,
  }
}

// ============================================================================
// Envelope Creation Helpers
// ============================================================================

/**
 * Estimate wall area from floor area (simple box model).
 * Assumes square footprint with standard wall height.
 */
export function estimateWallArea(floorArea: number, wallHeight: number = 9): number {
  const side = Math.sqrt(floorArea)
  const perimeter = side * 4
  return perimeter * wallHeight
}

/**
 * Estimate window area from wall area (typical 15-20% window-to-wall ratio).
 */
export function estimateWindowArea(wallArea: number, ratio: number = 0.15): number {
  return wallArea * ratio
}

/**
 * Estimate door area (typical 2-3 exterior doors at ~20 sq ft each).
 */
export function estimateDoorArea(numDoors: number = 2): number {
  return numDoors * 20
}

/**
 * Estimate conditioned volume from floor area and ceiling height.
 */
export function estimateVolume(floorArea: number, ceilingHeight: number = 9): number {
  return floorArea * ceilingHeight
}

/**
 * Estimate slab perimeter from floor area (square footprint).
 */
export function estimateSlabPerimeter(floorArea: number): number {
  const side = Math.sqrt(floorArea)
  return side * 4
}

/**
 * Create a building envelope from simplified inputs.
 */
export function createEnvelopeFromInputs(
  floorArea: number,
  ceilingHeight: number,
  buildingEra: BuildingEra,
  windowType: WindowType,
  foundationType: FoundationType,
  achTightness: ACHTightness,
  customOverrides?: {
    wallRValue?: number
    roofRValue?: number
    windowRValue?: number
    ach?: number
    slabFFactor?: number
  }
): BuildingEnvelope {
  // Calculate areas
  const wallArea = estimateWallArea(floorArea, ceilingHeight)
  const windowArea = estimateWindowArea(wallArea)
  const doorArea = estimateDoorArea()
  const netWallArea = wallArea - windowArea - doorArea

  // Get R-values
  const wallRValue = customOverrides?.wallRValue ?? estimateRValue('walls', buildingEra)
  const roofRValue = customOverrides?.roofRValue ?? estimateRValue('roof', buildingEra)
  const windowRValue = customOverrides?.windowRValue ?? estimateWindowRValue(windowType)
  const ach = customOverrides?.ach ?? estimateACH(achTightness)

  // Base envelope
  const envelope: BuildingEnvelope = {
    walls: { area: netWallArea, rValue: wallRValue },
    roof: { area: floorArea, rValue: roofRValue },
    windows: { area: windowArea, rValue: windowRValue },
    doors: { area: doorArea, rValue: 3.0 }, // Typical insulated door
    foundationType,
    slabPerimeter: 0,
    slabFFactor: F_FACTOR_DEFAULTS.r10_horizontal,
    conditionedVolume: estimateVolume(floorArea, ceilingHeight),
    ach,
  }

  // Foundation-specific settings
  if (foundationType === 'slab_on_grade') {
    envelope.slabPerimeter = estimateSlabPerimeter(floorArea)
    envelope.slabFFactor = customOverrides?.slabFFactor ?? F_FACTOR_DEFAULTS.r10_horizontal
  } else if (foundationType === 'basement') {
    const basementWallRValue = estimateRValue('basement_walls', buildingEra)
    envelope.basementWalls = { area: estimateWallArea(floorArea, 8), rValue: Math.max(basementWallRValue, 5) }
    envelope.basementFloor = { area: floorArea, rValue: 5.0 } // Ground contact
  } else if (foundationType === 'crawlspace') {
    const floorRValue = estimateRValue('floor', buildingEra)
    envelope.aboveGradeFloor = { area: floorArea, rValue: Math.max(floorRValue, 11) }
  }

  return envelope
}

// ============================================================================
// Validation & Benchmarks
// ============================================================================

/**
 * Calculate HLC per square foot and assess quality.
 */
export function validateHLCPerSqft(
  hlcTotal: number,
  floorArea: number
): { hlcPerSqft: number; quality: string } {
  const hlcPerSqft = floorArea > 0 ? hlcTotal / floorArea : 0

  // Benchmarks (BTU/h/sqft/°F)
  let quality: string
  if (hlcPerSqft < 0.05) {
    quality = 'excellent'  // Passive House level
  } else if (hlcPerSqft < 0.10) {
    quality = 'good'       // Well-insulated new construction
  } else if (hlcPerSqft < 0.15) {
    quality = 'average'    // Code minimum
  } else if (hlcPerSqft < 0.25) {
    quality = 'poor'       // Older construction
  } else {
    quality = 'very_poor'  // Uninsulated or very leaky
  }

  return { hlcPerSqft, quality }
}

/**
 * Check for components that dominate heat loss.
 * Returns warnings for components >40% of total loss.
 */
export function checkComponentDominance(breakdown: HLCBreakdown): string[] {
  const warnings: string[] = []

  if (breakdown.pctInfiltration > 40) {
    warnings.push(
      `Infiltration accounts for ${breakdown.pctInfiltration.toFixed(1)}% of heat loss. Consider air sealing improvements.`
    )
  }

  // Check individual conductive components
  if (breakdown.hlcTotal > 0) {
    for (const [component, hlc] of Object.entries(breakdown.conductiveDetails)) {
      const pct = (hlc / breakdown.hlcTotal) * 100
      if (pct > 40) {
        const name = component.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        warnings.push(
          `${name} account for ${pct.toFixed(1)}% of heat loss. Consider upgrade.`
        )
      }
    }
  }

  return warnings
}
