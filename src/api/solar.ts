/**
 * Solar irradiance API client using Open-Meteo.
 *
 * Fetches solar radiation data to estimate PV system production.
 * Uses the same Open-Meteo API as weather.ts but different parameters.
 */

import axios from 'axios'

// ============================================================================
// Constants
// ============================================================================

const OPEN_METEO_BASE_URL = 'https://archive-api.open-meteo.com/v1/archive'
const OPEN_METEO_DELAY = 100 // Rate limiting

// Cache keys prefix
const CACHE_PREFIX = 'exergy_solar_'

// ============================================================================
// Types
// ============================================================================

export interface MonthlySolarData {
  month: number           // 1-12
  avgDailyKwh: number     // Average daily kWh production per kW of system
  totalKwh: number        // Total monthly kWh per kW of system
  avgIrradiance: number   // Average daily irradiance (kWh/m²)
}

export interface AnnualSolarProfile {
  monthly: MonthlySolarData[]
  annualKwhPerKw: number    // Total annual kWh production per kW of system
  peakMonth: number         // Month with highest production (1-12)
  lowestMonth: number       // Month with lowest production (1-12)
}

// ============================================================================
// Helper Functions
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getCacheKey(type: string, ...args: (string | number)[]): string {
  return `${CACHE_PREFIX}${type}_${args.join('_')}`
}

function getFromCache<T>(key: string): T | null {
  try {
    const cached = sessionStorage.getItem(key)
    if (cached) {
      return JSON.parse(cached) as T
    }
  } catch {
    // Ignore cache errors
  }
  return null
}

function setCache<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore cache errors (e.g., quota exceeded)
  }
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

// ============================================================================
// API Calls
// ============================================================================

interface OpenMeteoSolarResponse {
  daily: {
    time: string[]
    shortwave_radiation_sum: (number | null)[]  // Daily sum in MJ/m²
  }
}

/**
 * Fetch daily solar radiation for a date range from Open-Meteo.
 *
 * @param lat - Latitude
 * @param lon - Longitude
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Array of daily solar radiation sums in kWh/m²
 */
async function fetchDailySolarRadiation(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string
): Promise<number[]> {
  await delay(OPEN_METEO_DELAY)

  const response = await axios.get<OpenMeteoSolarResponse>(OPEN_METEO_BASE_URL, {
    params: {
      latitude: lat,
      longitude: lon,
      start_date: startDate,
      end_date: endDate,
      daily: 'shortwave_radiation_sum',
      timezone: 'auto',
    },
    timeout: 30000,
  })

  const radiation = response.data.daily.shortwave_radiation_sum

  // Convert MJ/m² to kWh/m² (1 MJ = 0.2778 kWh)
  return radiation.map(r => (r ?? 0) * 0.2778)
}

/**
 * Get monthly solar radiation average for a specific year.
 *
 * @param lat - Latitude
 * @param lon - Longitude
 * @param year - Year to fetch
 * @param month - Month (1-12)
 * @returns Average daily solar radiation in kWh/m²
 */
export async function getMonthlySolarRadiation(
  lat: number,
  lon: number,
  year: number,
  month: number
): Promise<number> {
  const cacheKey = getCacheKey('rad', lat.toFixed(2), lon.toFixed(2), year, month)
  const cached = getFromCache<number>(cacheKey)
  if (cached !== null) return cached

  const daysInMonth = getDaysInMonth(year, month)
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

  const dailyRadiation = await fetchDailySolarRadiation(lat, lon, startDate, endDate)

  // Calculate average daily radiation
  const avgDailyRadiation = dailyRadiation.reduce((sum, r) => sum + r, 0) / dailyRadiation.length

  setCache(cacheKey, avgDailyRadiation)
  return avgDailyRadiation
}

/**
 * Get multi-year average solar profile for a location.
 *
 * @param lat - Latitude
 * @param lon - Longitude
 * @param numYears - Number of years to average (default 5)
 * @returns Annual solar production profile
 */
export async function getSolarProfile(
  lat: number,
  lon: number,
  numYears: number = 5
): Promise<AnnualSolarProfile> {
  const cacheKey = getCacheKey('profile', lat.toFixed(2), lon.toFixed(2), numYears)
  const cached = getFromCache<AnnualSolarProfile>(cacheKey)
  if (cached) return cached

  const currentYear = new Date().getFullYear()
  const monthlyTotals = new Array(12).fill(0)
  const monthCounts = new Array(12).fill(0)

  // Fetch last N years of data
  for (let year = currentYear - numYears; year < currentYear; year++) {
    for (let month = 1; month <= 12; month++) {
      try {
        const avgRadiation = await getMonthlySolarRadiation(lat, lon, year, month)
        monthlyTotals[month - 1] += avgRadiation
        monthCounts[month - 1]++
      } catch (error) {
        console.warn(`Could not fetch solar data for ${year}-${month}:`, error)
      }
    }
  }

  // Calculate monthly averages and convert to production estimates
  const monthly: MonthlySolarData[] = monthlyTotals.map((total, i) => {
    const avgIrradiance = monthCounts[i] > 0 ? total / monthCounts[i] : 0

    // Estimate PV production from irradiance
    // Typical assumptions:
    // - System efficiency: ~15-20% panel efficiency, ~85% system efficiency = ~15% overall
    // - But we use "Performance Ratio" of ~0.75-0.85 for real-world conditions
    // - Simplified: 1 kWh/m² of irradiance ≈ 0.75-0.85 kWh per kW of installed capacity
    // Using 0.80 as a reasonable estimate for typical fixed-tilt systems
    const performanceRatio = 0.80

    const daysInMonth = getDaysInMonth(currentYear, i + 1)
    const avgDailyKwh = avgIrradiance * performanceRatio
    const totalKwh = avgDailyKwh * daysInMonth

    return {
      month: i + 1,
      avgDailyKwh,
      totalKwh,
      avgIrradiance,
    }
  })

  // Calculate annual totals
  const annualKwhPerKw = monthly.reduce((sum, m) => sum + m.totalKwh, 0)

  // Find peak and lowest months
  const peakMonth = monthly.reduce((peak, m) => m.totalKwh > peak.totalKwh ? m : peak).month
  const lowestMonth = monthly.reduce((low, m) => m.totalKwh < low.totalKwh ? m : low).month

  const profile: AnnualSolarProfile = {
    monthly,
    annualKwhPerKw,
    peakMonth,
    lowestMonth,
  }

  setCache(cacheKey, profile)
  return profile
}

/**
 * Estimate annual solar production for a given system size.
 *
 * @param systemSizeKw - System size in kW (DC rating)
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns Estimated annual production in kWh
 */
export async function estimateAnnualProduction(
  systemSizeKw: number,
  lat: number,
  lon: number
): Promise<{
  annualKwh: number
  monthlyKwh: number[]
  profile: AnnualSolarProfile
}> {
  const profile = await getSolarProfile(lat, lon)

  const annualKwh = profile.annualKwhPerKw * systemSizeKw
  const monthlyKwh = profile.monthly.map(m => m.totalKwh * systemSizeKw)

  return {
    annualKwh,
    monthlyKwh,
    profile,
  }
}

/**
 * Quick estimate of annual production using latitude-based approximation.
 * Use when API is not available or for quick estimates.
 *
 * @param systemSizeKw - System size in kW
 * @param latitude - Latitude
 * @returns Estimated annual production in kWh
 */
export function estimateProductionByLatitude(systemSizeKw: number, latitude: number): number {
  const absLat = Math.abs(latitude)

  // Annual kWh per kW by latitude range (US-centric estimates)
  // Based on NREL PVWatts typical values
  let kwhPerKw: number
  if (absLat < 25) {
    kwhPerKw = 1800  // Southern regions (Florida, Hawaii)
  } else if (absLat < 32) {
    kwhPerKw = 1650  // Southwest (Arizona, SoCal)
  } else if (absLat < 38) {
    kwhPerKw = 1500  // Mid-latitude (NorCal, Colorado)
  } else if (absLat < 43) {
    kwhPerKw = 1400  // Northern (Oregon, NY)
  } else if (absLat < 48) {
    kwhPerKw = 1300  // Pacific Northwest, Montana
  } else {
    kwhPerKw = 1100  // Alaska, Canada
  }

  return systemSizeKw * kwhPerKw
}

// ============================================================================
// Month Names
// ============================================================================

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export const MONTH_ABBREV = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]
