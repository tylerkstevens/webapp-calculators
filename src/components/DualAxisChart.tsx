import { useState } from 'react'

interface DualAxisChartProps {
  // Revenue data (bars, left Y-axis)
  revenueData: number[] // USD values for each month
  revenueDataSats: number[] // Sats values for each month

  // Generation data (line, right Y-axis)
  generationData: number[] // kWh values for each month

  // Labels
  monthLabels: string[] // Month names (e.g., ["Jan", "Feb", ...])

  // Chart dimensions
  width?: number
  height?: number
}

interface HoverData {
  monthIndex: number
  revenue: number
  revenueSats: number
  generation: number
  month: string
}

export default function DualAxisChart({
  revenueData,
  revenueDataSats,
  generationData,
  monthLabels,
  width = 800,
  height = 400,
}: DualAxisChartProps) {
  const [hoverData, setHoverData] = useState<HoverData | null>(null)

  // Chart padding
  const padding = { top: 50, right: 60, bottom: 60, left: 60 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Calculate scales
  const maxRevenue = Math.max(...revenueData, 1)
  const maxGeneration = Math.max(...generationData, 1)

  // Scale functions
  const scaleRevenue = (value: number) => {
    return chartHeight - (value / maxRevenue) * chartHeight
  }

  const scaleGeneration = (value: number) => {
    return chartHeight - (value / maxGeneration) * chartHeight
  }

  const scaleX = (index: number) => {
    const barWidth = chartWidth / monthLabels.length
    return index * barWidth + barWidth / 2
  }

  // Generate line path
  const linePath = generationData
    .map((value, index) => {
      const x = padding.left + scaleX(index)
      const y = padding.top + scaleGeneration(value)
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
    })
    .join(' ')

  // Format numbers
  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatSats = (value: number) => {
    if (value >= 1e6) {
      return `${(value / 1e6).toFixed(1)}M sats`
    } else if (value >= 1e3) {
      return `${(value / 1e3).toFixed(0)}k sats`
    }
    return `${value.toFixed(0)} sats`
  }

  const formatKWh = (value: number) => {
    return `${value.toFixed(0)} kWh`
  }

  // Y-axis tick generation
  const generateYTicks = (max: number, count: 5) => {
    const step = Math.ceil(max / count / 100) * 100 // Round to nearest 100
    const ticks: number[] = []
    for (let i = 0; i <= count; i++) {
      ticks.push(i * step)
    }
    return ticks
  }

  const revenueYTicks = generateYTicks(maxRevenue, 5)
  const generationYTicks = generateYTicks(maxGeneration, 5)

  // Handle mouse events
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left - padding.left

    const barWidth = chartWidth / monthLabels.length
    const monthIndex = Math.floor(x / barWidth)

    if (monthIndex >= 0 && monthIndex < monthLabels.length) {
      setHoverData({
        monthIndex,
        revenue: revenueData[monthIndex],
        revenueSats: revenueDataSats[monthIndex],
        generation: generationData[monthIndex],
        month: monthLabels[monthIndex],
      })
    }
  }

  const handleMouseLeave = () => {
    setHoverData(null)
  }

  return (
    <div className="space-y-4">
      <svg
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full h-auto"
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Left Y-axis (Revenue) */}
        <g>
          <text
            x={padding.left - 40}
            y={padding.top + chartHeight / 2}
            textAnchor="middle"
            className="text-xs fill-surface-600 dark:fill-surface-400"
            transform={`rotate(-90, ${padding.left - 40}, ${padding.top + chartHeight / 2})`}
          >
            Monthly Revenue (USD)
          </text>
          {revenueYTicks.map((tick) => (
            <g key={`revenue-tick-${tick}`}>
              <line
                x1={padding.left}
                y1={padding.top + scaleRevenue(tick)}
                x2={padding.left + chartWidth}
                y2={padding.top + scaleRevenue(tick)}
                className="stroke-surface-200 dark:stroke-surface-700"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={padding.top + scaleRevenue(tick)}
                textAnchor="end"
                alignmentBaseline="middle"
                className="text-xs fill-surface-600 dark:fill-surface-400"
              >
                ${tick}
              </text>
            </g>
          ))}
        </g>

        {/* Right Y-axis (Generation) */}
        <g>
          <text
            x={padding.left + chartWidth + 40}
            y={padding.top + chartHeight / 2}
            textAnchor="middle"
            className="text-xs fill-green-600 dark:fill-green-400"
            transform={`rotate(90, ${padding.left + chartWidth + 40}, ${padding.top + chartHeight / 2})`}
          >
            Solar Generation (kWh)
          </text>
          {generationYTicks.map((tick) => (
            <g key={`generation-tick-${tick}`}>
              <text
                x={padding.left + chartWidth + 10}
                y={padding.top + scaleGeneration(tick)}
                textAnchor="start"
                alignmentBaseline="middle"
                className="text-xs fill-green-600 dark:fill-green-400"
              >
                {tick}
              </text>
            </g>
          ))}
        </g>

        {/* X-axis */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight}
          className="stroke-surface-300 dark:stroke-surface-600"
          strokeWidth="2"
        />

        {/* Revenue bars */}
        {revenueData.map((value, index) => {
          const barWidth = chartWidth / monthLabels.length
          const barPadding = barWidth * 0.2
          const x = padding.left + index * barWidth + barPadding
          const y = padding.top + scaleRevenue(value)
          const h = chartHeight - scaleRevenue(value)
          const w = barWidth - barPadding * 2

          const isHovered = hoverData?.monthIndex === index

          return (
            <g key={`bar-${index}`}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                className={`${
                  isHovered
                    ? 'fill-primary-600 dark:fill-primary-500'
                    : 'fill-primary-500 dark:fill-primary-600'
                } transition-colors`}
                rx="4"
              />
              {/* Bar labels */}
              <text
                x={x + w / 2}
                y={y - 20}
                textAnchor="middle"
                className="text-xs font-medium fill-surface-700 dark:fill-surface-300"
              >
                {formatUSD(value)}
              </text>
              <text
                x={x + w / 2}
                y={y - 8}
                textAnchor="middle"
                className="text-[10px] fill-surface-500 dark:fill-surface-400"
              >
                {formatSats(revenueDataSats[index])}
              </text>
            </g>
          )
        })}

        {/* Generation line */}
        <path
          d={linePath}
          className="stroke-green-500 dark:stroke-green-400"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Generation data points */}
        {generationData.map((value, index) => {
          const x = padding.left + scaleX(index)
          const y = padding.top + scaleGeneration(value)
          const isHovered = hoverData?.monthIndex === index

          return (
            <circle
              key={`point-${index}`}
              cx={x}
              cy={y}
              r={isHovered ? 6 : 4}
              className={`${
                isHovered
                  ? 'fill-green-600 dark:fill-green-300'
                  : 'fill-green-500 dark:fill-green-400'
              } transition-all`}
              stroke="white"
              strokeWidth="2"
            />
          )
        })}

        {/* X-axis labels */}
        {monthLabels.map((label, index) => {
          const x = padding.left + scaleX(index)
          const y = padding.top + chartHeight + 20

          return (
            <text
              key={`label-${index}`}
              x={x}
              y={y}
              textAnchor="middle"
              className="text-xs fill-surface-600 dark:fill-surface-400"
            >
              {label}
            </text>
          )
        })}

        {/* Hover tooltip */}
        {hoverData && (
          <g>
            <rect
              x={padding.left + scaleX(hoverData.monthIndex) - 80}
              y={padding.top - 10}
              width="160"
              height="80"
              className="fill-surface-50 dark:fill-surface-800 stroke-surface-300 dark:stroke-surface-600"
              strokeWidth="1"
              rx="6"
            />
            <text
              x={padding.left + scaleX(hoverData.monthIndex)}
              y={padding.top + 5}
              textAnchor="middle"
              className="text-xs font-semibold fill-surface-800 dark:fill-surface-200"
            >
              {hoverData.month}
            </text>
            <text
              x={padding.left + scaleX(hoverData.monthIndex)}
              y={padding.top + 22}
              textAnchor="middle"
              className="text-xs fill-surface-700 dark:fill-surface-300"
            >
              Revenue: {formatUSD(hoverData.revenue)}
            </text>
            <text
              x={padding.left + scaleX(hoverData.monthIndex)}
              y={padding.top + 38}
              textAnchor="middle"
              className="text-xs fill-surface-600 dark:fill-surface-400"
            >
              ({formatSats(hoverData.revenueSats)})
            </text>
            <text
              x={padding.left + scaleX(hoverData.monthIndex)}
              y={padding.top + 54}
              textAnchor="middle"
              className="text-xs fill-green-600 dark:fill-green-400"
            >
              Generation: {formatKWh(hoverData.generation)}
            </text>
          </g>
        )}
      </svg>

      {/* Caption */}
      <p className="text-sm text-center text-surface-600 dark:text-surface-400 italic">
        Monthly mining revenue varies with seasonal sun hours. Chart assumes static BTC price and
        network conditions.
      </p>
    </div>
  )
}
