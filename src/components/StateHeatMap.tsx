/**
 * Region Heat Map - Full-width results section showing metrics by region.
 * Supports: US states and Canadian provinces.
 * Metrics: Savings % vs fuel, COPe, and Subsidy % views.
 */

import { useState, useMemo } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { ChevronDown, ChevronUp, Map, HelpCircle } from 'lucide-react'
import {
  BTCMetrics,
  FuelType,
  FUEL_SPECS,
  calculateArbitrage,
  calculateCOPe,
  formatCOPe,
} from '../calculations/hashrate'
import {
  Country,
  COUNTRIES,
  getDefaultFuelRate,
  getCurrencySymbol,
} from '../data/fuelPrices'

// Map URLs by country
const GEO_URLS: Record<Country, string> = {
  US: 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json',
  CA: 'https://gist.githubusercontent.com/Saw-mon-and-Natalie/a11f058fc0dcce9343b02498a46b3d44/raw/canada.json',
}

// Map projections by country
const MAP_PROJECTIONS: Record<Country, { projection: string; scale: number; center?: [number, number] }> = {
  US: { projection: 'geoAlbersUsa', scale: 1100 },
  CA: { projection: 'geoMercator', scale: 450, center: [-96, 60] },
}

// Mini map projections (smaller scale)
const MINI_MAP_PROJECTIONS: Record<Country, { projection: string; scale: number; center?: [number, number] }> = {
  US: { projection: 'geoAlbersUsa', scale: 380 },
  CA: { projection: 'geoMercator', scale: 150, center: [-96, 60] },
}

// Map region names from TopoJSON to our abbreviations - US States
const US_NAME_TO_ABBR: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
  'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
  'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
  'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
  'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
  'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
  'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
  'Wisconsin': 'WI', 'Wyoming': 'WY',
}

// Map region names from TopoJSON to our abbreviations - Canadian Provinces
const CA_NAME_TO_ABBR: Record<string, string> = {
  'Alberta': 'AB',
  'British Columbia': 'BC',
  'Manitoba': 'MB',
  'New Brunswick': 'NB',
  'Newfoundland and Labrador': 'NL',
  'Nova Scotia': 'NS',
  'Northwest Territories': 'NT',
  'Nunavut': 'NU',
  'Ontario': 'ON',
  'Prince Edward Island': 'PE',
  'Quebec': 'QC',
  'Saskatchewan': 'SK',
  'Yukon': 'YT',
}

// Get name to abbr mapping for country
const NAME_TO_ABBR: Record<Country, Record<string, string>> = {
  US: US_NAME_TO_ABBR,
  CA: CA_NAME_TO_ABBR,
}

// Metric types
type MapMetric = 'savings' | 'cope' | 'subsidy'

const METRIC_LABELS: Record<MapMetric, string> = {
  savings: 'Savings %',
  cope: 'COPe',
  subsidy: 'Subsidy %',
}

interface StateHeatMapProps {
  country: Country
  btcMetrics: BTCMetrics | null
  selectedFuelType: FuelType
  onFuelTypeChange: (fuel: FuelType) => void
  onRegionClick?: (regionCode: string) => void
  minerPowerW: number
  minerHashrateTH: number
  // Props for "YOU" row and selection highlighting
  selectedRegion: string
  userElectricityRate: number
  userFuelRate: number
  userFuelEfficiency: number
  defaultElectricityRate: number
  defaultFuelRate: number
}

interface StateMetrics {
  abbr: string
  name: string
  electricityRate: number
  fuelRate: number
  savings: number
  cope: number
  subsidy: number
}

/**
 * Get color for a metric value based on metric type.
 */
function getColorForMetric(value: number, metric: MapMetric): string {
  switch (metric) {
    case 'savings':
      if (value < -20) return '#dc2626'
      if (value < 0) return '#f87171'
      if (value < 20) return '#fbbf24'
      if (value < 50) return '#4ade80'
      return '#16a34a'

    case 'cope':
      if (value < 1.5) return '#dc2626'
      if (value < 2.0) return '#f87171'
      if (value < 3.0) return '#fbbf24'
      if (value < 5.0) return '#4ade80'
      return '#16a34a'

    case 'subsidy':
      if (value < 30) return '#dc2626'
      if (value < 50) return '#f87171'
      if (value < 70) return '#fbbf24'
      if (value < 100) return '#4ade80'
      return '#16a34a'

    default:
      return '#9ca3af'
  }
}

/**
 * Get legend configuration for a metric type.
 */
function getLegendForMetric(metric: MapMetric): { color: string; label: string }[] {
  switch (metric) {
    case 'savings':
      return [
        { color: '#dc2626', label: '<-20%' },
        { color: '#f87171', label: '-20–0%' },
        { color: '#fbbf24', label: '0–20%' },
        { color: '#4ade80', label: '20–50%' },
        { color: '#16a34a', label: '>50%' },
      ]
    case 'cope':
      return [
        { color: '#dc2626', label: '<1.5' },
        { color: '#f87171', label: '1.5–2' },
        { color: '#fbbf24', label: '2–3' },
        { color: '#4ade80', label: '3–5' },
        { color: '#16a34a', label: '>5' },
      ]
    case 'subsidy':
      return [
        { color: '#dc2626', label: '<30%' },
        { color: '#f87171', label: '30–50%' },
        { color: '#fbbf24', label: '50–70%' },
        { color: '#4ade80', label: '70–100%' },
        { color: '#16a34a', label: '>100%' },
      ]
    default:
      return []
  }
}

/**
 * Format metric value for display.
 */
function formatMetricValue(value: number, metric: MapMetric): string {
  switch (metric) {
    case 'savings':
      return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
    case 'cope':
      return formatCOPe(value)
    case 'subsidy':
      return `${value.toFixed(0)}%`
    default:
      return value.toString()
  }
}

export default function StateHeatMap({
  country,
  btcMetrics,
  selectedFuelType,
  onFuelTypeChange,
  onRegionClick,
  minerPowerW,
  minerHashrateTH,
  selectedRegion,
  userElectricityRate,
  userFuelRate,
  userFuelEfficiency,
  defaultElectricityRate,
  defaultFuelRate,
}: StateHeatMapProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<MapMetric>('savings')
  const [hoveredState, setHoveredState] = useState<StateMetrics | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  // Get country-specific data
  const countryData = COUNTRIES[country]
  const currencySymbol = getCurrencySymbol(country)
  const geoUrl = GEO_URLS[country]
  const nameToAbbr = NAME_TO_ABBR[country]
  const mapProjection = MAP_PROJECTIONS[country]
  const miniMapProjection = MINI_MAP_PROJECTIONS[country]
  const regionLabel = country === 'US' ? 'State' : 'Province'
  const regionLabelPlural = country === 'US' ? 'states' : 'provinces'

  // Calculate all metrics for all regions using user's miner specs
  const stateMetricsMap = useMemo(() => {
    const emptyMap: Map<string, StateMetrics> = new globalThis.Map()
    if (!btcMetrics) return emptyMap

    const result: Map<string, StateMetrics> = new globalThis.Map()
    const miner = {
      name: 'User Miner',
      powerW: minerPowerW,
      hashrateTH: minerHashrateTH,
    }

    Object.entries(countryData.regions).forEach(([abbr, regionInfo]) => {
      const prices = regionInfo.prices
      const electricityRate = prices.electricity
      const fuelRate = getDefaultFuelRate(selectedFuelType, prices, country)

      const copeResult = calculateCOPe(electricityRate, miner, btcMetrics)
      const arbitrage = calculateArbitrage(
        selectedFuelType,
        fuelRate,
        electricityRate,
        miner,
        btcMetrics,
        1500,
        FUEL_SPECS[selectedFuelType].typicalEfficiency
      )

      result.set(abbr, {
        abbr,
        name: regionInfo.name,
        electricityRate,
        fuelRate,
        savings: arbitrage.savingsPercent,
        cope: copeResult.COPe,
        subsidy: copeResult.R * 100,
      })
    })

    return result
  }, [btcMetrics, selectedFuelType, minerPowerW, minerHashrateTH, countryData])

  // Detect if user has custom inputs (different from regional defaults or typical efficiency)
  const defaultEfficiency = FUEL_SPECS[selectedFuelType].typicalEfficiency
  const hasCustomInputs = useMemo(() => {
    const elecDiff = Math.abs(userElectricityRate - defaultElectricityRate)
    const fuelDiff = Math.abs(userFuelRate - defaultFuelRate)
    const effDiff = Math.abs(userFuelEfficiency - defaultEfficiency)
    return elecDiff > 0.001 || fuelDiff > 0.001 || effDiff > 0.001
  }, [userElectricityRate, defaultElectricityRate, userFuelRate, defaultFuelRate, userFuelEfficiency, defaultEfficiency])

  // Calculate "YOU" metrics using user's custom inputs
  const youMetrics = useMemo((): StateMetrics | null => {
    if (!btcMetrics || !hasCustomInputs) return null

    const miner = {
      name: 'User Miner',
      powerW: minerPowerW,
      hashrateTH: minerHashrateTH,
    }

    const copeResult = calculateCOPe(userElectricityRate, miner, btcMetrics)
    const arbitrage = calculateArbitrage(
      selectedFuelType,
      userFuelRate,
      userElectricityRate,
      miner,
      btcMetrics,
      1500,
      userFuelEfficiency
    )

    return {
      abbr: 'YOU',
      name: 'Your Custom Rates',
      electricityRate: userElectricityRate,
      fuelRate: userFuelRate,
      savings: arbitrage.savingsPercent,
      cope: copeResult.COPe,
      subsidy: copeResult.R * 100,
    }
  }, [btcMetrics, hasCustomInputs, userElectricityRate, userFuelRate, userFuelEfficiency, minerPowerW, minerHashrateTH, selectedFuelType])

  // Sort states by selected metric for mobile table
  const sortedStates = useMemo((): StateMetrics[] => {
    const states = Array.from(stateMetricsMap.values())

    // Add "YOU" entry if user has custom rates
    if (youMetrics) {
      states.push(youMetrics)
    }

    return states.sort((a: StateMetrics, b: StateMetrics) => {
      const aVal = a[selectedMetric]
      const bVal = b[selectedMetric]
      const aNum = isFinite(aVal) ? aVal : 9999
      const bNum = isFinite(bVal) ? bVal : 9999
      return bNum - aNum
    })
  }, [stateMetricsMap, selectedMetric, youMetrics])

  const handleMouseMove = (event: React.MouseEvent) => {
    setTooltipPosition({ x: event.clientX, y: event.clientY })
  }

  if (!btcMetrics) {
    return null
  }

  const fuelLabel = FUEL_SPECS[selectedFuelType].label
  const metricLabel = METRIC_LABELS[selectedMetric]
  const legend = getLegendForMetric(selectedMetric)
  const getMetricValue = (state: StateMetrics): number => state[selectedMetric]

  // Render mini map for collapsed state
  const renderMiniMap = () => (
    <div className="w-32 sm:w-40 h-14 sm:h-16 flex-shrink-0 overflow-hidden rounded bg-gray-100 dark:bg-gray-700">
      <ComposableMap
        projection={miniMapProjection.projection as any}
        projectionConfig={{
          scale: miniMapProjection.scale,
          center: miniMapProjection.center,
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const regionName = geo.properties.name || geo.properties.NAME
              const regionAbbr = nameToAbbr[regionName]
              const regionData = regionAbbr ? stateMetricsMap.get(regionAbbr) : null
              const metricValue = regionData ? getMetricValue(regionData) : 0
              const color = getColorForMetric(metricValue, selectedMetric)

              const isSelected = regionAbbr === selectedRegion

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={color}
                  stroke={isSelected ? '#2563eb' : '#fff'}
                  strokeWidth={isSelected ? 3 : 0.3}
                  style={{
                    default: { outline: 'none' },
                    hover: { outline: 'none' },
                    pressed: { outline: 'none' },
                  }}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  )

  // Render state table for mobile and large screen sidebar
  const renderStateTable = () => (
    <div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        {regionLabelPlural.charAt(0).toUpperCase() + regionLabelPlural.slice(1)} ranked by {metricLabel}:
      </div>
      <div className="max-h-80 lg:max-h-[400px] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
            <tr className="text-left text-gray-500 dark:text-gray-400">
              <th className="py-2 px-3">{regionLabel}</th>
              <th className="py-2 px-3">Elec.</th>
              <th className="py-2 px-3 text-right">{metricLabel}</th>
            </tr>
          </thead>
          <tbody>
            {sortedStates.map((state) => {
              const metricValue = getMetricValue(state)
              const isYou = state.abbr === 'YOU'
              const isSelected = state.abbr === selectedRegion

              return (
                <tr
                  key={state.abbr}
                  onClick={() => !isYou && onRegionClick?.(state.abbr)}
                  className={`
                    border-t border-gray-100 dark:border-gray-700
                    ${isYou
                      ? 'bg-primary-50 dark:bg-primary-900/30 cursor-default'
                      : isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer'
                    }
                  `}
                >
                  <td className={`py-2 px-3 font-medium ${
                    isYou
                      ? 'text-primary-600 dark:text-primary-400'
                      : isSelected
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {isYou ? '★ YOU' : state.abbr}
                  </td>
                  <td className={`py-2 px-3 ${
                    isYou || isSelected
                      ? 'text-gray-700 dark:text-gray-300'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {currencySymbol}{state.electricityRate.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-white text-[10px] font-medium"
                      style={{ backgroundColor: getColorForMetric(metricValue, selectedMetric) }}
                    >
                      {formatMetricValue(metricValue, selectedMetric)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

  // Render full interactive map for expanded state
  const renderFullMap = () => (
    <div
      className="h-[350px] sm:h-[400px] relative"
      onMouseMove={handleMouseMove}
    >
      <ComposableMap
        projection={mapProjection.projection as any}
        projectionConfig={{
          scale: mapProjection.scale,
          center: mapProjection.center,
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const regionName = geo.properties.name || geo.properties.NAME
              const regionAbbr = nameToAbbr[regionName]
              const regionData = regionAbbr ? stateMetricsMap.get(regionAbbr) : null
              const metricValue = regionData ? getMetricValue(regionData) : 0
              const color = getColorForMetric(metricValue, selectedMetric)

              const isSelected = regionAbbr === selectedRegion

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={color}
                  stroke={isSelected ? '#2563eb' : '#fff'}
                  strokeWidth={isSelected ? 4 : 0.5}
                  style={{
                    default: { outline: 'none' },
                    hover: { outline: 'none', fill: '#3b82f6', cursor: 'pointer' },
                    pressed: { outline: 'none' },
                  }}
                  onMouseEnter={() => {
                    if (regionData) setHoveredState(regionData)
                  }}
                  onMouseLeave={() => setHoveredState(null)}
                  onClick={() => {
                    if (regionAbbr && onRegionClick) {
                      onRegionClick(regionAbbr)
                    }
                  }}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>

      {/* Tooltip */}
      {hoveredState && (
        <div
          className="fixed z-50 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg pointer-events-none"
          style={{
            left: tooltipPosition.x + 12,
            top: tooltipPosition.y - 12,
          }}
        >
          <div className="font-semibold text-sm">{hoveredState.name}</div>
          <div className="mt-1.5 space-y-0.5 text-gray-300">
            <div>Electricity: {currencySymbol}{hoveredState.electricityRate.toFixed(3)}/kWh</div>
            {selectedMetric === 'savings' && (
              <div>{fuelLabel}: {currencySymbol}{hoveredState.fuelRate.toFixed(2)}/{FUEL_SPECS[selectedFuelType].unit}</div>
            )}
          </div>
          <div className="pt-1.5 mt-1.5 border-t border-gray-700 space-y-0.5">
            <div className={selectedMetric === 'savings' ? 'text-white font-medium' : 'text-gray-300'}>
              Savings: {formatMetricValue(hoveredState.savings, 'savings')}
            </div>
            <div className={selectedMetric === 'cope' ? 'text-white font-medium' : 'text-gray-300'}>
              COPe: {formatMetricValue(hoveredState.cope, 'cope')}
            </div>
            <div className={selectedMetric === 'subsidy' ? 'text-white font-medium' : 'text-gray-300'}>
              Subsidy: {formatMetricValue(hoveredState.subsidy, 'subsidy')}
            </div>
          </div>
          <div className="mt-1.5 text-gray-400 text-[10px]">Click to select {regionLabel.toLowerCase()}</div>
        </div>
      )}
    </div>
  )

  return (
    <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
      {/* Collapsed State: Thin preview bar */}
      {!isExpanded && (
        <div
          className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-surface-700/50 transition-colors"
          onClick={() => setIsExpanded(true)}
        >
          {/* Mini map thumbnail */}
          {renderMiniMap()}

          {/* Label */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-primary-500 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {regionLabel} Average Comparison
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {metricLabel} across all {countryData.name} {regionLabelPlural}
              {selectedMetric === 'savings' && ` vs ${fuelLabel}`}
            </div>
          </div>

          {/* Mini legend */}
          <div className="hidden sm:flex gap-0.5">
            {legend.map((item, i) => (
              <div
                key={i}
                className="w-4 h-3 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
            ))}
          </div>

          {/* Expand button */}
          <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors">
            <ChevronDown className="w-4 h-4" />
            <span className="hidden sm:inline">Expand</span>
          </button>
        </div>
      )}

      {/* Expanded State: Full map with controls */}
      {isExpanded && (
        <div className="p-4 sm:p-6">
          {/* Header with controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Map className="w-5 h-5 text-primary-500" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {regionLabel} Average Comparison
              </h3>
              {/* Info tooltip */}
              <div className="relative group/map">
                <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 p-4 bg-gray-900 text-white text-xs rounded-xl shadow-xl scale-95 opacity-0 pointer-events-none group-hover/map:scale-100 group-hover/map:opacity-100 group-hover/map:pointer-events-auto transition-all duration-150 z-[100]">
                  <div className="font-semibold text-sm mb-2">How This Map Works</div>
                  <p className="text-gray-300 mb-3">
                    Compares hashrate heating economics across all {countryData.name} {regionLabelPlural} using <span className="text-white font-medium">your miner specs</span> but each {regionLabel.toLowerCase()}'s <span className="text-white font-medium">average energy rates</span> (not your custom rates). This shows where hashrate heating is most favorable geographically.
                  </p>

                  <div className="font-semibold text-sm mb-2 pt-2 border-t border-gray-700">Metrics Explained</div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-primary-400 font-medium">Savings %</span>
                      <span className="text-gray-400"> — </span>
                      <span className="text-gray-300">Cost savings vs the selected fuel type. Influenced by: electricity rate, fuel rate, fuel efficiency, and mining revenue (BTC price & network hashrate).</span>
                    </div>
                    <div>
                      <span className="text-primary-400 font-medium">COPe</span>
                      <span className="text-gray-400"> — </span>
                      <span className="text-gray-300">Economic Coefficient of Performance. How much more efficient hashrate heating is vs electric resistance. Influenced by: electricity rate and mining revenue only (fuel-independent).</span>
                    </div>
                    <div>
                      <span className="text-primary-400 font-medium">Subsidy %</span>
                      <span className="text-gray-400"> — </span>
                      <span className="text-gray-300">Percentage of electricity cost offset by mining revenue. 100% = free heating. Influenced by: electricity rate and mining revenue (fuel-independent).</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-700 text-gray-400 text-[10px]">
                    Click any {regionLabel.toLowerCase()} to select it and update the calculator above with that {regionLabel.toLowerCase()}'s average rates.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Metric selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-gray-400">Show:</label>
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value as MapMetric)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="savings">Savings %</option>
                  <option value="cope">COPe</option>
                  <option value="subsidy">Subsidy %</option>
                </select>
              </div>

              {/* Fuel selector - only for savings metric */}
              {selectedMetric === 'savings' && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400">vs:</label>
                  <select
                    value={selectedFuelType}
                    onChange={(e) => onFuelTypeChange(e.target.value as FuelType)}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {Object.entries(FUEL_SPECS)
                      .filter(([key]) => country !== 'US' || key !== 'wood_pellets')
                      .map(([key, spec]) => (
                        <option key={key} value={key}>
                          {spec.label}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Collapse button */}
              <button
                onClick={() => setIsExpanded(false)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <ChevronUp className="w-4 h-4" />
                <span>Collapse</span>
              </button>
            </div>
          </div>

          {/* Large screens: Map + Table side by side */}
          <div className="hidden lg:flex lg:gap-6">
            <div className="flex-1">
              {renderFullMap()}
            </div>
            <div className="w-80 flex-shrink-0">
              {renderStateTable()}
            </div>
          </div>

          {/* Medium screens: Map only */}
          <div className="hidden sm:block lg:hidden">
            {renderFullMap()}
          </div>

          {/* Mobile: Table only */}
          <div className="sm:hidden">
            {renderStateTable()}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {legend.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div
                  className="w-4 h-3 rounded"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Hint text */}
          <div className="text-center mt-3">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Click a {regionLabel.toLowerCase()} to select it in the calculator above
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
