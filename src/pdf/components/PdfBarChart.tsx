import { View, Text, Svg, Rect, Line, G } from '@react-pdf/renderer'
import { styles, colors } from '../styles'
import type { PdfBarChartData } from '../types'

interface PdfBarChartProps {
  data: PdfBarChartData
}

export default function PdfBarChart({ data }: PdfBarChartProps) {
  const { title, bars, yLabel, yUnit, caption } = data

  // Chart dimensions
  const width = 480
  const height = 150
  const padding = { top: 20, right: 20, bottom: 35, left: 45 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Calculate scale
  const maxValue = Math.max(...bars.map((b) => b.value), 1)
  const barWidth = chartWidth / bars.length - 4
  const barGap = 4

  // Y-axis ticks
  const yTicks = 4
  const yStep = maxValue / yTicks

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>

      <Svg width={width} height={height}>
        {/* Y-axis */}
        <Line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke={colors.border}
          strokeWidth={1}
        />

        {/* X-axis */}
        <Line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke={colors.border}
          strokeWidth={1}
        />

        {/* Y-axis grid and labels */}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const value = yStep * i
          const y = height - padding.bottom - (i / yTicks) * chartHeight
          return (
            <G key={i}>
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
                x={padding.left - 5}
                y={y + 3}
                style={{
                  fontSize: 7,
                  fill: colors.textMuted,
                  textAnchor: 'end',
                }}
              >
                {yUnit}
                {value.toFixed(0)}
              </Text>
            </G>
          )
        })}

        {/* Y-axis label */}
        <Text
          x={12}
          y={height / 2}
          style={{
            fontSize: 7,
            fill: colors.textMuted,
          }}
          transform={`rotate(-90, 12, ${height / 2})`}
        >
          {yLabel}
        </Text>

        {/* Bars */}
        {bars.map((bar, i) => {
          const barHeight = (bar.value / maxValue) * chartHeight
          const x = padding.left + i * (barWidth + barGap) + barGap / 2
          const y = height - padding.bottom - barHeight

          return (
            <G key={i}>
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
                x={x + barWidth / 2}
                y={height - padding.bottom + 10}
                style={{
                  fontSize: 6,
                  fill: colors.textMuted,
                  textAnchor: 'middle',
                }}
              >
                {bar.label}
              </Text>
              {/* Value label */}
              <Text
                x={x + barWidth / 2}
                y={height - padding.bottom + 20}
                style={{
                  fontSize: 6,
                  fill: colors.text,
                  textAnchor: 'middle',
                }}
              >
                {yUnit}
                {bar.value.toFixed(0)}
              </Text>
            </G>
          )
        })}
      </Svg>

      <Text style={styles.chartCaption}>{caption}</Text>
    </View>
  )
}
