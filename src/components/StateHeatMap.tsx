/**
 * US State Heat Map - Shows metrics by state for hashrate heating analysis.
 * Supports: Savings % vs fuel, COPe, and Subsidy % views.
 */

import { useState, useMemo } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  BTCMetrics,
  FuelType,
  FUEL_SPECS,
  DEFAULT_CUSTOM_MINER,
  calculateArbitrage,
  calculateCOPe,
  formatCOPe,
} from '../calculations/hashrate'
import { STATE_FUEL_PRICES, getDefaultFuelRate } from '../data/fuelPrices'

// US TopoJSON from CDN
const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

// Map state names from TopoJSON to our abbreviations
const STATE_NAME_TO_ABBR: Record<string, string> = {
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

// Metric types
type MapMetric = 'savings' | 'cope' | 'subsidy'

const METRIC_LABELS: Record<MapMetric, string> = {
  savings: 'Savings %',
  cope: 'COPe',
  subsidy: 'Subsidy %',
}

interface StateHeatMapProps {
  btcMetrics: BTCMetrics | null
  selectedFuelType: FuelType
  onFuelTypeChange: (fuel: FuelType) => void
  onStateClick?: (stateAbbr: string) => void
}

interface StateMetrics {
  abbr: string
  name: string
  electricityRate: number
  fuelRate: number
  savings: number    // % savings vs fuel
  cope: number       // COPe value
  subsidy: number    // Heating subsidy % (R × 100)
}

/**
 * Get color for a metric value based on metric type.
 */
function getColorForMetric(value: number, metric: MapMetric): string {
  switch (metric) {
    case 'savings':
      if (value < -20) return '#dc2626'      // Dark red
      if (value < 0) return '#f87171'         // Light red
      if (value < 20) return '#fbbf24'        // Yellow
      if (value < 50) return '#4ade80'        // Light green
      return '#16a34a'                        // Dark green

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
        { color: '#f87171', label: '-20% to 0%' },
        { color: '#fbbf24', label: '0% to 20%' },
        { color: '#4ade80', label: '20% to 50%' },
        { color: '#16a34a', label: '>50%' },
      ]
    case 'cope':
      return [
        { color: '#dc2626', label: '<1.5' },
        { color: '#f87171', label: '1.5-2.0' },
        { color: '#fbbf24', label: '2.0-3.0' },
        { color: '#4ade80', label: '3.0-5.0' },
        { color: '#16a34a', label: '>5.0' },
      ]
    case 'subsidy':
      return [
        { color: '#dc2626', label: '<30%' },
        { color: '#f87171', label: '30-50%' },
        { color: '#fbbf24', label: '50-70%' },
        { color: '#4ade80', label: '70-100%' },
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
  btcMetrics,
  selectedFuelType,
  onFuelTypeChange,
  onStateClick,
}: StateHeatMapProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<MapMetric>('savings')
  const [hoveredState, setHoveredState] = useState<StateMetrics | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  // Calculate all metrics for all states
  const stateMetricsMap = useMemo(() => {
    if (!btcMetrics) return new Map<string, StateMetrics>()

    const result = new Map<string, StateMetrics>()
    const miner = DEFAULT_CUSTOM_MINER

    Object.entries(STATE_FUEL_PRICES).forEach(([abbr, stateInfo]) => {
      const prices = stateInfo.prices
      const electricityRate = prices.electricity
      const fuelRate = getDefaultFuelRate(selectedFuelType, prices)

      // Calculate COPe and subsidy (independent of fuel type)
      const copeResult = calculateCOPe(electricityRate, miner, btcMetrics)

      // Calculate savings vs fuel
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
        name: stateInfo.name,
        electricityRate,
        fuelRate,
        savings: arbitrage.savingsPercent,
        cope: copeResult.COPe,
        subsidy: copeResult.R * 100,
      })
    })

    return result
  }, [btcMetrics, selectedFuelType])

  // Sort states by selected metric for mobile table
  const sortedStates = useMemo(() => {
    return Array.from(stateMetricsMap.values()).sort((a, b) => {
      const aVal = a[selectedMetric]
      const bVal = b[selectedMetric]
      // Handle infinity for COPe (treat as very high)
      const aNum = isFinite(aVal) ? aVal : 9999
      const bNum = isFinite(bVal) ? bVal : 9999
      return bNum - aNum
    })
  }, [stateMetricsMap, selectedMetric])

  const handleMouseMove = (event: React.MouseEvent) => {
    setTooltipPosition({ x: event.clientX, y: event.clientY })
  }

  if (!btcMetrics) {
    return null
  }

  const fuelLabel = FUEL_SPECS[selectedFuelType].label
  const metricLabel = METRIC_LABELS[selectedMetric]
  const legend = getLegendForMetric(selectedMetric)

  // Get current metric value for a state
  const getMetricValue = (state: StateMetrics): number => state[selectedMetric]

  return (
    <div className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      {/* Header - always visible */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {metricLabel} by State
          {selectedMetric === 'savings' && ` vs ${fuelLabel}`}
        </span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>Collapse</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              <span>Expand</span>
            </>
          )}
        </button>
      </div>

      {/* Map - always visible, height changes */}
      <div
        className={`transition-all duration-300 overflow-hidden rounded-lg ${
          isExpanded ? 'h-[300px]' : 'h-[120px] cursor-pointer'
        }`}
        onClick={!isExpanded ? () => setIsExpanded(true) : undefined}
        onMouseMove={isExpanded ? handleMouseMove : undefined}
      >
        {/* Desktop Map */}
        <div className="hidden sm:block h-full">
          <ComposableMap
            projection="geoAlbersUsa"
            projectionConfig={{ scale: isExpanded ? 1000 : 700 }}
            style={{ width: '100%', height: '100%' }}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const stateName = geo.properties.name
                  const stateAbbr = STATE_NAME_TO_ABBR[stateName]
                  const stateData = stateAbbr ? stateMetricsMap.get(stateAbbr) : null
                  const metricValue = stateData ? getMetricValue(stateData) : 0
                  const color = getColorForMetric(metricValue, selectedMetric)

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={color}
                      stroke="#fff"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: 'none' },
                        hover: isExpanded
                          ? { outline: 'none', fill: '#3b82f6', cursor: 'pointer' }
                          : { outline: 'none' },
                        pressed: { outline: 'none' },
                      }}
                      onMouseEnter={() => {
                        if (isExpanded && stateData) setHoveredState(stateData)
                      }}
                      onMouseLeave={() => {
                        if (isExpanded) setHoveredState(null)
                      }}
                      onClick={() => {
                        if (isExpanded && stateAbbr && onStateClick) {
                          onStateClick(stateAbbr)
                        }
                      }}
                    />
                  )
                })
              }
            </Geographies>
          </ComposableMap>
        </div>

        {/* Mobile - Mini legend bar when collapsed */}
        <div className="sm:hidden h-full flex items-center justify-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            <div className="flex gap-1 justify-center mb-1">
              {legend.map((item, i) => (
                <div
                  key={i}
                  className="w-6 h-3 rounded"
                  style={{ backgroundColor: item.color }}
                />
              ))}
            </div>
            <span>Tap to {isExpanded ? 'see table' : 'expand'}</span>
          </div>
        </div>
      </div>

      {/* Tooltip - only when expanded and hovering */}
      {hoveredState && isExpanded && (
        <div
          className="fixed z-50 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
          }}
        >
          <div className="font-semibold">{hoveredState.name}</div>
          <div className="mt-1 space-y-0.5 text-gray-300">
            <div>Electricity: ${hoveredState.electricityRate.toFixed(3)}/kWh</div>
            {selectedMetric === 'savings' && (
              <div>{fuelLabel}: ${hoveredState.fuelRate.toFixed(2)}/{FUEL_SPECS[selectedFuelType].unit}</div>
            )}
            <div className="pt-1 border-t border-gray-700 mt-1 space-y-0.5">
              <div className={selectedMetric === 'savings' ? 'text-white font-medium' : ''}>
                Savings: {formatMetricValue(hoveredState.savings, 'savings')}
              </div>
              <div className={selectedMetric === 'cope' ? 'text-white font-medium' : ''}>
                COPe: {formatMetricValue(hoveredState.cope, 'cope')}
              </div>
              <div className={selectedMetric === 'subsidy' ? 'text-white font-medium' : ''}>
                Subsidy: {formatMetricValue(hoveredState.subsidy, 'subsidy')}
              </div>
            </div>
          </div>
          <div className="mt-1 text-gray-400 text-[10px]">Click to select</div>
        </div>
      )}

      {/* Expanded controls */}
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Selectors row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">Metric:</label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as MapMetric)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {Object.entries(FUEL_SPECS).map(([key, spec]) => (
                    <option key={key} value={key}>
                      {spec.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {legend.map((item, i) => (
              <div key={i} className="flex items-center gap-1">
                <div
                  className="w-4 h-3 rounded"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Mobile Table */}
          <div className="sm:hidden">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              States ranked by {metricLabel}:
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                  <tr className="text-left text-gray-500 dark:text-gray-400">
                    <th className="py-1 pr-2">State</th>
                    <th className="py-1 pr-2">Elec.</th>
                    <th className="py-1 text-right">{metricLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStates.map((state) => {
                    const metricValue = getMetricValue(state)
                    return (
                      <tr
                        key={state.abbr}
                        onClick={() => onStateClick?.(state.abbr)}
                        className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <td className="py-1.5 pr-2 font-medium text-gray-900 dark:text-gray-100">
                          {state.abbr}
                        </td>
                        <td className="py-1.5 pr-2 text-gray-600 dark:text-gray-400">
                          ${state.electricityRate.toFixed(2)}
                        </td>
                        <td className="py-1.5 text-right">
                          <span
                            className="px-1.5 py-0.5 rounded text-white text-[10px] font-medium"
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
        </div>
      )}

      {/* Collapsed hint */}
      {!isExpanded && (
        <div className="hidden sm:flex justify-center mt-1">
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            Click map to expand
          </span>
        </div>
      )}
    </div>
  )
}
