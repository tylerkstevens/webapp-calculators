/**
 * Weather data API clients for HDD (Heating Degree Days).
 *
 * Uses free APIs with no authentication required:
 * - Open-Meteo: Historical weather data
 * - Nominatim (OpenStreetMap): Geocoding
 */

import axios from 'axios'
import { GeoResult, MonthlyHDD } from '../types/audit'

// ============================================================================
// Constants
// ============================================================================

const OPEN_METEO_BASE_URL = 'https://archive-api.open-meteo.com/v1/archive'
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search'

// Rate limiting delays (ms)
const NOMINATIM_DELAY = 1000  // 1 request per second per Nominatim policy
const OPEN_METEO_DELAY = 100  // Conservative: ~10 requests per second

// Cache keys prefix
const CACHE_PREFIX = 'exergy_audit_'

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

/**
 * Calculate heating degree days from average temperature.
 * HDD = max(0, base_temp - avg_temp)
 */
function calculateHddFromTemp(avgTempF: number, baseTempF: number = 65.0): number {
  return Math.max(0, baseTempF - avgTempF)
}

/**
 * Get number of days in a month.
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

// ============================================================================
// Geocoding (Nominatim)
// ============================================================================

/**
 * Convert address to latitude/longitude using OpenStreetMap Nominatim API.
 * Free geocoding service with no API key required.
 *
 * @param address - Full address string (e.g., "123 Main St, Boston, MA 02101")
 * @returns GeoResult with coordinates and display name, or null if not found
 */
export async function geocodeAddress(address: string): Promise<GeoResult | null> {
  const cacheKey = getCacheKey('geo', address)
  const cached = getFromCache<GeoResult>(cacheKey)
  if (cached) return cached

  // Rate limiting
  await delay(NOMINATIM_DELAY)

  try {
    const response = await axios.get(NOMINATIM_BASE_URL, {
      params: {
        q: address,
        format: 'json',
        limit: 1,
      },
      headers: {
        'User-Agent': 'ExergyEnergyAudit/1.0',
      },
      timeout: 10000,
    })

    if (!response.data || response.data.length === 0) {
      return null
    }

    const result = response.data[0]
    const geoResult: GeoResult = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name || address,
    }

    setCache(cacheKey, geoResult)
    return geoResult
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

// ============================================================================
// Open-Meteo API
// ============================================================================

interface OpenMeteoResponse {
  daily: {
    time: string[]
    temperature_2m_mean: (number | null)[]
  }
}

/**
 * Fetch daily average temperatures for a date range from Open-Meteo.
 *
 * @param lat - Latitude
 * @param lon - Longitude
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Array of daily average temperatures in °F
 */
async function fetchDailyTemps(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string
): Promise<number[]> {
  await delay(OPEN_METEO_DELAY)

  const response = await axios.get<OpenMeteoResponse>(OPEN_METEO_BASE_URL, {
    params: {
      latitude: lat,
      longitude: lon,
      start_date: startDate,
      end_date: endDate,
      daily: 'temperature_2m_mean',
      temperature_unit: 'fahrenheit',
      timezone: 'auto',
    },
    timeout: 30000,
  })

  const temps = response.data.daily.temperature_2m_mean
  if (!temps || temps.some(t => t === null)) {
    throw new Error('API returned incomplete temperature data')
  }

  return temps as number[]
}

/**
 * Get HDD for a specific month.
 *
 * @param lat - Latitude
 * @param lon - Longitude
 * @param year - Year
 * @param month - Month (1-12)
 * @param baseTempF - Base temperature for HDD calculation (default 65°F)
 * @returns Total HDD for the month
 */
export async function getMonthlyHDD(
  lat: number,
  lon: number,
  year: number,
  month: number,
  baseTempF: number = 65.0
): Promise<number> {
  const cacheKey = getCacheKey('hdd', lat.toFixed(2), lon.toFixed(2), year, month)
  const cached = getFromCache<number>(cacheKey)
  if (cached !== null) return cached

  // Calculate month boundaries
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const daysInMonth = getDaysInMonth(year, month)
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

  const dailyTemps = await fetchDailyTemps(lat, lon, startDate, endDate)

  // Calculate HDD
  let totalHdd = 0
  for (const temp of dailyTemps) {
    totalHdd += calculateHddFromTemp(temp, baseTempF)
  }

  setCache(cacheKey, totalHdd)
  return totalHdd
}

/**
 * Get multi-year average monthly HDD profile (historical HDD).
 * Returns a typical year profile based on historical averages.
 *
 * @param lat - Latitude
 * @param lon - Longitude
 * @param numYears - Number of years to average (default 10)
 * @param baseTempF - Base temperature for HDD calculation (default 65°F)
 * @returns Array of 12 monthly HDD values (Jan-Dec averages)
 */
export async function getHistoricalHDDProfile(
  lat: number,
  lon: number,
  numYears: number = 10,
  baseTempF: number = 65.0
): Promise<number[]> {
  const cacheKey = getCacheKey('hdd_profile', lat.toFixed(2), lon.toFixed(2), numYears)
  const cached = getFromCache<number[]>(cacheKey)
  if (cached) return cached

  const currentYear = new Date().getFullYear()
  const monthlyTotals = new Array(12).fill(0)
  const monthCounts = new Array(12).fill(0)

  // Fetch last N years
  for (let year = currentYear - numYears; year < currentYear; year++) {
    for (let month = 1; month <= 12; month++) {
      try {
        const hdd = await getMonthlyHDD(lat, lon, year, month, baseTempF)
        monthlyTotals[month - 1] += hdd
        monthCounts[month - 1]++
      } catch (error) {
        console.warn(`Could not fetch HDD data for ${year}-${month}:`, error)
      }
    }
  }

  // Calculate averages
  const monthlyAverages = monthlyTotals.map((total, i) =>
    monthCounts[i] > 0 ? total / monthCounts[i] : 0
  )

  setCache(cacheKey, monthlyAverages)
  return monthlyAverages
}

/**
 * Get single year HDD data for bill calibration.
 * Fetches HDD for each month of a specific year.
 *
 * @param lat - Latitude
 * @param lon - Longitude
 * @param year - Year to fetch
 * @returns Array of MonthlyHDD for the year
 */
export async function getYearHDD(
  lat: number,
  lon: number,
  year: number
): Promise<MonthlyHDD[]> {
  const results: MonthlyHDD[] = []

  for (let month = 1; month <= 12; month++) {
    try {
      const hdd = await getMonthlyHDD(lat, lon, year, month)
      results.push({ year, month, hdd })
    } catch (error) {
      console.warn(`Could not fetch HDD data for ${year}-${month}:`, error)
      results.push({ year, month, hdd: 0 })
    }
  }

  return results
}

/**
 * Estimate 99% ASHRAE design temperature from historical data.
 * Returns the temperature that is exceeded 99% of the time during winter.
 *
 * @param lat - Latitude
 * @param lon - Longitude
 * @param numYears - Number of years of data to analyze (default 10)
 * @returns 99th percentile design temperature in °F
 */
export async function getDesignTemperature(
  lat: number,
  lon: number,
  numYears: number = 10
): Promise<number> {
  const cacheKey = getCacheKey('design_temp', lat.toFixed(2), lon.toFixed(2), numYears)
  const cached = getFromCache<number>(cacheKey)
  if (cached !== null) return cached

  const currentYear = new Date().getFullYear()
  const allTemps: number[] = []

  // Collect winter month temps (Nov-Mar)
  for (let year = currentYear - numYears; year < currentYear; year++) {
    const winterMonths = [
      { year, month: 11 },       // November
      { year, month: 12 },       // December
      { year: year + 1, month: 1 },  // January
      { year: year + 1, month: 2 },  // February
      { year: year + 1, month: 3 },  // March
    ]

    for (const { year: y, month: m } of winterMonths) {
      try {
        const daysInMonth = getDaysInMonth(y, m)
        const startDate = `${y}-${String(m).padStart(2, '0')}-01`
        const endDate = `${y}-${String(m).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

        const temps = await fetchDailyTemps(lat, lon, startDate, endDate)
        allTemps.push(...temps)
      } catch (error) {
        console.warn(`Could not fetch temps for ${y}-${m}:`, error)
      }
    }
  }

  if (allTemps.length === 0) {
    throw new Error('No temperature data available for design temp calculation')
  }

  // Sort and find 1st percentile (99% of temps are warmer than this)
  allTemps.sort((a, b) => a - b)
  const index = Math.max(0, Math.floor(allTemps.length * 0.01))
  const designTemp = allTemps[index]

  setCache(cacheKey, designTemp)
  return designTemp
}

// ============================================================================
// Climate Zone Estimation (Fallback)
// ============================================================================

type ClimateZone = '1A' | '2A' | '2B' | '3A' | '3B' | '3C' | '4A' | '4B' | '4C' | '5A' | '5B' | '6A' | '6B' | '7' | '8'

/**
 * Estimate typical monthly HDD from ASHRAE climate zone (fallback).
 */
export function estimateHDDFromClimateZone(climateZone: ClimateZone): number[] {
  const profiles: Record<ClimateZone, number[]> = {
    '1A': [50, 30, 20, 0, 0, 0, 0, 0, 0, 0, 10, 40],
    '2A': [150, 120, 80, 20, 0, 0, 0, 0, 0, 10, 60, 130],
    '2B': [200, 150, 100, 30, 0, 0, 0, 0, 0, 20, 80, 180],
    '3A': [350, 280, 200, 80, 10, 0, 0, 0, 5, 60, 180, 320],
    '3B': [400, 320, 230, 100, 15, 0, 0, 0, 10, 80, 220, 370],
    '3C': [450, 360, 260, 120, 30, 0, 0, 0, 20, 100, 250, 420],
    '4A': [650, 550, 450, 220, 60, 5, 0, 0, 30, 180, 400, 600],
    '4B': [700, 580, 480, 250, 80, 10, 0, 0, 40, 200, 440, 650],
    '4C': [750, 620, 520, 280, 100, 20, 0, 5, 60, 230, 480, 700],
    '5A': [930, 756, 651, 360, 124, 15, 0, 0, 48, 279, 540, 837],
    '5B': [850, 680, 580, 320, 100, 10, 0, 0, 40, 250, 500, 780],
    '6A': [1100, 920, 800, 480, 200, 40, 0, 5, 100, 400, 700, 1000],
    '6B': [1050, 880, 760, 450, 180, 30, 0, 0, 80, 370, 660, 950],
    '7': [1300, 1100, 950, 600, 300, 80, 10, 20, 150, 500, 850, 1200],
    '8': [1600, 1400, 1200, 800, 450, 150, 50, 80, 300, 700, 1100, 1500],
  }

  return profiles[climateZone] || profiles['5A']
}

/**
 * Estimate climate zone from latitude (very rough approximation).
 */
export function estimateClimateZoneFromLatitude(latitude: number): ClimateZone {
  const absLat = Math.abs(latitude)
  if (absLat < 25) return '1A'
  if (absLat < 30) return '2A'
  if (absLat < 35) return '3A'
  if (absLat < 38) return '4A'
  if (absLat < 42) return '5A'
  if (absLat < 47) return '6A'
  if (absLat < 55) return '7'
  return '8'
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate monthly HDD data for reasonableness.
 */
export function validateMonthlyHDD(monthlyHdd: number[]): { valid: boolean; error?: string } {
  if (monthlyHdd.length !== 12) {
    return { valid: false, error: `Expected 12 months, got ${monthlyHdd.length}` }
  }

  if (monthlyHdd.some(h => h < 0)) {
    return { valid: false, error: 'HDD values must be non-negative' }
  }

  if (monthlyHdd.some(h => h > 2000)) {
    return { valid: false, error: 'HDD values seem unreasonably high (>2000 per month)' }
  }

  // Check summer months (Jun, Jul, Aug - indices 5, 6, 7)
  const summerAvg = (monthlyHdd[5] + monthlyHdd[6] + monthlyHdd[7]) / 3
  if (summerAvg > 200) {
    return { valid: false, error: 'Summer months have unusually high HDD (>200 average)' }
  }

  return { valid: true }
}

/**
 * Get annual total HDD.
 */
export function getAnnualHDD(monthlyHdd: number[]): number {
  return monthlyHdd.reduce((sum, hdd) => sum + hdd, 0)
}
