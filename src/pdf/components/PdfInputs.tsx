import { View, Text } from '@react-pdf/renderer'
import { styles } from '../styles'
import type { PdfInputCategory } from '../types'

interface PdfInputsProps {
  categories: PdfInputCategory[]
}

export default function PdfInputs({ categories }: PdfInputsProps) {
  return (
    <View style={styles.inputGrid}>
      {categories.map((category, catIndex) => (
        <View key={catIndex} style={styles.inputCategory}>
          <Text style={styles.inputCategoryTitle}>{category.title}</Text>
          {category.items.map((item, itemIndex) => (
            <View key={itemIndex} style={styles.inputRow}>
              <Text style={styles.inputLabel}>{item.label}</Text>
              <Text style={styles.inputValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}
