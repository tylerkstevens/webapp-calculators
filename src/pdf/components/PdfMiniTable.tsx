import { View, Text } from '@react-pdf/renderer'
import { colors } from '../styles'
import type { PdfMiniRanking } from '../types'

interface PdfMiniTableProps {
  data: PdfMiniRanking
}

export default function PdfMiniTable({ data }: PdfMiniTableProps) {
  const { metricLabel, unit, surroundingStates, userRank } = data

  // Format value based on metric
  const formatValue = (value: number): string => {
    if (data.metric === 'cope') {
      return value >= 100 ? '∞' : value.toFixed(2)
    }
    return `${value.toFixed(1)}${unit}`
  }

  return (
    <View
      style={{
        width: 175,
        backgroundColor: colors.background,
        borderRadius: 4,
        padding: 8,
      }}
    >
      {/* Header */}
      <View
        style={{
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          paddingBottom: 6,
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            fontSize: 9,
            fontFamily: 'Helvetica-Bold',
            color: colors.text,
            textAlign: 'center',
          }}
        >
          {metricLabel}
        </Text>
      </View>

      {/* Surrounding states with user in context */}
      {surroundingStates.map((item, index) => {
        const rowStyle = item.isUser
          ? {
              flexDirection: 'row' as const,
              justifyContent: 'space-between' as const,
              alignItems: 'center' as const,
              paddingVertical: 4,
              paddingHorizontal: 4,
              borderBottomWidth: index < surroundingStates.length - 1 ? 1 : 0,
              borderBottomColor: colors.border,
              backgroundColor: '#f0fdf4',
              borderRadius: 3,
              marginVertical: 2,
            }
          : {
              flexDirection: 'row' as const,
              justifyContent: 'space-between' as const,
              alignItems: 'center' as const,
              paddingVertical: 4,
              paddingHorizontal: 4,
              borderBottomWidth: index < surroundingStates.length - 1 ? 1 : 0,
              borderBottomColor: '#f3f4f6',
            }
        return (
        <View key={index} style={rowStyle}>
          {/* Rank */}
          <Text
            style={{
              fontSize: 8,
              color: item.isUser ? colors.warning : colors.textMuted,
              fontFamily: item.isUser ? 'Helvetica-Bold' : 'Helvetica',
              width: 28,
            }}
          >
            {item.isUser ? 'YOU' : `#${item.rank}`}
          </Text>

          {/* State */}
          <Text
            style={{
              fontSize: 8,
              color: item.isUser ? colors.primary : colors.text,
              fontFamily: item.isUser ? 'Helvetica-Bold' : 'Helvetica',
              width: 35,
            }}
          >
            {item.isUser ? '' : item.state}
          </Text>

          {/* Value */}
          <Text
            style={{
              fontSize: 8,
              fontFamily: 'Helvetica-Bold',
              color: item.isUser ? colors.primary : colors.text,
              textAlign: 'right',
              flex: 1,
            }}
          >
            {formatValue(item.value)}
          </Text>
        </View>
      )})}


      {/* Position indicator */}
      <View
        style={{
          marginTop: 6,
          paddingTop: 6,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Text
          style={{
            fontSize: 7,
            color: colors.textMuted,
            textAlign: 'center',
          }}
        >
          You rank {userRank.position}
        </Text>
      </View>
    </View>
  )
}
