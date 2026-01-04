import { View, Text } from '@react-pdf/renderer'
import { styles } from '../styles'
import type { ReactNode } from 'react'

interface PdfSectionProps {
  title?: string
  children: ReactNode
}

export default function PdfSection({ title, children }: PdfSectionProps) {
  return (
    <View style={styles.section}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      {children}
    </View>
  )
}
