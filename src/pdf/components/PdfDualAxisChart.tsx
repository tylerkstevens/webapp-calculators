import { View, Text, Svg, Rect, Line, Path, Circle, G } from '@react-pdf/renderer'
import { colors } from '../styles'
import type { PdfDualAxisChartData } from '../types'

interface PdfDualAxisChartProps {
  data: PdfDualAxisChartData
}

export default function PdfDualAxisChart({ data }: PdfDualAxisChartProps) {
  const { title, bars, lineData, barLabel, barUnit, lineLabel, lineUnit, caption } = data

  // Chart dimensions
  const width = 500
  const height = 180
  const padding = { top: 25, right: 50, bottom: 40, left: 60 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Calculate scales
  const maxRevenue = Math.max(...bars.map((b) => b.value), 1)
  const maxGeneration = Math.max(...lineData, 1)

  const barCount = bars.length
  const barWidth = (chartWidth / barCount) * 0.6

  // Calculate nice Y-axis max values for clean tick labels
  const getNiceMax = (max: number) => {
    if (max <= 0) return 100
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)))
    const normalized = max / magnitude
    if (normalized <= 1) return magnitude
    if (normalized <= 2) return 2 * magnitude
    if (normalized <= 5) return 5 * magnitude
    return 10 * magnitude
  }

  const niceMaxRevenue = getNiceMax(maxRevenue)
  const niceMaxGeneration = getNiceMax(maxGeneration)

  // Scale functions using nice max values
  const scaleRevenue = (value: number) => {
    return chartHeight - (value / niceMaxRevenue) * chartHeight
  }

  const scaleGeneration = (value: number) => {
    return chartHeight - (value / niceMaxGeneration) * chartHeight
  }

  const scaleX = (index: number) => {
    return (index + 0.5) * (chartWidth / barCount)
  }

  // Generate line path
  const linePath = lineData
    .map((value, index) => {
      const x = padding.left + scaleX(index)
      const y = padding.top + scaleGeneration(value)
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
    })
    .join(' ')

  // Y-axis ticks (5 ticks each) using nice values
  const revenueYTicks = Array.from({ length: 5 }, (_, i) => (niceMaxRevenue * i) / 4)
  const generationYTicks = Array.from({ length: 5 }, (_, i) => (niceMaxGeneration * i) / 4)

  // Format value for display
  const formatValue = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`
    }
    return Math.round(value).toString()
  }

  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 8 }}>
        {title}
      </Text>

      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Left Y-axis (Revenue) - bars */}
        <Line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke={colors.border}
          strokeWidth={1}
        />

        {/* Left Y-axis label */}
        <Text
          x={12}
          y={padding.top + chartHeight / 2}
          style={{ fontSize: 7, fill: colors.primary }}
          transform={`rotate(-90, 12, ${padding.top + chartHeight / 2})`}
        >
          {barLabel} ({barUnit})
        </Text>

        {/* Left Y-axis ticks */}
        {revenueYTicks.map((tick, i) => {
          const y = padding.top + scaleRevenue(tick)
          return (
            <G key={`rev-${i}`}>
              <Line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke={colors.border}
                strokeWidth={0.5}
                strokeDasharray="2,2"
              />
              <Text
                x={padding.left - 4}
                y={y + 3}
                style={{ fontSize: 6, fill: colors.primary, textAnchor: 'end' }}
              >
                {formatValue(tick)}
              </Text>
            </G>
          )
        })}

        {/* Right Y-axis (Generation) - line */}
        <Line
          x1={width - padding.right}
          y1={padding.top}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#22c55e"
          strokeWidth={1}
        />

        {/* Right Y-axis label */}
        <Text
          x={width - 12}
          y={padding.top + chartHeight / 2}
          style={{ fontSize: 7, fill: '#22c55e' }}
          transform={`rotate(90, ${width - 12}, ${padding.top + chartHeight / 2})`}
        >
          {lineLabel} ({lineUnit})
        </Text>

        {/* Right Y-axis ticks */}
        {generationYTicks.map((tick, i) => {
          const y = padding.top + scaleGeneration(tick)
          return (
            <Text
              key={`gen-${i}`}
              x={width - padding.right + 5}
              y={y + 3}
              style={{ fontSize: 6, fill: '#22c55e', textAnchor: 'start' }}
            >
              {formatValue(tick)}
            </Text>
          )
        })}

        {/* X-axis */}
        <Line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke={colors.border}
          strokeWidth={1}
        />

        {/* Revenue bars */}
        {bars.map((bar, i) => {
          const barHeight = (bar.value / niceMaxRevenue) * chartHeight
          const x = padding.left + scaleX(i) - barWidth / 2
          const y = padding.top + chartHeight - barHeight

          return (
            <G key={`bar-${i}`}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={colors.primary}
                rx={2}
              />
              {/* Month label */}
              <Text
                x={padding.left + scaleX(i)}
                y={height - padding.bottom + 10}
                style={{ fontSize: 6, fill: colors.textMuted, textAnchor: 'middle' }}
              >
                {bar.label}
              </Text>
            </G>
          )
        })}

        {/* Generation line */}
        <Path
          d={linePath}
          stroke="#22c55e"
          strokeWidth={2}
          fill="none"
        />

        {/* Generation points */}
        {lineData.map((value, i) => {
          const x = padding.left + scaleX(i)
          const y = padding.top + scaleGeneration(value)
          return (
            <Circle
              key={`point-${i}`}
              cx={x}
              cy={y}
              r={3}
              fill="#22c55e"
              stroke="white"
              strokeWidth={1}
            />
          )
        })}
      </Svg>

      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 5 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 12, height: 8, backgroundColor: colors.primary, borderRadius: 2 }} />
          <Text style={{ fontSize: 7, color: colors.textMuted }}>{barLabel} [{barUnit}]</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 12, height: 2, backgroundColor: '#22c55e' }} />
          <Text style={{ fontSize: 7, color: colors.textMuted }}>{lineLabel} [{lineUnit}]</Text>
        </View>
      </View>

      <Text style={{ fontSize: 7, color: colors.textMuted, marginTop: 8, textAlign: 'center' }}>
        {caption}
      </Text>
    </View>
  )
}
