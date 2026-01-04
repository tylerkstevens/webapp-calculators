import { View, Text } from '@react-pdf/renderer'
import { styles, tableColumns, colors } from '../styles'
import type { PdfStateRanking } from '../types'

interface PdfDataTableProps {
  rankings: PdfStateRanking[]
  userRanking?: PdfStateRanking
  currencySymbol?: string
}

export default function PdfDataTable({
  rankings,
  userRanking,
  currencySymbol = '$',
}: PdfDataTableProps) {
  // Format COPe value (handle infinity)
  const formatCope = (cope: number): string => {
    if (!isFinite(cope) || cope > 100) return '∞'
    return cope.toFixed(2)
  }

  // Format savings with sign
  const formatSavings = (savings: number): string => {
    const sign = savings >= 0 ? '+' : ''
    return `${sign}${savings.toFixed(0)}%`
  }

  // Combine user ranking into list if provided
  const allRankings = userRanking
    ? [...rankings.slice(0, 10), userRanking, ...rankings.slice(10)]
    : rankings

  return (
    <View style={styles.table}>
      {/* Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { width: tableColumns.rank }]}>
          Rank
        </Text>
        <Text style={[styles.tableHeaderCell, { width: tableColumns.state }]}>
          State
        </Text>
        <Text style={[styles.tableHeaderCell, { width: tableColumns.elecRate }]}>
          Elec Rate
        </Text>
        <Text
          style={[
            styles.tableHeaderCell,
            { width: tableColumns.savings, textAlign: 'right' },
          ]}
        >
          Savings
        </Text>
        <Text
          style={[
            styles.tableHeaderCell,
            { width: tableColumns.cope, textAlign: 'right' },
          ]}
        >
          COPe
        </Text>
        <Text
          style={[
            styles.tableHeaderCell,
            { width: tableColumns.subsidy, textAlign: 'right' },
          ]}
        >
          Subsidy
        </Text>
      </View>

      {/* Rows */}
      {allRankings.map((ranking, index) => (
        <View
          key={ranking.isUser ? 'user' : index}
          style={[
            styles.tableRow,
            ranking.isUser ? styles.tableRowHighlight : {},
            ranking.isUser ? { borderTopWidth: 2, borderTopColor: colors.primary } : {},
          ]}
        >
          <Text style={[styles.tableCell, { width: tableColumns.rank }]}>
            {ranking.isUser ? '★' : ranking.rank}
          </Text>
          <Text
            style={[
              ranking.isUser ? styles.tableCellBold : styles.tableCell,
              { width: tableColumns.state, color: ranking.isUser ? colors.primary : colors.text },
            ]}
          >
            {ranking.isUser ? `YOU (${ranking.state})` : ranking.state}
          </Text>
          <Text style={[styles.tableCell, { width: tableColumns.elecRate }]}>
            {currencySymbol}{ranking.electricityRate.toFixed(3)}
          </Text>
          <Text
            style={[
              styles.tableCellBold,
              {
                width: tableColumns.savings,
                textAlign: 'right',
                color: ranking.savings >= 0 ? colors.success : colors.danger,
              },
            ]}
          >
            {formatSavings(ranking.savings)}
          </Text>
          <Text
            style={[
              styles.tableCell,
              { width: tableColumns.cope, textAlign: 'right' },
            ]}
          >
            {formatCope(ranking.cope)}
          </Text>
          <Text
            style={[
              styles.tableCell,
              { width: tableColumns.subsidy, textAlign: 'right' },
            ]}
          >
            {ranking.subsidy.toFixed(0)}%
          </Text>
        </View>
      ))}

      {/* Legend */}
      <View style={{ marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Text style={{ fontSize: 7, color: colors.textMuted, marginBottom: 3 }}>
          Legend: Savings = vs propane at regional average rates
        </Text>
        <Text style={{ fontSize: 7, color: colors.textMuted, marginBottom: 3 }}>
          COPe = Economic Coefficient of Performance (higher = better)
        </Text>
        <Text style={{ fontSize: 7, color: colors.textMuted }}>
          Subsidy = % of electricity cost offset by mining revenue
        </Text>
      </View>
    </View>
  )
}
