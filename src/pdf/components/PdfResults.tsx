import { View, Text } from '@react-pdf/renderer'
import { styles, colors } from '../styles'
import type { PdfResultItem } from '../types'

interface PdfResultsProps {
  results: PdfResultItem[]
}

export default function PdfResults({ results }: PdfResultsProps) {
  return (
    <View style={styles.resultsContainer}>
      {results.map((result, index) => (
        <View key={index} style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultLabel}>{result.label}</Text>
            <Text style={styles.resultValue}>{result.value}</Text>
          </View>
          <Text style={styles.resultExplanation}>{result.explanation}</Text>
          {result.subValue && (
            <Text style={styles.resultSubValue}>{result.subValue}</Text>
          )}
        </View>
      ))}
    </View>
  )
}

// Compact version for 2-column layout
export function PdfResultsCompact({ results }: PdfResultsProps) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {results.map((result, index) => (
        <View
          key={index}
          style={[styles.resultCard, { width: '48%', marginBottom: 0 }]}
        >
          <View style={styles.resultHeader}>
            <Text style={[styles.resultLabel, { fontSize: 9 }]}>
              {result.label}
            </Text>
            <Text style={[styles.resultValue, { fontSize: 12, color: colors.primary }]}>
              {result.value}
            </Text>
          </View>
          <Text style={[styles.resultExplanation, { fontSize: 7 }]}>
            {result.explanation}
          </Text>
          {result.subValue && (
            <Text style={[styles.resultSubValue, { fontSize: 7 }]}>
              {result.subValue}
            </Text>
          )}
        </View>
      ))}
    </View>
  )
}
