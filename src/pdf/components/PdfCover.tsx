import { Page, View, Text } from '@react-pdf/renderer'
import { styles, colors } from '../styles'

interface PdfCoverProps {
  title: string
  subtitle?: string
  generatedDate: string
  location: string
  description?: string
  isProfitable: boolean
  summaryText: string
  keyMetrics: { label: string; value: string }[]
}

export default function PdfCover({
  title,
  subtitle = 'Analysis Report',
  generatedDate,
  location,
  description,
  isProfitable,
  summaryText,
  keyMetrics,
}: PdfCoverProps) {
  return (
    <Page size="LETTER" style={styles.page}>
      {/* Title */}
      <Text style={styles.coverTitle}>{title}</Text>
      <Text style={styles.coverSubtitle}>{subtitle}</Text>

      {/* Meta info */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ fontSize: 10, color: colors.textMuted }}>
          Generated: {generatedDate}
        </Text>
        <Text style={{ fontSize: 10, color: colors.textMuted }}>
          Location: {location}
        </Text>
      </View>

      {/* Description */}
      {description && (
        <View style={{ marginBottom: 20, paddingHorizontal: 30 }}>
          <Text
            style={{
              fontSize: 9,
              lineHeight: 1.5,
              color: colors.textMuted,
              textAlign: 'center',
            }}
          >
            {description}
          </Text>
        </View>
      )}

      {/* Executive Summary Box */}
      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>EXECUTIVE SUMMARY</Text>

        {/* Status */}
        <Text
          style={[
            styles.summaryStatus,
            { color: isProfitable ? colors.success : colors.danger },
          ]}
        >
          {isProfitable ? '✓ PROFITABLE' : '✗ NOT PROFITABLE'}: {summaryText}
        </Text>

        {/* Key Metrics */}
        <Text
          style={{
            fontSize: 9,
            fontFamily: 'Helvetica-Bold',
            marginBottom: 8,
            marginTop: 10,
            color: colors.textMuted,
          }}
        >
          Key Metrics:
        </Text>
        {keyMetrics.map((metric, index) => (
          <View key={index} style={styles.summaryMetric}>
            <Text style={styles.summaryLabel}>• {metric.label}:</Text>
            <Text style={styles.summaryValue}>{metric.value}</Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View
        style={{
          position: 'absolute',
          bottom: 40,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 10, color: colors.textMuted }}>
          calc.exergyheat.com
        </Text>
      </View>
    </Page>
  )
}
