import axios from 'axios'

// ============================================================================
// API Configuration
// ============================================================================

const NREL_API = 'https://developer.nrel.gov/api/pvwatts/v8.json'
const ZIPPOPOTAM_API = 'https://api.zippopotam.us/us'

// API key from environment variable (set in .env as VITE_NREL_API_KEY)
const API_KEY = import.meta.env.VITE_NREL_API_KEY || ''

// ============================================================================
// Geocoding Types
// ============================================================================

interface ZippopotamResponse {
  'post code': string
  country: string
  'country abbreviation': string
  places: Array<{
    'place name': string
    longitude: string
    latitude: string
    state: string
    'state abbreviation': string
  }>
}

interface GeocodingResult {
  lat: number
  lon: number
  city: string
  state: string
}

// ============================================================================
// API Response Types
// ============================================================================

interface NRELPVWattsResponse {
  inputs: {
    lat: string
    lon: string
    system_capacity: string
    azimuth: string
    tilt: string
    array_type: string
    module_type: string
    losses: string
  }
  errors: string[]
  warnings: string[]
  version: string
  ssc_info: {
    version: number
    build: string
  }
  station_info: {
    lat: number
    lon: number
    elev: number
    tz: number
    location: string
    city: string
    state: string
    solar_resource_file: string
    distance: number
  }
  outputs: {
    ac_monthly: number[]      // Monthly AC energy (kWh) - 12 values
    poa_monthly: number[]     // Monthly plane of array irradiance
    solrad_monthly: number[]  // Monthly solar radiation (kWh/m2/day)
    dc_monthly: number[]      // Monthly DC energy (kWh)
    ac_annual: number         // Annual AC energy (kWh)
    solrad_annual: number     // Annual average solar radiation (kWh/m2/day)
    capacity_factor: number   // Capacity factor (%)
  }
}

// ============================================================================
// App Interface Types
// ============================================================================

export interface SolarEstimate {
  // Location info
  city: string
  state: string
  lat: number
  lon: number

  // Production data
  annualKwh: number           // Total annual production (kWh)
  monthlyKwh: number[]        // Monthly production (12 values)
  capacityFactor: number      // Capacity factor (%)

  // Solar resource
  avgSunHoursPerDay: number   // Average daily sun hours
  monthlySunHours: number[]   // Monthly average sun hours (12 values)
}

export interface SolarAPIError {
  message: string
  errors?: string[]
}

// ============================================================================
// Default System Parameters
// ============================================================================

// Sensible defaults for residential rooftop solar
export const DEFAULT_SYSTEM_PARAMS = {
  moduleType: 0,      // 0 = Standard, 1 = Premium, 2 = Thin film
  arrayType: 1,       // 0 = Fixed open rack, 1 = Fixed roof mount, 2 = 1-axis tracking, etc.
  losses: 14,         // System losses (%) - typical value
  tilt: 20,           // Tilt angle (degrees) - typical roof pitch
  azimuth: 180,       // Azimuth (degrees) - 180 = south-facing
}

// ============================================================================
// Fallback Data
// ============================================================================

// Fallback for when API fails - based on US average
const FALLBACK_ESTIMATE: SolarEstimate = {
  city: 'Unknown',
  state: 'US',
  lat: 39.8,
  lon: -98.6,
  annualKwh: 0,
  monthlyKwh: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  capacityFactor: 0,
  avgSunHoursPerDay: 4.5,
  monthlySunHours: [3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.0, 5.5, 5.0, 4.5, 3.5, 3.0],
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Geocode a US zip code to lat/lon using Zippopotam.us API.
 * This is a free, no-API-key-required service.
 *
 * @param zipCode - US zip code
 * @returns Geocoding result with lat, lon, city, and state
 */
async function geocodeZipCode(zipCode: string): Promise<GeocodingResult | null> {
  try {
    // Zippopotam expects just the zip code in the URL path
    const response = await axios.get<ZippopotamResponse>(`${ZIPPOPOTAM_API}/${zipCode}`)

    const places = response.data?.places
    if (!places || places.length === 0) {
      console.warn('No geocoding matches for zip code:', zipCode)
      return null
    }

    const place = places[0]
    return {
      lat: parseFloat(place.latitude),
      lon: parseFloat(place.longitude),
      city: place['place name'] || 'Unknown',
      state: place['state abbreviation'] || 'US',
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

/**
 * Fetch solar production estimate from NREL PVWatts API.
 *
 * @param zipCode - US zip code for location
 * @param systemCapacityKw - System size in kW (DC)
 * @param options - Optional system parameters (tilt, azimuth, etc.)
 * @returns Solar production estimate or error
 */
export async function getSolarEstimate(
  zipCode: string,
  systemCapacityKw: number,
  options?: Partial<typeof DEFAULT_SYSTEM_PARAMS>
): Promise<SolarEstimate> {
  if (!API_KEY) {
    console.warn('NREL API key not configured. Set VITE_NREL_API_KEY in .env')
    return {
      ...FALLBACK_ESTIMATE,
      annualKwh: systemCapacityKw * 1400, // Rough US average: 1400 kWh/kW
      monthlyKwh: generateMonthlyEstimate(systemCapacityKw * 1400),
    }
  }

  // Step 1: Geocode the zip code to lat/lon
  const geoResult = await geocodeZipCode(zipCode)
  if (!geoResult) {
    console.warn('Could not geocode zip code, using fallback')
    return {
      ...FALLBACK_ESTIMATE,
      annualKwh: systemCapacityKw * 1400,
      monthlyKwh: generateMonthlyEstimate(systemCapacityKw * 1400),
    }
  }

  const params = { ...DEFAULT_SYSTEM_PARAMS, ...options }

  try {
    // Step 2: Call PVWatts with lat/lon (address parameter deprecated Feb 2025)
    const response = await axios.get<NRELPVWattsResponse>(NREL_API, {
      params: {
        api_key: API_KEY,
        lat: geoResult.lat,
        lon: geoResult.lon,
        system_capacity: systemCapacityKw,
        module_type: params.moduleType,
        array_type: params.arrayType,
        losses: params.losses,
        tilt: params.tilt,
        azimuth: params.azimuth,
      },
    })

    const { outputs, station_info, errors } = response.data

    if (errors && errors.length > 0) {
      console.error('NREL API errors:', errors)
      throw new Error(errors.join(', '))
    }

    return {
      city: geoResult.city || station_info.city || 'Unknown',
      state: geoResult.state || station_info.state || 'US',
      lat: station_info.lat,
      lon: station_info.lon,
      annualKwh: outputs.ac_annual,
      monthlyKwh: outputs.ac_monthly,
      capacityFactor: outputs.capacity_factor,
      avgSunHoursPerDay: outputs.solrad_annual,
      monthlySunHours: outputs.solrad_monthly,
    }
  } catch (error) {
    console.error('Error fetching solar estimate:', error)

    // Return fallback with rough estimate based on system size
    return {
      ...FALLBACK_ESTIMATE,
      annualKwh: systemCapacityKw * 1400,
      monthlyKwh: generateMonthlyEstimate(systemCapacityKw * 1400),
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a rough monthly distribution of annual production.
 * Uses typical US seasonal pattern (more in summer, less in winter).
 */
function generateMonthlyEstimate(annualKwh: number): number[] {
  // Seasonal distribution factors (sum = 1.0)
  const monthlyFactors = [
    0.060, // Jan
    0.065, // Feb
    0.080, // Mar
    0.090, // Apr
    0.100, // May
    0.105, // Jun
    0.105, // Jul
    0.100, // Aug
    0.090, // Sep
    0.080, // Oct
    0.065, // Nov
    0.060, // Dec
  ]

  return monthlyFactors.map(factor => Math.round(annualKwh * factor))
}
