import { useState, useMemo, useEffect, useCallback } from 'react'
import { Flame, Zap, Info, Loader2, HelpCircle, TrendingUp, Percent, DollarSign, Thermometer, RefreshCw, Pencil, Gauge, ChevronDown } from 'lucide-react'

import InputField from '../components/InputField'
import SelectField from '../components/SelectField'
import StateHeatMap from '../components/StateHeatMap'

import {
  calculateCOPe,
  calculateArbitrage,
  getMinerEfficiency,
  formatCOPe,
  DEFAULT_CUSTOM_MINER,
  MINER_PRESETS,
  FUEL_SPECS,
  FuelType,
  MinerSpec,
  BTCMetrics,
} from '../calculations/hashrate'

import { getBraiinsData, BraiinsMetrics } from '../api/bitcoin'
import {
  STATES_LIST,
  getStatePrices,
  getDefaultFuelRate,
} from '../data/fuelPrices'

// Tooltip component
function Tooltip({ content }: { content: string }) {
  return (
    <div className="group/tooltip relative inline-flex items-center">
      <HelpCircle className="w-4 h-4 text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 cursor-help" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-800 dark:bg-surface-700 text-white text-xs rounded-lg scale-95 opacity-0 pointer-events-none group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 group-hover/tooltip:pointer-events-auto transition-all duration-150 w-64 z-[100] shadow-lg">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-800 dark:border-t-surface-700" />
      </div>
    </div>
  )
}

// Savings Chart component
type ChartXAxisOption = 'electricity' | 'fuel' | 'efficiency' | 'hashprice'

interface SavingsChartProps {
  data: { x: number; y: number }[]
  currentX: number
  config: { min: number; max: number; unit: string; label: string }
  xAxisOption: ChartXAxisOption
  onXAxisChange: (option: ChartXAxisOption) => void
  fuelLabel: string
  isElectricFuel: boolean
}

function SavingsChart({
  data,
  currentX,
  config,
  xAxisOption,
  onXAxisChange,
  fuelLabel,
  isElectricFuel,
}: SavingsChartProps) {
  // Chart dimensions
  const width = 320
  const height = 140
  const padding = { top: 20, right: 20, bottom: 35, left: 45 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Calculate Y range
  const yValues = data.map(d => d.y)
  const minY = Math.min(...yValues, 0)
  const maxY = Math.max(...yValues, 10)
  const yRange = maxY - minY || 1

  // Scale functions
  const scaleX = (x: number) => {
    const xRange = config.max - config.min
    return padding.left + ((x - config.min) / xRange) * chartWidth
  }

  const scaleY = (y: number) => {
    return padding.top + chartHeight - ((y - minY) / yRange) * chartHeight
  }

  // Generate path
  const linePath = data.map((d, i) => {
    const x = scaleX(d.x)
    const y = scaleY(d.y)
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  // Find current value on line
  const currentXClamped = Math.max(config.min, Math.min(config.max, currentX))
  const currentXScaled = scaleX(currentXClamped)

  // Interpolate Y value at currentX
  let currentY = 0
  for (let i = 0; i < data.length - 1; i++) {
    if (currentXClamped >= data[i].x && currentXClamped <= data[i + 1].x) {
      const t = (currentXClamped - data[i].x) / (data[i + 1].x - data[i].x)
      currentY = data[i].y + t * (data[i + 1].y - data[i].y)
      break
    }
  }
  // Handle edge cases
  if (currentXClamped <= data[0].x) currentY = data[0].y
  if (currentXClamped >= data[data.length - 1].x) currentY = data[data.length - 1].y

  const currentYScaled = scaleY(currentY)

  // Zero line position
  const zeroY = scaleY(0)
  const showZeroLine = minY < 0 && maxY > 0

  // X-axis options (filter out fuel rate for electric fuel types)
  const xAxisOptions: { value: ChartXAxisOption; label: string }[] = [
    { value: 'electricity', label: 'Electricity Rate' },
    ...(!isElectricFuel ? [{ value: 'fuel' as ChartXAxisOption, label: 'Fuel Rate' }] : []),
    { value: 'efficiency', label: 'Miner Efficiency' },
    { value: 'hashprice', label: 'Hashprice' },
  ]

  return (
    <div className="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700">
      {/* X-axis selector */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-surface-500 dark:text-surface-400">Vary:</span>
        <select
          value={xAxisOption}
          onChange={(e) => onXAxisChange(e.target.value as ChartXAxisOption)}
          className="text-xs bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded px-2 py-1 text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
          onClick={(e) => e.stopPropagation()}
        >
          {xAxisOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* SVG Chart */}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minHeight: '120px' }}>
        {/* Grid lines - horizontal */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y = padding.top + t * chartHeight
          return (
            <line
              key={i}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="currentColor"
              className="text-surface-200 dark:text-surface-700"
              strokeWidth="1"
            />
          )
        })}

        {/* Zero line (if applicable) */}
        {showZeroLine && (
          <line
            x1={padding.left}
            y1={zeroY}
            x2={width - padding.right}
            y2={zeroY}
            stroke="currentColor"
            className="text-surface-400 dark:text-surface-500"
            strokeWidth="1.5"
            strokeDasharray="4,2"
          />
        )}

        {/* Line path */}
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          className="text-primary-500"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={scaleX(d.x)}
            cy={scaleY(d.y)}
            r="3"
            fill="currentColor"
            className="text-primary-400 dark:text-primary-500"
          />
        ))}

        {/* Current value marker */}
        <circle
          cx={currentXScaled}
          cy={currentYScaled}
          r="6"
          fill="currentColor"
          className="text-amber-500"
          stroke="white"
          strokeWidth="2"
        />

        {/* Current value label */}
        <text
          x={currentXScaled}
          y={currentYScaled - 12}
          textAnchor="middle"
          className="text-[10px] fill-amber-600 dark:fill-amber-400 font-semibold"
        >
          {currentY >= 0 ? '+' : ''}{currentY.toFixed(0)}%
        </text>

        {/* Y-axis labels */}
        <text
          x={padding.left - 5}
          y={padding.top + 4}
          textAnchor="end"
          className="text-[9px] fill-surface-500 dark:fill-surface-400"
        >
          {maxY >= 0 ? '+' : ''}{maxY.toFixed(0)}%
        </text>
        <text
          x={padding.left - 5}
          y={padding.top + chartHeight + 4}
          textAnchor="end"
          className="text-[9px] fill-surface-500 dark:fill-surface-400"
        >
          {minY >= 0 ? '+' : ''}{minY.toFixed(0)}%
        </text>
        {showZeroLine && (
          <text
            x={padding.left - 5}
            y={zeroY + 3}
            textAnchor="end"
            className="text-[9px] fill-surface-500 dark:fill-surface-400 font-medium"
          >
            0%
          </text>
        )}

        {/* X-axis labels */}
        <text
          x={padding.left}
          y={height - 8}
          textAnchor="start"
          className="text-[9px] fill-surface-500 dark:fill-surface-400"
        >
          {config.min.toFixed(2)}
        </text>
        <text
          x={width - padding.right}
          y={height - 8}
          textAnchor="end"
          className="text-[9px] fill-surface-500 dark:fill-surface-400"
        >
          {config.max.toFixed(2)}
        </text>
        <text
          x={width / 2}
          y={height - 5}
          textAnchor="middle"
          className="text-[10px] fill-surface-600 dark:fill-surface-400"
        >
          {config.label} ({config.unit})
        </text>
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-surface-500 dark:text-surface-400">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Current</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-0.5 bg-primary-500 rounded" />
          <span>Savings vs {fuelLabel}</span>
        </div>
      </div>
    </div>
  )
}

// Generic Metric Chart component for COPe and Subsidy
type MetricChartXAxisOption = 'electricity' | 'efficiency' | 'hashprice'

interface MetricChartProps {
  data: { x: number; y: number }[]
  currentX: number
  config: { min: number; max: number; unit: string; label: string }
  xAxisOption: MetricChartXAxisOption
  onXAxisChange: (option: MetricChartXAxisOption) => void
  yAxisFormatter: (value: number) => string
  lineLabel: string
  showReferenceLine?: { value: number; label: string }
  capValue?: number  // Visual cap for infinite values
}

function MetricChart({
  data,
  currentX,
  config,
  xAxisOption,
  onXAxisChange,
  yAxisFormatter,
  lineLabel,
  showReferenceLine,
  capValue,
}: MetricChartProps) {
  // Chart dimensions
  const width = 320
  const height = 140
  const padding = { top: 20, right: 20, bottom: 35, left: 45 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Calculate Y range
  const yValues = data.map(d => d.y)
  const minY = Math.min(...yValues, 0)
  const maxY = Math.max(...yValues, 10)
  const yRange = maxY - minY || 1

  // Scale functions
  const scaleX = (x: number) => {
    const xRange = config.max - config.min
    return padding.left + ((x - config.min) / xRange) * chartWidth
  }

  const scaleY = (y: number) => {
    return padding.top + chartHeight - ((y - minY) / yRange) * chartHeight
  }

  // Generate path
  const linePath = data.map((d, i) => {
    const x = scaleX(d.x)
    const y = scaleY(d.y)
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  // Find current value on line
  const currentXClamped = Math.max(config.min, Math.min(config.max, currentX))
  const currentXScaled = scaleX(currentXClamped)

  // Interpolate Y value at currentX
  let currentY = 0
  for (let i = 0; i < data.length - 1; i++) {
    if (currentXClamped >= data[i].x && currentXClamped <= data[i + 1].x) {
      const t = (currentXClamped - data[i].x) / (data[i + 1].x - data[i].x)
      currentY = data[i].y + t * (data[i + 1].y - data[i].y)
      break
    }
  }
  // Handle edge cases
  if (currentXClamped <= data[0].x) currentY = data[0].y
  if (currentXClamped >= data[data.length - 1].x) currentY = data[data.length - 1].y

  const currentYScaled = scaleY(currentY)

  // Reference line position (e.g., 100% for subsidy)
  const refLineY = showReferenceLine ? scaleY(showReferenceLine.value) : null
  const showRefLine = showReferenceLine && showReferenceLine.value >= minY && showReferenceLine.value <= maxY

  // X-axis options
  const xAxisOptions: { value: MetricChartXAxisOption; label: string }[] = [
    { value: 'electricity', label: 'Electricity Rate' },
    { value: 'efficiency', label: 'Miner Efficiency' },
    { value: 'hashprice', label: 'Hashprice' },
  ]

  // Check if current value is at/above cap (for infinity display)
  const isAtCap = capValue && currentY >= capValue

  return (
    <div className="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700">
      {/* X-axis selector */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-surface-500 dark:text-surface-400">Vary:</span>
        <select
          value={xAxisOption}
          onChange={(e) => onXAxisChange(e.target.value as MetricChartXAxisOption)}
          className="text-xs bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded px-2 py-1 text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
          onClick={(e) => e.stopPropagation()}
        >
          {xAxisOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* SVG Chart */}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minHeight: '120px' }}>
        {/* Grid lines - horizontal */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y = padding.top + t * chartHeight
          return (
            <line
              key={i}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="currentColor"
              className="text-surface-200 dark:text-surface-700"
              strokeWidth="1"
            />
          )
        })}

        {/* Reference line (e.g., 100% for subsidy) */}
        {showRefLine && refLineY !== null && (
          <>
            <line
              x1={padding.left}
              y1={refLineY}
              x2={width - padding.right}
              y2={refLineY}
              stroke="currentColor"
              className="text-green-500 dark:text-green-400"
              strokeWidth="1.5"
              strokeDasharray="4,2"
            />
            <text
              x={width - padding.right + 2}
              y={refLineY + 3}
              className="text-[8px] fill-green-600 dark:fill-green-400"
            >
              {showReferenceLine.label}
            </text>
          </>
        )}

        {/* Line path */}
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          className="text-primary-500"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={scaleX(d.x)}
            cy={scaleY(d.y)}
            r="3"
            fill="currentColor"
            className="text-primary-400 dark:text-primary-500"
          />
        ))}

        {/* Current value marker */}
        <circle
          cx={currentXScaled}
          cy={currentYScaled}
          r="6"
          fill="currentColor"
          className="text-amber-500"
          stroke="white"
          strokeWidth="2"
        />

        {/* Current value label */}
        <text
          x={currentXScaled}
          y={currentYScaled - 12}
          textAnchor="middle"
          className="text-[10px] fill-amber-600 dark:fill-amber-400 font-semibold"
        >
          {isAtCap ? '∞' : yAxisFormatter(currentY)}
        </text>

        {/* Y-axis labels */}
        <text
          x={padding.left - 5}
          y={padding.top + 4}
          textAnchor="end"
          className="text-[9px] fill-surface-500 dark:fill-surface-400"
        >
          {capValue && maxY >= capValue ? '∞' : yAxisFormatter(maxY)}
        </text>
        <text
          x={padding.left - 5}
          y={padding.top + chartHeight + 4}
          textAnchor="end"
          className="text-[9px] fill-surface-500 dark:fill-surface-400"
        >
          {yAxisFormatter(minY)}
        </text>

        {/* X-axis labels */}
        <text
          x={padding.left}
          y={height - 8}
          textAnchor="start"
          className="text-[9px] fill-surface-500 dark:fill-surface-400"
        >
          {config.min.toFixed(2)}
        </text>
        <text
          x={width - padding.right}
          y={height - 8}
          textAnchor="end"
          className="text-[9px] fill-surface-500 dark:fill-surface-400"
        >
          {config.max.toFixed(2)}
        </text>
        <text
          x={width / 2}
          y={height - 5}
          textAnchor="middle"
          className="text-[10px] fill-surface-600 dark:fill-surface-400"
        >
          {config.label} ({config.unit})
        </text>
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-surface-500 dark:text-surface-400">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Current</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-0.5 bg-primary-500 rounded" />
          <span>{lineLabel}</span>
        </div>
      </div>
    </div>
  )
}

// Metric card component
function MetricCard({
  label,
  value,
  subValue,
  secondaryValue,
  tertiaryValue,
  tooltip,
  variant = 'default',
  icon: Icon,
  expandable = false,
  expanded = false,
  onToggle,
  children,
}: {
  label: string
  value: string
  subValue?: string
  secondaryValue?: string
  tertiaryValue?: string
  tooltip?: string
  variant?: 'default' | 'success' | 'warning' | 'highlight'
  icon?: React.ComponentType<{ className?: string }>
  expandable?: boolean
  expanded?: boolean
  onToggle?: () => void
  children?: React.ReactNode
}) {
  const bgColors = {
    default: 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    warning: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    highlight: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  }

  const valueColors = {
    default: 'text-surface-900 dark:text-surface-100',
    success: 'text-green-700 dark:text-green-400',
    warning: 'text-red-700 dark:text-red-400',
    highlight: 'text-blue-700 dark:text-blue-400',
  }

  return (
    <div
      className={`rounded-xl border p-3 sm:p-5 min-h-[120px] sm:min-h-[140px] flex flex-col ${bgColors[variant]} ${expandable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={expandable ? onToggle : undefined}
    >
      <div className="flex items-start justify-between mb-1.5 sm:mb-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {Icon && <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-surface-500 dark:text-surface-400" />}
          <span className="text-xs sm:text-sm font-medium text-surface-600 dark:text-surface-400">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          {tooltip && <Tooltip content={tooltip} />}
          {expandable && (
            <ChevronDown
              className={`w-4 h-4 text-surface-400 dark:text-surface-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            />
          )}
        </div>
      </div>
      <div className={`text-lg sm:text-2xl font-bold ${valueColors[variant]}`}>{value}</div>
      {secondaryValue && (
        <div className="text-sm sm:text-lg font-semibold text-surface-700 dark:text-surface-300 mt-0.5 sm:mt-1">{secondaryValue}</div>
      )}
      {tertiaryValue && (
        <div className="text-xs sm:text-base font-medium text-surface-600 dark:text-surface-400">{tertiaryValue}</div>
      )}
      <div className="flex-grow" />
      {subValue && (
        <div className="text-[10px] sm:text-xs text-surface-500 dark:text-surface-400 mt-1.5 sm:mt-2">{subValue}</div>
      )}
      {/* Expandable content */}
      {expandable && expanded && children}
    </div>
  )
}

export default function HashrateHeating() {
  // ============================================================================
  // State
  // ============================================================================

  // Bitcoin data (from Braiins API)
  const [braiinsData, setBraiinsData] = useState<BraiinsMetrics | null>(null)
  const [loadingBtc, setLoadingBtc] = useState(true)

  // Derived values from Braiins data
  const btcPrice = braiinsData?.btcPrice ?? null
  const networkHashrate = braiinsData?.networkHashrate ?? null
  const difficulty = braiinsData?.difficulty ?? 0

  // Manual overrides for scenario exploration
  const [btcPriceOverride, setBtcPriceOverride] = useState<string>('')
  const [hashvalueOverride, setHashvalueOverride] = useState<string>('')
  const [hashpriceOverride, setHashpriceOverride] = useState<string>('')
  const [networkHashrateOverride, setNetworkHashrateOverride] = useState<string>('')

  // Miner inputs - 'custom' or index into MINER_PRESETS
  const [minerType, setMinerType] = useState('custom')
  const [minerPower, setMinerPower] = useState(DEFAULT_CUSTOM_MINER.powerW.toString())
  const [minerHashrate, setMinerHashrate] = useState(DEFAULT_CUSTOM_MINER.hashrateTH.toString())

  // Electricity inputs
  const [electricityRate, setElectricityRate] = useState('0.12')
  const [billAmount, setBillAmount] = useState('')
  const [billKwh, setBillKwh] = useState('')

  // Fuel inputs
  const [selectedState, setSelectedState] = useState<string>('')
  const [fuelType, setFuelType] = useState<FuelType>('propane')
  const [fuelRate, setFuelRate] = useState('2.75')
  const [fuelEfficiency, setFuelEfficiency] = useState('0.90') // AFUE as decimal or COP

  // Chart expansion state
  const [savingsChartExpanded, setSavingsChartExpanded] = useState(false)
  const [savingsChartXAxis, setSavingsChartXAxis] = useState<'electricity' | 'fuel' | 'efficiency' | 'hashprice'>('electricity')

  // COPe and Subsidy chart state
  const [copeChartExpanded, setCopeChartExpanded] = useState(false)
  const [copeChartXAxis, setCopeChartXAxis] = useState<'electricity' | 'efficiency' | 'hashprice'>('electricity')

  const [subsidyChartExpanded, setSubsidyChartExpanded] = useState(false)
  const [subsidyChartXAxis, setSubsidyChartXAxis] = useState<'electricity' | 'efficiency' | 'hashprice'>('electricity')

  // Sync chart expansion based on grid columns
  // Grid layout: 1 col (< 640px), 2 col (640-1023px), 3 col (>= 1024px)
  // In 2-col: Row 1 = Savings + COPe, Row 2 = Subsidy + non-expandable
  // In 3-col: Row 1 = Savings + COPe + Subsidy (all expandable)
  const SM_BREAKPOINT = 640
  const LG_BREAKPOINT = 1024

  // Track column count: 1, 2, or 3
  const [columnCount, setColumnCount] = useState(() => {
    if (typeof window === 'undefined') return 1
    const w = window.innerWidth
    if (w >= LG_BREAKPOINT) return 3
    if (w >= SM_BREAKPOINT) return 2
    return 1
  })

  // Listen for resize/orientation changes and sync chart states when crossing breakpoints
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth
      const newCount = w >= LG_BREAKPOINT ? 3 : w >= SM_BREAKPOINT ? 2 : 1
      const oldCount = columnCount

      // When increasing columns, sync charts that will be in the same row
      if (newCount > oldCount) {
        if (newCount === 3) {
          // Going to 3 columns: sync all three
          const anyExpanded = savingsChartExpanded || copeChartExpanded || subsidyChartExpanded
          if (anyExpanded) {
            setSavingsChartExpanded(true)
            setCopeChartExpanded(true)
            setSubsidyChartExpanded(true)
          }
        } else if (newCount === 2) {
          // Going to 2 columns: sync Savings and COPe (they're in the same row)
          const row1Expanded = savingsChartExpanded || copeChartExpanded
          if (row1Expanded) {
            setSavingsChartExpanded(true)
            setCopeChartExpanded(true)
          }
        }
      }

      setColumnCount(newCount)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [columnCount, savingsChartExpanded, copeChartExpanded, subsidyChartExpanded])

  const handleChartToggle = useCallback((chart: 'savings' | 'cope' | 'subsidy') => {
    if (columnCount === 3) {
      // 3 columns: all three in same row, sync all
      const anyExpanded = savingsChartExpanded || copeChartExpanded || subsidyChartExpanded
      const newState = !anyExpanded
      setSavingsChartExpanded(newState)
      setCopeChartExpanded(newState)
      setSubsidyChartExpanded(newState)
    } else if (columnCount === 2) {
      // 2 columns: Savings + COPe in row 1, Subsidy alone in row 2
      if (chart === 'savings' || chart === 'cope') {
        // Toggle both Savings and COPe together
        const row1Expanded = savingsChartExpanded || copeChartExpanded
        const newState = !row1Expanded
        setSavingsChartExpanded(newState)
        setCopeChartExpanded(newState)
      } else {
        // Subsidy is alone in its row, toggle individually
        setSubsidyChartExpanded(!subsidyChartExpanded)
      }
    } else {
      // 1 column: toggle individually
      switch (chart) {
        case 'savings':
          setSavingsChartExpanded(!savingsChartExpanded)
          break
        case 'cope':
          setCopeChartExpanded(!copeChartExpanded)
          break
        case 'subsidy':
          setSubsidyChartExpanded(!subsidyChartExpanded)
          break
      }
    }
  }, [columnCount, savingsChartExpanded, copeChartExpanded, subsidyChartExpanded])

  // ============================================================================
  // Effects
  // ============================================================================

  // Fetch BTC data on mount (from Braiins API)
  useEffect(() => {
    async function fetchBtcData() {
      setLoadingBtc(true)
      try {
        const data = await getBraiinsData()
        setBraiinsData(data)
      } catch (error) {
        console.error('Failed to fetch Braiins data:', error)
        // Fallback values are returned by getBraiinsData on error
      } finally {
        setLoadingBtc(false)
      }
    }
    fetchBtcData()
  }, [])

  // Update fuel rate when state or fuel type changes
  useEffect(() => {
    const prices = getStatePrices(selectedState)
    const defaultRate = getDefaultFuelRate(fuelType, prices)
    setFuelRate(defaultRate.toFixed(2))
  }, [selectedState, fuelType])

  // Update fuel efficiency default when fuel type changes
  useEffect(() => {
    const defaultEfficiency = FUEL_SPECS[fuelType].typicalEfficiency
    // For AFUE fuels (< 1), show as percentage; for COP (heat pump), show as decimal
    if (fuelType === 'heat_pump') {
      setFuelEfficiency(defaultEfficiency.toFixed(1))
    } else {
      setFuelEfficiency((defaultEfficiency * 100).toFixed(0))
    }
  }, [fuelType])

  // Update electricity rate when state changes
  useEffect(() => {
    if (selectedState) {
      const prices = getStatePrices(selectedState)
      setElectricityRate(prices.electricity.toFixed(2))
    }
  }, [selectedState])

  // Calculate electricity rate from bill when both values entered
  useEffect(() => {
    const bill = parseFloat(billAmount)
    const kwh = parseFloat(billKwh)
    if (bill > 0 && kwh > 0) {
      const calculatedRate = bill / kwh
      setElectricityRate(calculatedRate.toFixed(3))
    }
  }, [billAmount, billKwh])

  // ============================================================================
  // Derived Values
  // ============================================================================

  // Handler for miner type selection
  const handleMinerTypeChange = (value: string) => {
    setMinerType(value)
    if (value === 'custom') {
      // Reset to default custom miner values
      setMinerPower(DEFAULT_CUSTOM_MINER.powerW.toString())
      setMinerHashrate(DEFAULT_CUSTOM_MINER.hashrateTH.toString())
    } else {
      // It's a preset index
      const presetIndex = parseInt(value, 10)
      const preset = MINER_PRESETS[presetIndex]
      if (preset) {
        setMinerPower(preset.powerW.toString())
        setMinerHashrate(preset.hashrateTH.toString())
      }
    }
  }

  // Handler for power input - auto-switch to custom if different from preset
  const handlePowerChange = (value: string) => {
    setMinerPower(value)
    if (minerType !== 'custom') {
      setMinerType('custom')
    }
  }

  // Handler for hashrate input - auto-switch to custom if different from preset
  const handleHashrateChange = (value: string) => {
    setMinerHashrate(value)
    if (minerType !== 'custom') {
      setMinerType('custom')
    }
  }

  // Handlers for Bitcoin metric overrides with GROUP-based conflict resolution
  // Two independent "knobs":
  //   Knob 1 (Price): BTC Price ↔ Hashprice (editing one implies the other)
  //   Knob 2 (Network): Network Hashrate ↔ Hashvalue (editing one implies the other)

  // Price group handlers
  const handleBtcPriceOverride = (value: string) => {
    setBtcPriceOverride(value)
    setHashpriceOverride('')  // Clear other in same group
  }

  const handleHashpriceOverride = (value: string) => {
    setHashpriceOverride(value)
    setBtcPriceOverride('')   // Clear other in same group
  }

  // Network group handlers
  const handleHashvalueOverride = (value: string) => {
    setHashvalueOverride(value)
    setNetworkHashrateOverride('')  // Clear other in same group
  }

  const handleNetworkHashrateOverride = (value: string) => {
    setNetworkHashrateOverride(value)
    setHashvalueOverride('')  // Clear other in same group
  }

  const miner: MinerSpec = useMemo(() => {
    const power = parseFloat(minerPower) || DEFAULT_CUSTOM_MINER.powerW
    const hashrate = parseFloat(minerHashrate) || DEFAULT_CUSTOM_MINER.hashrateTH

    if (minerType !== 'custom') {
      const presetIndex = parseInt(minerType, 10)
      const preset = MINER_PRESETS[presetIndex]
      if (preset) {
        return preset
      }
    }
    return {
      name: 'Custom',
      powerW: power,
      hashrateTH: hashrate,
    }
  }, [minerType, minerPower, minerHashrate])

  // Check if user has any overrides active
  const hasOverrides = btcPriceOverride !== '' || hashvalueOverride !== '' ||
                       hashpriceOverride !== '' || networkHashrateOverride !== ''

  // ============================================================================
  // TWO-KNOB CALCULATION MODEL
  // ============================================================================
  // Knob 1 (Price): BTC Price ↔ Hashprice
  //   - hashprice = hashvalue × btcPrice / 1e8
  //   - btcPrice = hashprice × 1e8 / hashvalue
  //
  // Knob 2 (Network): Network Hashrate ↔ Hashvalue
  //   - hashvalue = (144 × 3.125 × 1e8) / networkHashrate
  //   - networkHashrate = (144 × 3.125 × 1e8) / hashvalue
  // ============================================================================

  // KNOB 2: Calculate effective network hashrate (Network group)
  // Network Hashrate and Hashvalue are inversely related
  const effectiveNetworkHashrate = useMemo(() => {
    if (networkHashrateOverride) {
      const nh = parseFloat(networkHashrateOverride)
      if (nh > 0) return nh * 1e6 // Convert EH/s to TH/s
    }
    if (hashvalueOverride) {
      const hv = parseFloat(hashvalueOverride)
      if (hv > 0) {
        // Back-calculate: networkHashrate = (144 × 3.125 × 1e8) / hashvalue
        return (144 * 3.125 * 1e8) / hv
      }
    }
    return networkHashrate
  }, [networkHashrateOverride, hashvalueOverride, networkHashrate])

  // Calculate effective hashvalue (derived from network hashrate or Braiins API)
  const effectiveHashvalue = useMemo(() => {
    if (hashvalueOverride) {
      const hv = parseFloat(hashvalueOverride)
      if (hv > 0) return hv
    }
    // If networkHashrate is overridden, recalculate hashvalue for consistency
    if (networkHashrateOverride) {
      const nh = parseFloat(networkHashrateOverride)
      if (nh > 0) return (144 * 3.125 * 1e8) / (nh * 1e6)
    }
    // Use Braiins hashvalue directly (includes fees, more accurate)
    // Convert from BTC/TH/day to sats/TH/day
    if (braiinsData?.hashvalue) {
      return braiinsData.hashvalue * 1e8
    }
    // Fallback: calculate from network hashrate
    if (effectiveNetworkHashrate && effectiveNetworkHashrate > 0) {
      return (144 * 3.125 * 1e8) / effectiveNetworkHashrate
    }
    return null
  }, [hashvalueOverride, networkHashrateOverride, braiinsData, effectiveNetworkHashrate])

  // KNOB 1: Calculate effective BTC price (Price group)
  // BTC Price and Hashprice are directly related via hashvalue
  const effectiveBtcPrice = useMemo(() => {
    if (btcPriceOverride) {
      return parseFloat(btcPriceOverride) || btcPrice
    }
    if (hashpriceOverride && effectiveHashvalue) {
      const hp = parseFloat(hashpriceOverride)
      if (hp > 0 && effectiveHashvalue > 0) {
        // Back-calculate: btcPrice = hashprice × 1e8 / hashvalue
        return (hp * 1e8) / effectiveHashvalue
      }
    }
    return btcPrice
  }, [btcPriceOverride, hashpriceOverride, effectiveHashvalue, btcPrice])

  const btcMetrics: BTCMetrics | null = useMemo(() => {
    if (effectiveBtcPrice === null || effectiveNetworkHashrate === null) return null
    return {
      btcPrice: effectiveBtcPrice,
      networkHashrate: effectiveNetworkHashrate,
      blockReward: 3.125,
    }
  }, [effectiveBtcPrice, effectiveNetworkHashrate])

  // Calculate effective hashprice (from Braiins or derived from btcPrice and hashvalue)
  const effectiveHashprice = useMemo(() => {
    if (hashpriceOverride) {
      const hp = parseFloat(hashpriceOverride)
      if (hp > 0) return hp
    }
    // If btcPrice is overridden, recalculate hashprice for consistency
    if (btcPriceOverride && effectiveHashvalue) {
      const bp = parseFloat(btcPriceOverride)
      if (bp > 0) return (effectiveHashvalue * bp) / 1e8
    }
    // Use Braiins hashprice directly when available
    if (braiinsData?.hashprice) {
      return braiinsData.hashprice
    }
    // Fallback: calculate from btcPrice and hashvalue
    if (effectiveBtcPrice && effectiveHashvalue) {
      return (effectiveHashvalue * effectiveBtcPrice) / 1e8
    }
    return null
  }, [hashpriceOverride, btcPriceOverride, braiinsData, effectiveHashvalue, effectiveBtcPrice])

  const networkMetrics = useMemo(() => {
    if (!btcMetrics || !effectiveHashvalue) return null
    return {
      hashvalue: effectiveHashvalue,
      hashprice: effectiveHashprice || (effectiveHashvalue * btcMetrics.btcPrice) / 1e8,
      networkHashrateEH: btcMetrics.networkHashrate / 1e6,
      difficulty,
    }
  }, [btcMetrics, effectiveHashvalue, effectiveHashprice, difficulty])

  const electricityRateNum = parseFloat(electricityRate) || 0.12
  const fuelRateNum = parseFloat(fuelRate) || 2.75

  // Convert efficiency input to decimal (AFUE is entered as %, COP as decimal)
  const fuelEfficiencyNum = fuelType === 'heat_pump'
    ? (parseFloat(fuelEfficiency) || 3.0)
    : (parseFloat(fuelEfficiency) || 90) / 100

  // Check if fuel type is electric-based (uses electricity rate instead of separate fuel rate)
  const isElectricFuel = fuelType === 'electric_resistance' || fuelType === 'heat_pump'

  // Check if fuel type needs an efficiency input (not electric resistance - always 100%)
  const hasEfficiencyInput = fuelType !== 'electric_resistance'

  // ============================================================================
  // Calculations
  // ============================================================================

  const copeResult = useMemo(() => {
    if (!btcMetrics) return null
    return calculateCOPe(electricityRateNum, miner, btcMetrics)
  }, [electricityRateNum, miner, btcMetrics])

  const arbitrageResult = useMemo(() => {
    if (!btcMetrics) return null
    // For electric fuel types, use the main electricity rate
    const effectiveFuelRate = isElectricFuel ? electricityRateNum : fuelRateNum
    return calculateArbitrage(fuelType, effectiveFuelRate, electricityRateNum, miner, btcMetrics, 1500, fuelEfficiencyNum)
  }, [fuelType, fuelRateNum, electricityRateNum, miner, btcMetrics, isElectricFuel, fuelEfficiencyNum])

  // Calculate fuel-specific equivalent cost for comparison
  // Shows $/therm for nat gas, $/gallon for propane/oil, nothing for electric
  const fuelEquivalentCost = useMemo(() => {
    if (!copeResult) return null

    const costPerKwh = copeResult.effectiveCostPerKwh
    const BTU_PER_KWH = 3412

    switch (fuelType) {
      case 'natural_gas':
        // 1 therm = 100,000 BTU = 29.307 kWh
        return {
          value: costPerKwh * 29.307,
          unit: 'therm',
          label: '$/therm',
        }
      case 'propane':
        // 1 gallon propane = 91,500 BTU = 26.82 kWh
        return {
          value: costPerKwh * (91500 / BTU_PER_KWH),
          unit: 'gal',
          label: '$/gal',
        }
      case 'heating_oil':
        // 1 gallon heating oil = 138,500 BTU = 40.59 kWh
        return {
          value: costPerKwh * (138500 / BTU_PER_KWH),
          unit: 'gal',
          label: '$/gal',
        }
      case 'electric_resistance':
      case 'heat_pump':
        // No third unit needed - already comparing to $/kWh
        return null
      default:
        return null
    }
  }, [copeResult, fuelType])

  const minerEfficiency = getMinerEfficiency(miner)

  // ============================================================================
  // Chart Data Generation
  // ============================================================================

  // X-axis configuration for the savings chart
  const chartXAxisConfig = useMemo(() => {
    const fuelUnit = FUEL_SPECS[fuelType].unit
    return {
      electricity: { min: 0.05, max: 0.30, step: 0.025, unit: '$/kWh', label: 'Electricity Rate' },
      fuel: { min: Math.max(0.5, fuelRateNum * 0.5), max: fuelRateNum * 2, step: (fuelRateNum * 1.5) / 10, unit: `$/${fuelUnit}`, label: `${FUEL_SPECS[fuelType].label} Rate` },
      efficiency: { min: 10, max: 50, step: 4, unit: 'J/TH', label: 'Miner Efficiency' },
      hashprice: { min: 0.02, max: 0.12, step: 0.01, unit: '$/TH/d', label: 'Hashprice' },
    }
  }, [fuelType, fuelRateNum])

  // Calculate savings at a specific X value
  const calculateSavingsAtX = useCallback((xValue: number, xAxis: 'electricity' | 'fuel' | 'efficiency' | 'hashprice'): number => {
    if (!btcMetrics) return 0

    let testElecRate = electricityRateNum
    let testFuelRate = isElectricFuel ? electricityRateNum : fuelRateNum
    let testMiner = miner
    let testBtcMetrics = btcMetrics

    switch (xAxis) {
      case 'electricity':
        testElecRate = xValue
        if (isElectricFuel) testFuelRate = xValue
        break
      case 'fuel':
        testFuelRate = xValue
        break
      case 'efficiency':
        // Adjust miner power to achieve target efficiency (J/TH = W / TH/s)
        testMiner = { ...miner, powerW: xValue * miner.hashrateTH }
        break
      case 'hashprice':
        // Back-calculate BTC price from hashprice
        // hashprice = hashvalue * btcPrice / 1e8
        // btcPrice = hashprice * 1e8 / hashvalue
        const hashvalue = (144 * 3.125 * 1e8) / btcMetrics.networkHashrate
        testBtcMetrics = { ...btcMetrics, btcPrice: (xValue * 1e8) / hashvalue }
        break
    }

    const result = calculateArbitrage(fuelType, testFuelRate, testElecRate, testMiner, testBtcMetrics, 1500, fuelEfficiencyNum)
    return result.savingsPercent
  }, [btcMetrics, electricityRateNum, fuelRateNum, miner, fuelType, fuelEfficiencyNum, isElectricFuel])

  // Generate chart data points
  const savingsChartData = useMemo(() => {
    if (!btcMetrics || !savingsChartExpanded) return null

    const config = chartXAxisConfig[savingsChartXAxis]
    const points: { x: number; y: number }[] = []

    for (let x = config.min; x <= config.max + 0.0001; x += config.step) {
      const savings = calculateSavingsAtX(x, savingsChartXAxis)
      points.push({ x, y: savings })
    }

    // Get current X value based on axis type
    let currentX: number
    switch (savingsChartXAxis) {
      case 'electricity':
        currentX = electricityRateNum
        break
      case 'fuel':
        currentX = fuelRateNum
        break
      case 'efficiency':
        currentX = minerEfficiency
        break
      case 'hashprice':
        currentX = networkMetrics?.hashprice || 0
        break
    }

    return { points, currentX, config }
  }, [btcMetrics, savingsChartExpanded, savingsChartXAxis, chartXAxisConfig, calculateSavingsAtX, electricityRateNum, fuelRateNum, minerEfficiency, networkMetrics])

  // X-axis configuration for COPe/Subsidy charts (no fuel rate option)
  const copeChartXAxisConfig = useMemo(() => {
    return {
      electricity: { min: 0.05, max: 0.30, step: 0.025, unit: '$/kWh', label: 'Electricity Rate' },
      efficiency: { min: 10, max: 50, step: 4, unit: 'J/TH', label: 'Miner Efficiency' },
      hashprice: { min: 0.02, max: 0.12, step: 0.01, unit: '$/TH/d', label: 'Hashprice' },
    }
  }, [])

  // Calculate COPe and Subsidy at a specific X value
  const calculateCOPeAtX = useCallback((xValue: number, xAxis: 'electricity' | 'efficiency' | 'hashprice'): { cope: number; subsidy: number } => {
    if (!btcMetrics) return { cope: 1, subsidy: 0 }

    let testElecRate = electricityRateNum
    let testMiner = miner
    let testBtcMetrics = btcMetrics

    switch (xAxis) {
      case 'electricity':
        testElecRate = xValue
        break
      case 'efficiency':
        // Adjust miner power to achieve target efficiency (J/TH = W / TH/s)
        testMiner = { ...miner, powerW: xValue * miner.hashrateTH }
        break
      case 'hashprice':
        // Back-calculate BTC price from hashprice
        const hashvalue = (144 * 3.125 * 1e8) / btcMetrics.networkHashrate
        testBtcMetrics = { ...btcMetrics, btcPrice: (xValue * 1e8) / hashvalue }
        break
    }

    const result = calculateCOPe(testElecRate, testMiner, testBtcMetrics)
    return { cope: result.COPe, subsidy: result.R * 100 }
  }, [btcMetrics, electricityRateNum, miner])

  // Generate COPe chart data
  const copeChartData = useMemo(() => {
    if (!btcMetrics || !copeChartExpanded) return null

    const config = copeChartXAxisConfig[copeChartXAxis]
    const points: { x: number; y: number }[] = []

    for (let x = config.min; x <= config.max + 0.0001; x += config.step) {
      const { cope } = calculateCOPeAtX(x, copeChartXAxis)
      // Cap COPe at 20 for display (values above this approach infinity)
      const displayCope = Math.min(cope, 20)
      points.push({ x, y: displayCope })
    }

    // Get current X value based on axis type
    let currentX: number
    switch (copeChartXAxis) {
      case 'electricity':
        currentX = electricityRateNum
        break
      case 'efficiency':
        currentX = minerEfficiency
        break
      case 'hashprice':
        currentX = networkMetrics?.hashprice || 0
        break
    }

    return { points, currentX, config }
  }, [btcMetrics, copeChartExpanded, copeChartXAxis, copeChartXAxisConfig, calculateCOPeAtX, electricityRateNum, minerEfficiency, networkMetrics])

  // Generate Subsidy chart data
  const subsidyChartData = useMemo(() => {
    if (!btcMetrics || !subsidyChartExpanded) return null

    const config = copeChartXAxisConfig[subsidyChartXAxis]
    const points: { x: number; y: number }[] = []

    for (let x = config.min; x <= config.max + 0.0001; x += config.step) {
      const { subsidy } = calculateCOPeAtX(x, subsidyChartXAxis)
      points.push({ x, y: subsidy })
    }

    // Get current X value based on axis type
    let currentX: number
    switch (subsidyChartXAxis) {
      case 'electricity':
        currentX = electricityRateNum
        break
      case 'efficiency':
        currentX = minerEfficiency
        break
      case 'hashprice':
        currentX = networkMetrics?.hashprice || 0
        break
    }

    return { points, currentX, config }
  }, [btcMetrics, subsidyChartExpanded, subsidyChartXAxis, copeChartXAxisConfig, calculateCOPeAtX, electricityRateNum, minerEfficiency, networkMetrics])

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-100">Hashrate Heating</h1>
        <p className="text-sm sm:text-base text-surface-600 dark:text-surface-400 mt-1">
          Calculate the economic efficiency of heating with Bitcoin miners
        </p>
      </div>

      {/* Bitcoin Data Header */}
      <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-3 sm:p-4">
        {loadingBtc ? (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
            <span className="text-sm sm:text-base text-surface-600 dark:text-surface-400">Loading Bitcoin network data...</span>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {/* Header row with title and reset button */}
            <div className="flex items-center justify-between">
              <div className="text-[10px] sm:text-xs text-surface-500 dark:text-surface-400 uppercase tracking-wide font-medium">
                Bitcoin Network Data
                {!hasOverrides && <span className="ml-1 sm:ml-2 text-green-600 dark:text-green-400 font-normal">(Live)</span>}
              </div>
              {hasOverrides && (
                <button
                  onClick={() => {
                    setBtcPriceOverride('')
                    setHashvalueOverride('')
                    setHashpriceOverride('')
                    setNetworkHashrateOverride('')
                  }}
                  className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium px-1.5 sm:px-2 py-1 rounded hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="hidden xs:inline">Reset to live data</span>
                  <span className="xs:hidden">Reset</span>
                </button>
              )}
            </div>

            {/* Two-knob layout: Price group | Network group */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {/* KNOB 1: Price Group (BTC Price ↔ Hashprice) */}
              <div className="rounded-lg border border-green-200 dark:border-green-800/50 bg-green-50/30 dark:bg-green-900/10 p-2 sm:p-3">
                <div className="text-[8px] sm:text-[9px] text-green-600 dark:text-green-400 uppercase tracking-wider font-semibold mb-1.5 sm:mb-2 text-center">
                  Market Price
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {/* BTC Price - Editable */}
                  <div className={`rounded-lg p-2 sm:p-3 text-center transition-all ${
                    btcPriceOverride
                      ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-400 dark:border-green-600'
                      : 'bg-white dark:bg-surface-800 border-2 border-dashed border-green-300 dark:border-green-700 hover:border-green-400 dark:hover:border-green-500 cursor-text'
                  }`}>
                    <div className="text-[9px] sm:text-[10px] text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-0.5 sm:mb-1 flex items-center justify-center gap-1">
                      <Pencil className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${btcPriceOverride ? 'text-green-600 dark:text-green-400' : 'text-surface-400 dark:text-surface-500'}`} />
                      BTC Price
                      {hashpriceOverride && !btcPriceOverride && (
                        <span className="text-green-600 dark:text-green-400">(implied)</span>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                      <span className="text-surface-500 dark:text-surface-400 text-xs sm:text-sm font-medium">$</span>
                      <input
                        type="number"
                        value={btcPriceOverride || (hashpriceOverride ? effectiveBtcPrice?.toFixed(0) : btcPrice?.toString()) || ''}
                        onChange={(e) => handleBtcPriceOverride(e.target.value)}
                        className={`w-16 sm:w-24 text-base sm:text-xl font-bold text-center py-0.5 sm:py-1 bg-transparent focus:outline-none ${
                          btcPriceOverride ? 'text-green-700 dark:text-green-400' : 'text-surface-900 dark:text-surface-100'
                        }`}
                        placeholder={btcPrice?.toLocaleString()}
                      />
                    </div>
                  </div>

                  {/* Hashprice - Editable */}
                  <div className={`rounded-lg p-2 sm:p-3 text-center transition-all ${
                    hashpriceOverride
                      ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-400 dark:border-green-600'
                      : 'bg-white dark:bg-surface-800 border-2 border-dashed border-green-300 dark:border-green-700 hover:border-green-400 dark:hover:border-green-500 cursor-text'
                  }`}>
                    <div className="text-[9px] sm:text-[10px] text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-0.5 sm:mb-1 flex items-center justify-center gap-1">
                      <Pencil className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${hashpriceOverride ? 'text-green-600 dark:text-green-400' : 'text-surface-400 dark:text-surface-500'}`} />
                      Hashprice
                      {(btcPriceOverride || hashvalueOverride || networkHashrateOverride) && !hashpriceOverride && (
                        <span className="text-green-600 dark:text-green-400">(implied)</span>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                      <span className="text-surface-500 dark:text-surface-400 text-xs sm:text-sm">$</span>
                      <input
                        type="number"
                        value={hashpriceOverride || networkMetrics?.hashprice.toFixed(4) || ''}
                        onChange={(e) => handleHashpriceOverride(e.target.value)}
                        step="0.0001"
                        className={`w-14 sm:w-20 text-base sm:text-xl font-bold text-center py-0.5 sm:py-1 bg-transparent focus:outline-none ${
                          hashpriceOverride ? 'text-green-700 dark:text-green-400' : 'text-green-600 dark:text-green-400'
                        }`}
                        placeholder={networkMetrics?.hashprice.toFixed(4)}
                      />
                      <span className="text-[9px] sm:text-xs text-surface-500 dark:text-surface-400">/TH/d</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* KNOB 2: Network Group (Hashvalue ↔ Network Hashrate) */}
              <div className="rounded-lg border border-orange-200 dark:border-orange-800/50 bg-orange-50/30 dark:bg-orange-900/10 p-2 sm:p-3">
                <div className="text-[8px] sm:text-[9px] text-orange-600 dark:text-orange-400 uppercase tracking-wider font-semibold mb-1.5 sm:mb-2 text-center">
                  Mining Network
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {/* Hashvalue - Editable */}
                  <div className={`rounded-lg p-2 sm:p-3 text-center transition-all ${
                    hashvalueOverride
                      ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-400 dark:border-orange-600'
                      : 'bg-white dark:bg-surface-800 border-2 border-dashed border-orange-300 dark:border-orange-700 hover:border-orange-400 dark:hover:border-orange-500 cursor-text'
                  }`}>
                    <div className="text-[9px] sm:text-[10px] text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-0.5 sm:mb-1 flex items-center justify-center gap-1">
                      <Pencil className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${hashvalueOverride ? 'text-orange-600 dark:text-orange-400' : 'text-surface-400 dark:text-surface-500'}`} />
                      Hashvalue
                      {networkHashrateOverride && !hashvalueOverride && (
                        <span className="text-orange-600 dark:text-orange-400">(implied)</span>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                      <input
                        type="number"
                        value={hashvalueOverride || networkMetrics?.hashvalue.toFixed(2) || ''}
                        onChange={(e) => handleHashvalueOverride(e.target.value)}
                        step="0.01"
                        className={`w-12 sm:w-16 text-base sm:text-xl font-bold text-center py-0.5 sm:py-1 bg-transparent focus:outline-none ${
                          hashvalueOverride ? 'text-orange-700 dark:text-orange-400' : 'text-orange-600 dark:text-orange-400'
                        }`}
                        placeholder={networkMetrics?.hashvalue.toFixed(2)}
                      />
                      <span className="text-[9px] sm:text-xs text-surface-500 dark:text-surface-400">sats/TH/d</span>
                    </div>
                  </div>

                  {/* Network Hashrate - Editable */}
                  <div className={`rounded-lg p-2 sm:p-3 text-center transition-all ${
                    networkHashrateOverride
                      ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-400 dark:border-orange-600'
                      : 'bg-white dark:bg-surface-800 border-2 border-dashed border-orange-300 dark:border-orange-700 hover:border-orange-400 dark:hover:border-orange-500 cursor-text'
                  }`}>
                    <div className="text-[9px] sm:text-[10px] text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-0.5 sm:mb-1 flex items-center justify-center gap-1">
                      <Pencil className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${networkHashrateOverride ? 'text-orange-600 dark:text-orange-400' : 'text-surface-400 dark:text-surface-500'}`} />
                      Network
                      {hashvalueOverride && !networkHashrateOverride && (
                        <span className="text-orange-600 dark:text-orange-400">(implied)</span>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                      <input
                        type="number"
                        value={networkHashrateOverride || networkMetrics?.networkHashrateEH.toFixed(0) || ''}
                        onChange={(e) => handleNetworkHashrateOverride(e.target.value)}
                        className={`w-12 sm:w-16 text-base sm:text-xl font-bold text-center py-0.5 sm:py-1 bg-transparent focus:outline-none ${
                          networkHashrateOverride ? 'text-orange-700 dark:text-orange-400' : 'text-surface-700 dark:text-surface-200'
                        }`}
                        placeholder={networkMetrics?.networkHashrateEH.toFixed(0)}
                      />
                      <span className="text-[9px] sm:text-xs text-surface-500 dark:text-surface-400">EH/s</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Strip */}
      <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Miner Selection */}
          <div>
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-500" />
              Miner
            </h3>
            <SelectField
              label="Select Miner"
              value={minerType}
              onChange={handleMinerTypeChange}
              options={[
                { value: 'custom', label: 'Custom Miner' },
                ...MINER_PRESETS.map((preset, index) => ({
                  value: index.toString(),
                  label: preset.name,
                })),
              ]}
            />
            <div className="mt-3 p-3 bg-surface-50 dark:bg-surface-700/50 rounded-lg space-y-2">
              <div className="text-xs text-surface-600 dark:text-surface-400 mb-2">
                {minerType === 'custom' ? 'Enter specs:' : 'Adjust specs:'}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <InputField
                  label="Power"
                  value={minerPower}
                  onChange={handlePowerChange}
                  suffix="W"
                  type="number"
                  min={100}
                  max={15000}
                  placeholder={DEFAULT_CUSTOM_MINER.powerW.toString()}
                />
                <InputField
                  label="Hashrate"
                  value={minerHashrate}
                  onChange={handleHashrateChange}
                  suffix="TH/s"
                  type="number"
                  min={1}
                  max={1000}
                  placeholder={DEFAULT_CUSTOM_MINER.hashrateTH.toString()}
                />
              </div>
              <div className="text-xs text-surface-500 dark:text-surface-400 pt-1">
                Efficiency: {minerEfficiency.toFixed(1)} J/TH
              </div>
            </div>
          </div>

          {/* Electricity Rate */}
          <div>
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary-500" />
              Electricity
            </h3>
            <InputField
              label="Rate"
              value={electricityRate}
              onChange={setElectricityRate}
              prefix="$"
              suffix="/kWh"
              type="number"
              min={0}
              max={1}
              step={0.001}
              tooltip="Find your rate on your electric bill. Look for 'Price per kWh' or divide your total bill by kWh used. Include all charges (delivery, supply, taxes) for your true all-in rate. Or use the bill calculator below."
            />
            <div className="mt-3 p-3 bg-surface-50 dark:bg-surface-700/50 rounded-lg space-y-2">
              <div className="text-xs text-surface-600 dark:text-surface-400 mb-2">Calculate from bill:</div>
              <div className="grid grid-cols-2 gap-2">
                <InputField
                  label="Bill"
                  value={billAmount}
                  onChange={setBillAmount}
                  prefix="$"
                  type="number"
                  min={0}
                />
                <InputField
                  label="kWh"
                  value={billKwh}
                  onChange={setBillKwh}
                  suffix="kWh"
                  type="number"
                  min={0}
                />
              </div>
              <div className="text-xs text-surface-500 dark:text-surface-400 pt-1">
                Auto-calculates rate above
              </div>
            </div>
          </div>

          {/* Fuel Type & Rate */}
          <div>
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Compare to Fuel
            </h3>
            <SelectField
              label="Fuel Type"
              value={fuelType}
              onChange={(value) => setFuelType(value as FuelType)}
              options={Object.entries(FUEL_SPECS).map(([key, spec]) => ({
                value: key,
                label: spec.label,
              }))}
            />
            {/* Show rate input only for non-electric fuel types */}
            {!isElectricFuel && (
              <div className="mt-3">
                <InputField
                  label="Rate"
                  value={fuelRate}
                  onChange={setFuelRate}
                  prefix="$"
                  suffix={`/${FUEL_SPECS[fuelType].unit}`}
                  type="number"
                  min={0}
                  step={0.01}
                  tooltip={
                    fuelType === 'natural_gas'
                      ? "Find your rate on your gas bill under 'Price per therm' or 'Cost per CCF' (1 CCF ≈ 1.037 therms). Include delivery charges for total cost."
                      : fuelType === 'propane'
                      ? "Check your propane delivery receipt or contact your supplier. Prices vary seasonally — use your average annual rate for best accuracy."
                      : "Find your rate on your heating oil delivery receipt. Prices vary seasonally — use your average annual rate for best accuracy."
                  }
                />
              </div>
            )}
            {/* Show efficiency input for fuels that have it (not electric resistance) */}
            {hasEfficiencyInput && (
              <div className="mt-3">
                <InputField
                  label={fuelType === 'heat_pump' ? 'COP' : 'AFUE'}
                  value={fuelEfficiency}
                  onChange={setFuelEfficiency}
                  suffix={fuelType === 'heat_pump' ? '' : '%'}
                  type="number"
                  min={fuelType === 'heat_pump' ? 1 : 50}
                  max={fuelType === 'heat_pump' ? 6 : 100}
                  step={fuelType === 'heat_pump' ? 0.1 : 1}
                  tooltip={
                    fuelType === 'heat_pump'
                      ? "COP (Coefficient of Performance) measures heat output vs electricity input. A COP of 3.0 means 3 kWh of heat per 1 kWh of electricity. Find your unit's COP on its spec sheet or EnergyGuide label. COP varies with outdoor temperature — use your seasonal average."
                      : "AFUE (Annual Fuel Utilization Efficiency) measures what percentage of fuel becomes heat. Find it on your furnace/boiler's yellow EnergyGuide label or spec plate. Modern gas furnaces: 90-98%. Older units: 56-70%. Boilers: 80-95%."
                  }
                />
              </div>
            )}
            {/* Info message for electric fuel types */}
            {fuelType === 'electric_resistance' && (
              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                Uses your ${electricityRateNum.toFixed(2)}/kWh rate at 100% efficiency
              </div>
            )}
            {fuelType === 'heat_pump' && (
              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                Effective rate: ${(electricityRateNum / fuelEfficiencyNum).toFixed(3)}/kWh
              </div>
            )}
          </div>

          {/* State Selection */}
          <div>
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3 flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-blue-500" />
              Your Region
            </h3>
            <SelectField
              label="State/Region"
              value={selectedState}
              onChange={setSelectedState}
              options={[
                { value: '', label: 'US National Average' },
                ...STATES_LIST.map((state) => ({
                  value: state.abbr,
                  label: state.name,
                })),
              ]}
            />
            {selectedState && (
              <div className="mt-2 text-xs text-surface-500 dark:text-surface-400">
                Avg. electricity: ${getStatePrices(selectedState).electricity.toFixed(2)}/kWh
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {copeResult && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Savings vs Fuel */}
          {arbitrageResult && (
            <MetricCard
              icon={Flame}
              label={`Savings vs ${FUEL_SPECS[fuelType].label}`}
              value={`${arbitrageResult.savingsPercent >= 0 ? '+' : ''}${arbitrageResult.savingsPercent.toFixed(0)}%`}
              subValue={savingsChartExpanded ? undefined : `${FUEL_SPECS[fuelType].label}: $${arbitrageResult.traditionalCostPerKwh.toFixed(3)}/kWh • Click to explore`}
              tooltip="Percentage savings vs your selected fuel. Formula: ((Traditional $/kWh - Hashrate $/kWh) / Traditional $/kWh) × 100. Traditional fuel cost accounts for efficiency (AFUE for gas/oil, COP for heat pumps). Positive = you save money with hashrate heating. Negative = traditional fuel is cheaper at current BTC economics."
              variant={arbitrageResult.savingsPercent > 50 ? 'success' : arbitrageResult.savingsPercent > 0 ? 'highlight' : 'warning'}
              expandable
              expanded={savingsChartExpanded}
              onToggle={() => handleChartToggle('savings')}
            >
              {savingsChartData && (
                <SavingsChart
                  data={savingsChartData.points}
                  currentX={savingsChartData.currentX}
                  config={savingsChartData.config}
                  xAxisOption={savingsChartXAxis}
                  onXAxisChange={setSavingsChartXAxis}
                  fuelLabel={FUEL_SPECS[fuelType].label}
                  isElectricFuel={isElectricFuel}
                />
              )}
            </MetricCard>
          )}

          {/* COPe */}
          <MetricCard
            icon={TrendingUp}
            label="COPe (Economic COP)"
            value={formatCOPe(copeResult.COPe)}
            subValue={copeChartExpanded ? undefined : "Compare to heat pump COP 2.5-4.0 • Click to explore"}
            tooltip="COPe (Coefficient of Performance - Economic) measures heating efficiency through economics rather than thermodynamics. Formula: COPe = 1/(1-R), where R = mining revenue / electricity cost. A COPe of 3.0 means you get the same economic benefit as a heat pump with COP 3.0 — both give you 3 units of 'value' per unit of electricity. Heat pump COP varies with outdoor temp; COPe varies with BTC price and network hashrate. Higher is better. Infinity = free heating."
            variant={copeResult.COPe >= 3 ? 'success' : copeResult.COPe >= 2 ? 'highlight' : 'default'}
            expandable
            expanded={copeChartExpanded}
            onToggle={() => handleChartToggle('cope')}
          >
            {copeChartData && (
              <MetricChart
                data={copeChartData.points}
                currentX={copeChartData.currentX}
                config={copeChartData.config}
                xAxisOption={copeChartXAxis}
                onXAxisChange={setCopeChartXAxis}
                yAxisFormatter={(v) => v >= 20 ? '∞' : v.toFixed(1)}
                lineLabel="COPe"
                capValue={20}
              />
            )}
          </MetricCard>

          {/* Heating Subsidy */}
          <MetricCard
            icon={Percent}
            label="Heating Subsidy"
            value={`${Math.round(copeResult.R * 100)}%`}
            subValue={subsidyChartExpanded ? undefined : "Mining covers this % of electricity • Click to explore"}
            tooltip="The percentage of your electricity cost offset by mining revenue. Formula: R = (Daily Mining Revenue / Daily Electricity Cost) × 100. At 50%, mining pays half your electric bill. At 100%, heating is free. Above 100%, you're profiting while heating. This is the 'R' value used in the COPe formula."
            variant={copeResult.R >= 1 ? 'success' : copeResult.R >= 0.5 ? 'highlight' : 'default'}
            expandable
            expanded={subsidyChartExpanded}
            onToggle={() => handleChartToggle('subsidy')}
          >
            {subsidyChartData && (
              <MetricChart
                data={subsidyChartData.points}
                currentX={subsidyChartData.currentX}
                config={subsidyChartData.config}
                xAxisOption={subsidyChartXAxis}
                onXAxisChange={setSubsidyChartXAxis}
                yAxisFormatter={(v) => `${v.toFixed(0)}%`}
                lineLabel="Subsidy"
                showReferenceLine={{ value: 100, label: '100%' }}
              />
            )}
          </MetricCard>

          {/* Effective Heat Cost */}
          <MetricCard
            icon={DollarSign}
            label="Effective Heat Cost"
            value={`$${copeResult.effectiveCostPerKwh.toFixed(3)}/kWh`}
            secondaryValue={`$${copeResult.effectiveCostPerMMBTU.toFixed(2)}/MMBTU`}
            tertiaryValue={fuelEquivalentCost ? `$${fuelEquivalentCost.value.toFixed(2)}/${fuelEquivalentCost.unit}` : undefined}
            tooltip={`Your net cost per unit of heat after Bitcoin mining revenue offset. Formula: (Daily Electricity Cost - Daily Mining Revenue) / Daily kWh. Negative values mean you're being paid to heat.${fuelEquivalentCost ? ` The ${fuelEquivalentCost.label} rate lets you compare directly to your ${FUEL_SPECS[fuelType].label} bills.` : ''}`}
            variant={copeResult.effectiveCostPerKwh <= 0 ? 'success' : 'default'}
          />

          {/* Break-even Rate */}
          <MetricCard
            icon={Zap}
            label="Break-even Rate"
            value={`$${copeResult.breakevenRate.toFixed(3)}/kWh`}
            subValue="Free heating & profitable mining below this rate"
            tooltip="The maximum electricity rate for free heating. Formula: (Daily BTC Mined × BTC Price) / Daily kWh. At this rate, R = 100% and COPe = ∞. Below this rate, you profit while heating. This rate changes with BTC price and network hashrate — lock in low electricity rates to maintain profitability through market cycles."
            variant="default"
          />

          {/* Heating Power */}
          <MetricCard
            icon={Gauge}
            label="Heating Power / Unit"
            value={`${(miner.powerW / 1000).toFixed(1)} kW`}
            secondaryValue={`${(miner.powerW * 3.412).toLocaleString(undefined, { maximumFractionDigits: 0 })} BTU/h`}
            tertiaryValue={`${((miner.powerW * 3.412) / 12000).toFixed(2)} tons`}
            tooltip="Thermal output of your miner. Bitcoin miners convert 100% of electrical power to heat. Conversions: 1 W = 3.412 BTU/h, 1 ton = 12,000 BTU/h. Compare to furnace capacity (40,000-120,000 BTU/h typical) or room heaters (5,000-10,000 BTU/h). A 5kW miner provides ~17,000 BTU/h — enough to heat a large room or small home in moderate climates."
            variant="default"
          />
        </div>
      )}

      {/* Status Banner */}
      {copeResult && (() => {
        // Determine status based on savings vs traditional fuel
        // profitable: R >= 1 (free/paid heating)
        // subsidized: savingsPercent > 0 (hashrate heating is cheaper than traditional fuel)
        // loss: savingsPercent <= 0 (traditional fuel is cheaper - keep current heating)
        const displayStatus = copeResult.R >= 1
          ? 'profitable'
          : (arbitrageResult && arbitrageResult.savingsPercent > 0)
            ? 'subsidized'
            : 'loss'

        return (
          <div className={`rounded-xl p-3 sm:p-4 ${
            displayStatus === 'profitable'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : displayStatus === 'subsidized'
              ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
              : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
          }`}>
            {displayStatus === 'profitable' && (
              <div className="flex items-center gap-2 sm:gap-3 text-green-800 dark:text-green-300">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 dark:bg-green-800/50 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm sm:text-base">Free or Paid Heating!</div>
                  <div className="text-xs sm:text-sm text-green-700 dark:text-green-400">Mining revenue exceeds electricity costs. You&apos;re effectively being paid to heat.</div>
                </div>
              </div>
            )}
            {displayStatus === 'subsidized' && (
              <div className="flex items-center gap-2 sm:gap-3 text-blue-800 dark:text-blue-300">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center flex-shrink-0">
                  <Percent className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm sm:text-base">Hashrate Heating Recommended</div>
                  <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-400">{arbitrageResult ? `${arbitrageResult.savingsPercent.toFixed(0)}% savings` : 'Savings'} vs {FUEL_SPECS[fuelType].label}. Mining offsets {(copeResult.R * 100).toFixed(0)}% of your electricity cost.</div>
                </div>
              </div>
            )}
            {displayStatus === 'loss' && (
              <div className="flex items-center gap-2 sm:gap-3 text-amber-800 dark:text-amber-300">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center flex-shrink-0">
                  <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm sm:text-base">Keep Current Heating</div>
                  <div className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">{FUEL_SPECS[fuelType].label} is {arbitrageResult ? `${Math.abs(arbitrageResult.savingsPercent).toFixed(0)}% cheaper` : 'cheaper'} than hashrate heating at current rates. Mining still offsets {(copeResult.R * 100).toFixed(0)}% of electric heating.</div>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* State Comparison Map - Full width results section */}
      {copeResult && (
        <StateHeatMap
          btcMetrics={btcMetrics}
          selectedFuelType={fuelType}
          onFuelTypeChange={(fuel) => setFuelType(fuel)}
          onStateClick={(abbr) => setSelectedState(abbr)}
          minerPowerW={miner.powerW}
          minerHashrateTH={miner.hashrateTH}
        />
      )}
    </div>
  )
}
