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

  // Key metrics for cover page - exclude Heating Power (index 2), include fuel-equivalent from Effective Heat Cost
  const effectiveHeatCostResult = results[0]
  const keyMetrics = [
    { label: effectiveHeatCostResult.label, value: effectiveHeatCostResult.value },
    ...(effectiveHeatCostResult.subValue
      ? [{ label: 'Fuel-Equivalent Cost', value: effectiveHeatCostResult.subValue }]
      : []),
    { label: results[1].label, value: results[1].value }, // Break-even Rate
    { label: results[3].label, value: results[3].value }, // Savings vs Fuel
  ]

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

      {/* Page 2: Inputs & Results */}
      <PdfPage pageNumber={2} totalPages={6} headerTitle="Hashrate Heating Analysis">
        <PdfSection title="Input Parameters">
          <PdfInputs categories={inputs} />
        </PdfSection>

        <PdfSection title="Results">
          <PdfResultsCompact results={results} />
        </PdfSection>
      </PdfPage>

      {/* Page 3: Key Equations */}
      <PdfPage pageNumber={3} totalPages={6} headerTitle="Hashrate Heating Analysis">
        <PdfSection title="Key Equations">
          <Text style={{ fontSize: 8, color: colors.textMuted, marginBottom: 16, lineHeight: 1.4 }}>
            The following equations are used to calculate the economic metrics in this report.
            All calculations are based on current bitcoin network conditions and your input parameters.
          </Text>
          <View style={{ gap: 12 }}>
            {/* Effective Heat Cost */}
            <View style={{ backgroundColor: '#f9fafb', padding: 12, borderRadius: 4 }}>
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 4 }}>
                Effective Heat Cost
              </Text>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Oblique', color: colors.primary, marginBottom: 6 }}>
                = (Daily Electricity Cost - Daily Mining Revenue) / Daily kWh
              </Text>
              <Text style={{ fontSize: 8, color: colors.textMuted, lineHeight: 1.4 }}>
                Your net cost per kWh of heat after bitcoin mining revenue offsets your electricity bill.
                Negative values indicate you're being paid to heat your space.
              </Text>
            </View>

            {/* Break-even Rate */}
            <View style={{ backgroundColor: '#f9fafb', padding: 12, borderRadius: 4 }}>
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 4 }}>
                Break-even Rate
              </Text>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Oblique', color: colors.primary, marginBottom: 6 }}>
                = Daily Mining Revenue / Daily kWh
              </Text>
              <Text style={{ fontSize: 8, color: colors.textMuted, lineHeight: 1.4 }}>
                The electricity rate at which mining revenue exactly equals electricity cost, making heating free.
                If your rate is below this, you profit while heating.
              </Text>
            </View>

            {/* Savings vs Fuel */}
            <View style={{ backgroundColor: '#f9fafb', padding: 12, borderRadius: 4 }}>
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 4 }}>
                Savings vs {fuelType}
              </Text>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Oblique', color: colors.primary, marginBottom: 6 }}>
                = 1 - (Effective Heat Cost / {fuelType} Heat Cost)
              </Text>
              <Text style={{ fontSize: 8, color: colors.textMuted, lineHeight: 1.4 }}>
                Percentage savings compared to heating with {fuelType.toLowerCase()}. Accounts for fuel efficiency (AFUE)
                and converts both costs to equivalent $/MMBTU for fair comparison.
              </Text>
            </View>

            {/* COPe */}
            <View style={{ backgroundColor: '#f9fafb', padding: 12, borderRadius: 4 }}>
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 4 }}>
                COPe (Coefficient of Performance - Economic)
              </Text>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Oblique', color: colors.primary, marginBottom: 6 }}>
                = 1 / (1 - Mining Subsidy)
              </Text>
              <Text style={{ fontSize: 8, color: colors.textMuted, lineHeight: 1.4 }}>
                Economic efficiency metric analogous to heat pump COP. COPe of 2 means 50% cost reduction vs electric resistance.
                COPe of 3+ rivals heat pump efficiency. Approaches infinity as mining revenue approaches electricity cost.
              </Text>
            </View>

            {/* Mining Subsidy */}
            <View style={{ backgroundColor: '#f9fafb', padding: 12, borderRadius: 4 }}>
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: colors.text, marginBottom: 4 }}>
                Mining Subsidy
              </Text>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Oblique', color: colors.primary, marginBottom: 6 }}>
                = (Daily Mining Revenue / Daily Electricity Cost) x 100%
              </Text>
              <Text style={{ fontSize: 8, color: colors.textMuted, lineHeight: 1.4 }}>
                Percentage of your electricity cost offset by bitcoin mining revenue. 100% = free heating (break-even).
                Above 100% means you profit while heating.
              </Text>
            </View>
          </View>
        </PdfSection>
      </PdfPage>

      {/* Page 4: Savings Sensitivity Charts (2x2) */}
      <PdfPage pageNumber={4} totalPages={6} headerTitle="Hashrate Heating Analysis">
        <PdfSection title={`Savings vs ${fuelType} Sensitivity`}>
          {/* Description */}
          <Text style={{ fontSize: 8, color: colors.textMuted, marginBottom: 12, lineHeight: 1.4 }}>
            These charts show how your savings (%) from hashrate heating compare to {fuelType.toLowerCase()} as
            different variables change. Positive values mean hashrate heating saves money compared to {fuelType.toLowerCase()};
            negative values mean it costs more. The orange "YOU" marker shows your current inputs.
          </Text>
          <PdfChartGrid charts={savingsCharts} />
        </PdfSection>
      </PdfPage>

      {/* Page 5: COPe + Subsidy Sensitivity Charts (both rows on one page) */}
      <PdfPage pageNumber={5} totalPages={6} headerTitle="Hashrate Heating Analysis">
        <PdfSection title="COPe (Coefficient of Performance) Sensitivity">
          <Text style={{ fontSize: 8, color: colors.textMuted, marginBottom: 8, lineHeight: 1.4 }}>
            COPe measures heating efficiency including bitcoin mining revenue. Values above 1 mean you get more heat
            value than electricity cost. COPe above 3 rivals heat pump efficiency. Infinite COPe means free heating.
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

      {/* Page 6: State Rankings (3 mini-tables) + Summary + Recommendation */}
      <PdfPage pageNumber={6} totalPages={6} headerTitle="Hashrate Heating Analysis">
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
