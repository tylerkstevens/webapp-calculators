import { Document, View, Text } from '@react-pdf/renderer'
import {
  PdfCover,
  PdfPage,
  PdfSection,
  PdfInputs,
  PdfResultsCompact,
  PdfChartGrid,
  PdfChartRow,
  PdfMiniTable,
} from '../components'
import { colors } from '../styles'
import type { HashrateHeatingReportData } from '../types'

interface HashrateHeatingReportProps {
  data: HashrateHeatingReportData
}

export default function HashrateHeatingReport({ data }: HashrateHeatingReportProps) {
  const {
    generatedDate,
    location,
    fuelType,
    description,
    isProfitable,
    summaryText,
    inputs,
    results,
    savingsCharts,
    copeCharts,
    subsidyCharts,
    miniRankings,
  } = data

  // Key metrics for cover page
  const keyMetrics = results.slice(0, 4).map((r) => ({
    label: r.label,
    value: r.value,
  }))

  // Get savings ranking for summary text
  const savingsRanking = miniRankings.find((r) => r.metric === 'savings')
  const userSavings = savingsRanking?.userRank.value || 0

  return (
    <Document
      title="Hashrate Heating Energy Comparison Analysis Report"
      author="calc.exergyheat.com"
      subject="Bitcoin mining heater economics analysis"
      creator="calc.exergyheat.com"
    >
      {/* Page 1: Cover */}
      <PdfCover
        title="HASHRATE HEATING"
        subtitle="Energy Comparison Analysis Report"
        generatedDate={generatedDate}
        location={location}
        description={description}
        isProfitable={isProfitable}
        summaryText={summaryText}
        keyMetrics={keyMetrics}
      />

      {/* Page 2: Inputs, Results & Equations */}
      <PdfPage pageNumber={2} totalPages={5} headerTitle="Hashrate Heating Analysis">
        <PdfSection title="Input Parameters">
          <PdfInputs categories={inputs} />
        </PdfSection>

        <PdfSection title="Results">
          <PdfResultsCompact results={results} />
        </PdfSection>

        {/* Key Equations */}
        <PdfSection title="Key Equations">
          <View
            style={{
              backgroundColor: '#f9fafb',
              padding: 12,
              borderRadius: 4,
            }}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <View style={{ width: '48%', marginBottom: 8 }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 2 }}>
                  Effective Heat Cost
                </Text>
                <Text style={{ fontSize: 7, color: colors.textMuted }}>
                  = (Daily Elec Cost - Mining Revenue) / Daily kWh
                </Text>
              </View>
              <View style={{ width: '48%', marginBottom: 8 }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 2 }}>
                  Break-even Rate
                </Text>
                <Text style={{ fontSize: 7, color: colors.textMuted }}>
                  = Daily Mining Revenue / Daily kWh
                </Text>
              </View>
              <View style={{ width: '48%', marginBottom: 8 }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 2 }}>
                  Heating Power
                </Text>
                <Text style={{ fontSize: 7, color: colors.textMuted }}>
                  = Miner Wattage × 3.412 BTU/h per Watt
                </Text>
              </View>
              <View style={{ width: '48%', marginBottom: 8 }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 2 }}>
                  Savings vs {fuelType}
                </Text>
                <Text style={{ fontSize: 7, color: colors.textMuted }}>
                  = 1 - (Effective Heat Cost / {fuelType} Heat Cost)
                </Text>
              </View>
              <View style={{ width: '48%' }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 2 }}>
                  COPe (Coefficient of Performance)
                </Text>
                <Text style={{ fontSize: 7, color: colors.textMuted }}>
                  = Heat Output / (Elec Cost - Mining Revenue)
                </Text>
              </View>
              <View style={{ width: '48%' }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 2 }}>
                  Mining Subsidy
                </Text>
                <Text style={{ fontSize: 7, color: colors.textMuted }}>
                  = (Mining Revenue / Elec Cost) × 100%
                </Text>
              </View>
            </View>
          </View>
        </PdfSection>
      </PdfPage>

      {/* Page 3: Savings Sensitivity Charts (2x2) */}
      <PdfPage pageNumber={3} totalPages={5} headerTitle="Hashrate Heating Analysis">
        <PdfSection title={`Savings vs ${fuelType} Sensitivity`}>
          {/* Description */}
          <Text style={{ fontSize: 8, color: colors.textMuted, marginBottom: 12, lineHeight: 1.4 }}>
            These charts show how your annual savings from hashrate heating compare to {fuelType.toLowerCase()} as
            different variables change. Positive values mean hashrate heating saves money compared to {fuelType.toLowerCase()};
            negative values mean it costs more. The orange "YOU" marker shows your current inputs.
          </Text>
          <PdfChartGrid charts={savingsCharts} />
        </PdfSection>
      </PdfPage>

      {/* Page 4: COPe + Subsidy Sensitivity Charts (both rows on one page) */}
      <PdfPage pageNumber={4} totalPages={5} headerTitle="Hashrate Heating Analysis">
        <PdfSection title="COPe (Coefficient of Performance) Sensitivity">
          <Text style={{ fontSize: 8, color: colors.textMuted, marginBottom: 8, lineHeight: 1.4 }}>
            COPe measures heating efficiency including bitcoin mining revenue. Values above 1 mean you get more heat
            value than electricity cost. COPe above 3 rivals heat pump efficiency. COPe = ∞ means free heating.
          </Text>
          <PdfChartRow charts={copeCharts} />
        </PdfSection>

        <PdfSection title="Mining Subsidy Sensitivity">
          <Text style={{ fontSize: 8, color: colors.textMuted, marginBottom: 8, lineHeight: 1.4 }}>
            Mining subsidy shows what percentage of your electricity bill is offset by bitcoin mining revenue.
            At 100%, your heating is effectively free. Above 100%, you profit while heating your space.
          </Text>
          <PdfChartRow charts={subsidyCharts} />
        </PdfSection>
      </PdfPage>

      {/* Page 5: State Rankings (3 mini-tables) + Summary + Recommendation */}
      <PdfPage pageNumber={5} totalPages={5} headerTitle="Hashrate Heating Analysis">
        <PdfSection title="Regional Comparison Rankings">
          <Text style={{ fontSize: 8, color: colors.textMuted, marginBottom: 10, lineHeight: 1.4 }}>
            How your location compares to other regions across three key metrics. Each table shows the top 5 regions
            and your position.
          </Text>

          {/* Three mini-tables side by side */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            {miniRankings.map((ranking, i) => (
              <PdfMiniTable key={i} data={ranking} />
            ))}
          </View>

          {/* Summary */}
          <View
            style={{
              marginTop: 12,
              padding: 8,
              backgroundColor: '#f9fafb',
              borderRadius: 4,
            }}
          >
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 3 }}>
              How You Compare
            </Text>
            <Text style={{ fontSize: 8, color: colors.textMuted, lineHeight: 1.4 }}>
              {miniRankings.map((r) => `${r.metricLabel}: ${r.userRank.position}`).join(' • ')}
              {`. With ${userSavings.toFixed(1)}% savings vs ${fuelType.toLowerCase()}, hashrate heating is ${isProfitable ? 'economically viable' : 'not cost-effective'} at your location.`}
            </Text>
          </View>
        </PdfSection>

        {/* Final Recommendation */}
        <PdfSection title="Recommendation">
          <View
            style={{
              padding: 10,
              backgroundColor: isProfitable ? '#dcfce7' : '#fef2f2',
              borderRadius: 6,
              borderLeftWidth: 4,
              borderLeftColor: isProfitable ? colors.success : colors.danger,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontFamily: 'Helvetica-Bold',
                color: isProfitable ? colors.success : colors.danger,
                marginBottom: 4,
              }}
            >
              {isProfitable ? '✓ HASHRATE HEATING IS RECOMMENDED' : '✗ HASHRATE HEATING IS NOT RECOMMENDED'}
            </Text>
            <Text style={{ fontSize: 8, color: colors.text, lineHeight: 1.4 }}>
              {summaryText}
            </Text>
          </View>
        </PdfSection>
      </PdfPage>
    </Document>
  )
}
