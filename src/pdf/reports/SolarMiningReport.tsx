import { Document, View, Text } from '@react-pdf/renderer'
import { colors } from '../styles'
import PdfCover from '../components/PdfCover'
import PdfPage from '../components/PdfPage'
import PdfSection from '../components/PdfSection'
import PdfInputs from '../components/PdfInputs'
import { PdfResultsCompact } from '../components/PdfResults'
import PdfBarChart from '../components/PdfBarChart'
import type { SolarMiningReportData } from '../types'

interface SolarMiningReportProps {
  data: SolarMiningReportData
}

export default function SolarMiningReport({ data }: SolarMiningReportProps) {
  const {
    mode,
    generatedDate,
    location,
    isProfitable,
    summaryText,
    inputs,
    results,
    monthlyChart,
    comparison,
  } = data

  // Determine total pages and key metrics based on mode
  const totalPages = mode === 'potential' ? 3 : 2
  const title =
    mode === 'potential'
      ? 'Solar Mining Potential'
      : 'Mining vs Net Metering'

  // Build key metrics for cover page
  const keyMetrics =
    mode === 'potential'
      ? [
          {
            label: 'Annual BTC',
            value: results.find((r) => r.label.includes('Annual BTC'))?.value || '-',
          },
          {
            label: 'Annual Revenue',
            value: results.find((r) => r.label.includes('Annual Revenue'))?.value || '-',
          },
          {
            label: 'Revenue per kWh',
            value: results.find((r) => r.label.includes('per kWh'))?.value || '-',
          },
          {
            label: 'Mining Capacity',
            value: results.find((r) => r.label.includes('Capacity'))?.value || '-',
          },
        ]
      : [
          {
            label: 'Mining Revenue',
            value: comparison ? `$${comparison.miningRevenue.toLocaleString()}/yr` : '-',
          },
          {
            label: comparison?.compensationType || 'Net Metering',
            value: comparison ? `$${comparison.netMeteringValue.toLocaleString()}/yr` : '-',
          },
          {
            label: 'Advantage',
            value: comparison
              ? `${comparison.recommendMining ? '+' : '-'}$${Math.abs(comparison.advantage).toLocaleString()}/yr`
              : '-',
          },
          {
            label: 'Multiplier',
            value: comparison ? `${comparison.advantageMultiplier.toFixed(1)}x` : '-',
          },
        ]

  return (
    <Document>
      {/* Cover Page */}
      <PdfCover
        title={title}
        subtitle="Analysis Report"
        generatedDate={generatedDate}
        location={location}
        isProfitable={isProfitable}
        summaryText={summaryText}
        keyMetrics={keyMetrics}
      />

      {/* Page 2: Inputs & Results */}
      <PdfPage pageNumber={2} totalPages={totalPages}>
        <PdfSection title="Input Parameters">
          <PdfInputs categories={inputs} />
        </PdfSection>

        <PdfSection title="Results">
          <PdfResultsCompact results={results} />
        </PdfSection>

        {/* Comparison Summary (for comparison mode) */}
        {mode === 'comparison' && comparison && (
          <PdfSection title="Recommendation">
            <View
              style={{
                backgroundColor: comparison.recommendMining
                  ? '#dcfce7'
                  : '#fef3c7',
                padding: 15,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: 'Helvetica-Bold',
                  color: comparison.recommendMining ? colors.success : '#d97706',
                  marginBottom: 8,
                }}
              >
                {comparison.recommendMining
                  ? '✓ MINING RECOMMENDED'
                  : '⚠ NET METERING MAY BE BETTER'}
              </Text>
              <Text style={{ fontSize: 9, color: colors.text, lineHeight: 1.5 }}>
                {comparison.recommendMining
                  ? `Mining your excess solar could earn you $${comparison.advantage.toLocaleString()} more per year than ${comparison.compensationType.toLowerCase()}. That's ${comparison.advantageMultiplier.toFixed(1)}x the value.`
                  : `${comparison.compensationType} currently provides $${Math.abs(comparison.advantage).toLocaleString()} more per year than mining at current BTC prices. Consider mining if you expect BTC prices to increase.`}
              </Text>
            </View>
          </PdfSection>
        )}
      </PdfPage>

      {/* Page 3: Monthly Breakdown (potential mode only) */}
      {mode === 'potential' && monthlyChart && (
        <PdfPage pageNumber={3} totalPages={totalPages}>
          <PdfSection title="Monthly Revenue Breakdown">
            <PdfBarChart data={monthlyChart} />

            <View style={{ marginTop: 15 }}>
              <Text
                style={{
                  fontSize: 8,
                  color: colors.textMuted,
                  lineHeight: 1.5,
                }}
              >
                Monthly revenue varies with solar production, which depends on
                seasonal sun hours. Summer months typically produce more energy
                and therefore more mining revenue. This projection assumes
                current network difficulty and BTC price remain constant.
              </Text>
            </View>
          </PdfSection>

          {/* Key Assumptions */}
          <PdfSection title="Key Assumptions">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <View style={{ width: '48%' }}>
                <Text
                  style={{
                    fontSize: 8,
                    fontFamily: 'Helvetica-Bold',
                    color: colors.text,
                    marginBottom: 3,
                  }}
                >
                  Mining Only During Sun Hours
                </Text>
                <Text style={{ fontSize: 7, color: colors.textMuted }}>
                  Miners run only when solar panels produce power. No grid
                  electricity is used for mining.
                </Text>
              </View>
              <View style={{ width: '48%' }}>
                <Text
                  style={{
                    fontSize: 8,
                    fontFamily: 'Helvetica-Bold',
                    color: colors.text,
                    marginBottom: 3,
                  }}
                >
                  Constant Difficulty
                </Text>
                <Text style={{ fontSize: 7, color: colors.textMuted }}>
                  Network difficulty is assumed to remain at current levels.
                  Actual earnings may vary as difficulty adjusts.
                </Text>
              </View>
              <View style={{ width: '48%' }}>
                <Text
                  style={{
                    fontSize: 8,
                    fontFamily: 'Helvetica-Bold',
                    color: colors.text,
                    marginBottom: 3,
                  }}
                >
                  Constant BTC Price
                </Text>
                <Text style={{ fontSize: 7, color: colors.textMuted }}>
                  Revenue projections use today's BTC price. HODL strategy may
                  yield different results.
                </Text>
              </View>
              <View style={{ width: '48%' }}>
                <Text
                  style={{
                    fontSize: 8,
                    fontFamily: 'Helvetica-Bold',
                    color: colors.text,
                    marginBottom: 3,
                  }}
                >
                  100% Uptime
                </Text>
                <Text style={{ fontSize: 7, color: colors.textMuted }}>
                  Assumes miners operate whenever solar power is available. Real
                  uptime may be lower.
                </Text>
              </View>
            </View>
          </PdfSection>
        </PdfPage>
      )}
    </Document>
  )
}
