import { Document, View, Text } from '@react-pdf/renderer'
import { colors } from '../styles'
import PdfCover from '../components/PdfCover'
import PdfPage from '../components/PdfPage'
import PdfSection from '../components/PdfSection'
import PdfInputs from '../components/PdfInputs'
import { PdfResultsCompact } from '../components/PdfResults'
import PdfDualAxisChart from '../components/PdfDualAxisChart'
import type { SolarMiningReportData } from '../types'

interface SolarMiningReportProps {
  data: SolarMiningReportData
}

export default function SolarMiningReport({ data }: SolarMiningReportProps) {
  const {
    mode,
    generatedDate,
    location,
    keyMetrics,
    summaryText,
    solarInputMethod,
    analysisType,
    inputs,
    results,
    monthlyChart,
    comparison,
  } = data

  // Determine total pages based on whether monthly chart exists
  const totalPages = monthlyChart ? 4 : 3
  const title =
    mode === 'potential'
      ? 'Solar Mining Potential'
      : 'Mining vs Net Metering'

  // Build key metrics for cover page
  const coverKeyMetrics =
    mode === 'potential'
      ? [
          { label: 'Annual BTC', value: keyMetrics.annualBtc },
          { label: 'Monthly Avg Sats', value: keyMetrics.monthlyAvgSats },
          { label: 'Annual Revenue', value: keyMetrics.annualRevenue },
          { label: 'Annual Production', value: keyMetrics.annualProductionKwh },
          { label: 'Monthly Avg Production', value: keyMetrics.monthlyAvgProductionKwh },
        ]
      : [
          { label: 'Mining Revenue', value: comparison ? `$${comparison.miningRevenue.toLocaleString()}/yr` : '-' },
          { label: comparison?.compensationType || 'Net Metering', value: comparison ? `$${comparison.netMeteringValue.toLocaleString()}/yr` : '-' },
          { label: 'Advantage', value: comparison ? `${comparison.recommendMining ? '+' : '-'}$${Math.abs(comparison.advantage).toLocaleString()}/yr` : '-' },
          { label: 'Excess Energy', value: keyMetrics.annualProductionKwh },
        ]

  return (
    <Document>
      {/* Cover Page */}
      <PdfCover
        title={title}
        subtitle="Analysis Report"
        generatedDate={generatedDate}
        location={location}
        isProfitable={true}
        summaryText={summaryText}
        keyMetrics={coverKeyMetrics}
        hideProfitableStatus={true}
      />

      {/* Page 2: Inputs & Results */}
      <PdfPage pageNumber={2} totalPages={totalPages} headerTitle="Solar Mining Analysis">
        <PdfSection title="Input Parameters">
          {/* Solar data source note */}
          <View style={{ backgroundColor: '#eff6ff', padding: 8, borderRadius: 4, marginBottom: 10 }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1e40af', marginBottom: 2 }}>
              {analysisType?.type === 'excess_comparison' ? 'Excess Energy Comparison' : 'Total Mining Potential'}
            </Text>
            <Text style={{ fontSize: 7, color: '#1e40af' }}>
              {solarInputMethod.description}
              {analysisType?.type === 'excess_comparison' && analysisType.compensationType && (
                ` • Comparing to ${analysisType.compensationType} at ${analysisType.compensationRate}`
              )}
            </Text>
          </View>
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
                backgroundColor: comparison.recommendMining ? '#dcfce7' : '#fef3c7',
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
                  ? 'MINING RECOMMENDED'
                  : 'NET METERING MAY BE BETTER'}
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

      {/* Page 3: Key Equations */}
      <PdfPage pageNumber={3} totalPages={totalPages} headerTitle="Solar Mining Analysis">
        <PdfSection title="Key Equations">
          <Text style={{ fontSize: 8, color: colors.textMuted, marginBottom: 12, lineHeight: 1.4 }}>
            The following equations show how each result was calculated. All calculations use current
            bitcoin network conditions as a point-in-time snapshot.
          </Text>
          <View style={{ gap: 10 }}>
            {/* BTC Earnings */}
            <View style={{ backgroundColor: '#f9fafb', padding: 10, borderRadius: 4 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 3 }}>
                BTC Earnings (sats)
              </Text>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Oblique', color: colors.primary, marginBottom: 4 }}>
                = Solar kWh × Hashvalue × (Miner TH/s / Miner Watts) × 1000
              </Text>
              <Text style={{ fontSize: 7, color: colors.textMuted, lineHeight: 1.3 }}>
                Converts solar energy to bitcoin based on your miner's efficiency (TH/s per kW) and current network hashvalue.
              </Text>
            </View>

            {/* USD Revenue */}
            <View style={{ backgroundColor: '#f9fafb', padding: 10, borderRadius: 4 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 3 }}>
                USD Revenue
              </Text>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Oblique', color: colors.primary, marginBottom: 4 }}>
                = BTC Earnings × BTC Price
              </Text>
              <Text style={{ fontSize: 7, color: colors.textMuted, lineHeight: 1.3 }}>
                Dollar value at current BTC price. Actual value depends on when you sell. This is a freeze-frame snapshot.
              </Text>
            </View>

            {/* Revenue per kWh */}
            <View style={{ backgroundColor: '#f9fafb', padding: 10, borderRadius: 4 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 3 }}>
                Revenue per kWh
              </Text>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Oblique', color: colors.primary, marginBottom: 4 }}>
                = Annual USD Revenue / Annual kWh
              </Text>
              <Text style={{ fontSize: 7, color: colors.textMuted, lineHeight: 1.3 }}>
                Effective $/kWh from mining. Compare to net metering rates to evaluate monetization strategy.
              </Text>
            </View>

            {mode === 'comparison' && (
              <>
                {/* Net Metering Value */}
                <View style={{ backgroundColor: '#f9fafb', padding: 10, borderRadius: 4 }}>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 3 }}>
                    Net Metering Value
                  </Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Oblique', color: colors.primary, marginBottom: 4 }}>
                    = Excess kWh × Compensation Rate ($/kWh)
                  </Text>
                  <Text style={{ fontSize: 7, color: colors.textMuted, lineHeight: 1.3 }}>
                    Value of excess solar exported to grid at your utility's compensation rate.
                  </Text>
                </View>

                {/* Advantage */}
                <View style={{ backgroundColor: '#f9fafb', padding: 10, borderRadius: 4 }}>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 3 }}>
                    Mining Advantage
                  </Text>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Oblique', color: colors.primary, marginBottom: 4 }}>
                    = Mining Revenue - Net Metering Value
                  </Text>
                  <Text style={{ fontSize: 7, color: colors.textMuted, lineHeight: 1.3 }}>
                    Positive = mining earns more. Negative = net metering earns more at current conditions.
                  </Text>
                </View>
              </>
            )}
          </View>
        </PdfSection>

        {/* Key Assumptions */}
        <PdfSection title="Key Assumptions">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <View style={{ width: '48%' }}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 3 }}>
                Constant Network Conditions
              </Text>
              <Text style={{ fontSize: 7, color: colors.textMuted }}>
                Network hashrate, fee %, and hashvalue are assumed constant. Actual earnings vary as
                difficulty adjusts every ~2 weeks.
              </Text>
            </View>
            <View style={{ width: '48%' }}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 3 }}>
                Constant BTC Price
              </Text>
              <Text style={{ fontSize: 7, color: colors.textMuted }}>
                USD revenue uses today's BTC price snapshot. Actual value depends on market conditions
                when you sell.
              </Text>
            </View>
            <View style={{ width: '48%' }}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 3 }}>
                100% Solar Utilization
              </Text>
              <Text style={{ fontSize: 7, color: colors.textMuted }}>
                Assumes all available solar energy is used for mining. Actual utilization depends on
                your system configuration.
              </Text>
            </View>
            <View style={{ width: '48%' }}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 3 }}>
                Seasonal Variation
              </Text>
              <Text style={{ fontSize: 7, color: colors.textMuted }}>
                Monthly production varies with sun hours. Summer typically produces 40-60% more than
                winter months.
              </Text>
            </View>
          </View>
        </PdfSection>
      </PdfPage>

      {/* Page 4: Monthly Breakdown (potential mode only) */}
      {mode === 'potential' && monthlyChart && (
        <PdfPage pageNumber={4} totalPages={totalPages} headerTitle="Solar Mining Analysis">
          <PdfSection title="Monthly Revenue & Generation">
            <PdfDualAxisChart data={monthlyChart} />

            {/* Monthly breakdown table */}
            <View style={{ marginTop: 15 }}>
              {/* Table header */}
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: '#f3f4f6',
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                }}
              >
                <Text style={{ width: '25%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: colors.textMuted }}>
                  Month
                </Text>
                <Text style={{ width: '25%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: colors.textMuted, textAlign: 'right' }}>
                  Generation
                </Text>
                <Text style={{ width: '25%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: colors.textMuted, textAlign: 'right' }}>
                  Revenue (sats)
                </Text>
                <Text style={{ width: '25%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: colors.textMuted, textAlign: 'right' }}>
                  Revenue ($)
                </Text>
              </View>
              {/* Table rows */}
              {monthlyChart.bars.map((bar, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                    borderBottomWidth: index === monthlyChart.bars.length - 1 ? 0 : 0.5,
                    borderBottomColor: '#e5e7eb',
                  }}
                >
                  <Text style={{ width: '25%', fontSize: 7, color: colors.text }}>
                    {bar.label}
                  </Text>
                  <Text style={{ width: '25%', fontSize: 7, color: colors.text, textAlign: 'right' }}>
                    {Math.round(monthlyChart.lineData[index]).toLocaleString()} kWh
                  </Text>
                  <Text style={{ width: '25%', fontSize: 7, color: colors.text, textAlign: 'right' }}>
                    {bar.valueSats.toLocaleString()}
                  </Text>
                  <Text style={{ width: '25%', fontSize: 7, color: colors.text, textAlign: 'right' }}>
                    ${bar.value.toFixed(2)}
                  </Text>
                </View>
              ))}
              {/* Totals row */}
              <View
                style={{
                  flexDirection: 'row',
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                  backgroundColor: '#f0fdf4',
                  borderBottomLeftRadius: 4,
                  borderBottomRightRadius: 4,
                }}
              >
                <Text style={{ width: '25%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: colors.text }}>
                  TOTAL
                </Text>
                <Text style={{ width: '25%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: colors.text, textAlign: 'right' }}>
                  {Math.round(monthlyChart.lineData.reduce((sum, v) => sum + v, 0)).toLocaleString()} kWh
                </Text>
                <Text style={{ width: '25%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: colors.text, textAlign: 'right' }}>
                  {monthlyChart.bars.reduce((sum, b) => sum + b.valueSats, 0).toLocaleString()}
                </Text>
                <Text style={{ width: '25%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: colors.text, textAlign: 'right' }}>
                  ${monthlyChart.bars.reduce((sum, b) => sum + b.value, 0).toFixed(2)}
                </Text>
              </View>
            </View>
          </PdfSection>

          {/* Freeze-frame disclaimer */}
          <View style={{ backgroundColor: '#fef3c7', padding: 10, borderRadius: 4, marginTop: 10 }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#92400e', marginBottom: 4 }}>
              Freeze-Frame Analysis Disclaimer
            </Text>
            <Text style={{ fontSize: 7, color: '#92400e', lineHeight: 1.4 }}>
              This report represents a point-in-time snapshot using current BTC price and network conditions.
              Actual results will vary as: (1) BTC price fluctuates, (2) Network difficulty adjusts every ~2 weeks,
              (3) Transaction fee percentages change with network congestion. For planning purposes, consider
              running scenarios at different price points and network conditions.
            </Text>
          </View>
        </PdfPage>
      )}

      {/* Page 4: Monthly Breakdown (comparison mode) */}
      {mode === 'comparison' && monthlyChart && (
        <PdfPage pageNumber={4} totalPages={totalPages} headerTitle="Solar Mining Analysis">
          <PdfSection title="Monthly Revenue & Excess Energy">
            <PdfDualAxisChart data={monthlyChart} />

            {/* Monthly breakdown table */}
            <View style={{ marginTop: 15 }}>
              {/* Table header */}
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: '#f3f4f6',
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                }}
              >
                <Text style={{ width: '25%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: colors.textMuted }}>
                  Month
                </Text>
                <Text style={{ width: '25%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: colors.textMuted, textAlign: 'right' }}>
                  Excess Energy
                </Text>
                <Text style={{ width: '25%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: colors.textMuted, textAlign: 'right' }}>
                  Revenue (sats)
                </Text>
                <Text style={{ width: '25%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: colors.textMuted, textAlign: 'right' }}>
                  Revenue ($)
                </Text>
              </View>
              {/* Table rows */}
              {monthlyChart.bars.map((bar, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                    borderBottomWidth: index === monthlyChart.bars.length - 1 ? 0 : 0.5,
                    borderBottomColor: '#e5e7eb',
                  }}
                >
                  <Text style={{ width: '25%', fontSize: 7, color: colors.text }}>
                    {bar.label}
                  </Text>
                  <Text style={{ width: '25%', fontSize: 7, color: colors.text, textAlign: 'right' }}>
                    {Math.round(monthlyChart.lineData[index]).toLocaleString()} kWh
                  </Text>
                  <Text style={{ width: '25%', fontSize: 7, color: colors.text, textAlign: 'right' }}>
                    {bar.valueSats.toLocaleString()}
                  </Text>
                  <Text style={{ width: '25%', fontSize: 7, color: colors.text, textAlign: 'right' }}>
                    ${bar.value.toFixed(2)}
                  </Text>
                </View>
              ))}
              {/* Totals row */}
              <View
                style={{
                  flexDirection: 'row',
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                  backgroundColor: '#f0fdf4',
                  borderBottomLeftRadius: 4,
                  borderBottomRightRadius: 4,
                }}
              >
                <Text style={{ width: '25%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: colors.text }}>
                  TOTAL
                </Text>
                <Text style={{ width: '25%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: colors.text, textAlign: 'right' }}>
                  {Math.round(monthlyChart.lineData.reduce((sum, v) => sum + v, 0)).toLocaleString()} kWh
                </Text>
                <Text style={{ width: '25%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: colors.text, textAlign: 'right' }}>
                  {monthlyChart.bars.reduce((sum, b) => sum + b.valueSats, 0).toLocaleString()}
                </Text>
                <Text style={{ width: '25%', fontSize: 7, fontFamily: 'Helvetica-Bold', color: colors.text, textAlign: 'right' }}>
                  ${monthlyChart.bars.reduce((sum, b) => sum + b.value, 0).toFixed(2)}
                </Text>
              </View>
            </View>
          </PdfSection>

          {/* Freeze-frame disclaimer */}
          <View style={{ backgroundColor: '#fef3c7', padding: 10, borderRadius: 4, marginTop: 10 }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#92400e', marginBottom: 4 }}>
              Freeze-Frame Analysis Disclaimer
            </Text>
            <Text style={{ fontSize: 7, color: '#92400e', lineHeight: 1.4 }}>
              This report represents a point-in-time snapshot using current BTC price and network conditions.
              Actual results will vary as: (1) BTC price fluctuates, (2) Network difficulty adjusts every ~2 weeks,
              (3) Transaction fee percentages change with network congestion. The mining vs {comparison?.compensationType?.toLowerCase() || 'net metering'} comparison
              may shift as market conditions change.
            </Text>
          </View>
        </PdfPage>
      )}
    </Document>
  )
}
