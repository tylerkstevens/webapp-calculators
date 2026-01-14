import { View, Text, Svg, Line, Circle, Path, G } from '@react-pdf/renderer'
import { styles, colors } from '../styles'
import type { PdfChartData } from '../types'

interface PdfLineChartProps {
  data: PdfChartData
  width?: number
  height?: number
}

export default function PdfLineChart({
  data,
  width = 220,
  height = 130,
}: PdfLineChartProps) {
  const padding = { top: 20, right: 15, bottom: 25, left: 35 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const { points, currentX, currentY, xUnit, caption } = data

  // Calculate scales
  const xValues = points.map((p) => p.x)
  const yValues = points.map((p) => p.y)
  const xMin = Math.min(...xValues)
  const xMax = Math.max(...xValues)
  const yMin = Math.min(...yValues, 0)
  const yMax = Math.max(...yValues)
  const yRange = yMax - yMin || 1

  // Scale functions
  const scaleX = (x: number) => {
    return padding.left + ((x - xMin) / (xMax - xMin)) * chartWidth
  }
  const scaleY = (y: number) => {
    return padding.top + chartHeight - ((y - yMin) / yRange) * chartHeight
  }

  // Generate line path
  const linePath = points
    .map((p, i) => {
      const x = scaleX(p.x)
      const y = scaleY(p.y)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  // Current position
  const currentXScaled = scaleX(currentX)
  const currentYScaled = scaleY(currentY)

  // Y-axis ticks (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const value = yMin + (yRange * i) / 4
    return { value, y: scaleY(value) }
  })

  // X-axis ticks (5 ticks)
  const xTicks = Array.from({ length: 5 }, (_, i) => {
    const value = xMin + ((xMax - xMin) * i) / 4
    return { value, x: scaleX(value) }
  })

  // Zero line position (if y range includes 0)
  const showZeroLine = yMin < 0 && yMax > 0
  const zeroY = scaleY(0)

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{data.title}</Text>

      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Grid lines - horizontal */}
        {yTicks.map((tick, i) => (
          <Line
            key={`h-${i}`}
            x1={padding.left}
            y1={tick.y}
            x2={width - padding.right}
            y2={tick.y}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
        ))}

        {/* Zero line */}
        {showZeroLine && (
          <Line
            x1={padding.left}
            y1={zeroY}
            x2={width - padding.right}
            y2={zeroY}
            stroke="#9ca3af"
            strokeWidth={1}
            strokeDasharray="3,2"
          />
        )}

        {/* Axes */}
        <Line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="#9ca3af"
          strokeWidth={1}
        />
        <Line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#9ca3af"
          strokeWidth={1}
        />

        {/* Data line */}
        <Path d={linePath} fill="none" stroke={colors.primary} strokeWidth={2} />

        {/* Data points */}
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={scaleX(p.x)}
            cy={scaleY(p.y)}
            r={2.5}
            fill={colors.primary}
          />
        ))}

        {/* Current value marker (larger, different color) */}
        <Circle
          cx={currentXScaled}
          cy={currentYScaled}
          r={5}
          fill="#f59e0b"
          stroke="#ffffff"
          strokeWidth={1.5}
        />

        {/* Y-axis labels */}
        <G>
          {yTicks.map((tick, i) => (
            <Text
              key={`yl-${i}`}
              x={padding.left - 5}
              y={tick.y + 3}
              style={{
                fontSize: 7,
                fill: colors.textMuted,
                textAnchor: 'end',
              }}
            >
              {tick.value >= 1000
                ? `${(tick.value / 1000).toFixed(0)}k`
                : tick.value % 1 === 0
                  ? tick.value.toString()
                  : tick.value.toFixed(1)}
            </Text>
          ))}
        </G>

        {/* X-axis labels */}
        <G>
          {xTicks.map((tick, i) => (
            <Text
              key={`xl-${i}`}
              x={tick.x}
              y={height - padding.bottom + 12}
              style={{
                fontSize: 7,
                fill: colors.textMuted,
                textAnchor: 'middle',
              }}
            >
              {tick.value.toFixed(2)}
            </Text>
          ))}
        </G>

        {/* X-axis unit label */}
        <Text
          x={width - padding.right}
          y={height - 5}
          style={{
            fontSize: 7,
            fill: colors.textMuted,
            textAnchor: 'end',
          }}
        >
          {xUnit}
        </Text>

        {/* "YOU" label near current marker */}
        <Text
          x={currentXScaled + 8}
          y={currentYScaled - 2}
          style={{
            fontSize: 6,
            fill: '#f59e0b',
            fontFamily: 'Helvetica-Bold',
          }}
        >
          YOU
        </Text>
      </Svg>

      <Text style={styles.chartCaption}>{caption}</Text>
    </View>
  )
}

// Grid component for 2x2 chart layout (4 charts)
interface PdfChartGridProps {
  charts: PdfChartData[]
}

export function PdfChartGrid({ charts }: PdfChartGridProps) {
  return (
    <View style={styles.chartGrid}>
      {charts.map((chart, index) => (
        <PdfLineChart key={index} data={chart} />
      ))}
    </View>
  )
}

// Row component for 1x3 chart layout (3 charts in a row)
// Page is 612pt wide with 40pt padding on each side = 532pt content area
// 3 charts × 168pt = 504pt + 2 gaps × 10pt = 524pt (fits with margin)
interface PdfChartRowProps {
  charts: PdfChartData[]
}

export function PdfChartRow({ charts }: PdfChartRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
      }}
    >
      {charts.map((chart, index) => (
        <PdfLineChart key={index} data={chart} width={168} height={140} />
      ))}
    </View>
  )
}
