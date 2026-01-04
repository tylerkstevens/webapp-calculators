import { Page, View, Text } from '@react-pdf/renderer'
import { styles } from '../styles'
import type { ReactNode } from 'react'

interface PdfPageProps {
  children: ReactNode
  pageNumber?: number
  totalPages?: number
  showHeader?: boolean
  headerTitle?: string
}

export default function PdfPage({
  children,
  pageNumber,
  totalPages,
  showHeader = true,
  headerTitle = 'Hashrate Heating Analysis',
}: PdfPageProps) {
  return (
    <Page size="LETTER" style={styles.page}>
      {showHeader && (
        <View style={styles.pageHeader}>
          <Text style={{ fontSize: 10, color: '#6b7280' }}>{headerTitle}</Text>
          <Text style={{ fontSize: 8, color: '#9ca3af' }}>calc.exergyheat.com</Text>
        </View>
      )}

      <View style={{ flex: 1 }}>{children}</View>

      {pageNumber && totalPages && (
        <View style={styles.pageFooter}>
          <Text>Generated with calc.exergyheat.com</Text>
          <Text>
            Page {pageNumber} of {totalPages}
          </Text>
        </View>
      )}
    </Page>
  )
}
