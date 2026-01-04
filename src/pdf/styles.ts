import { StyleSheet } from '@react-pdf/renderer'

// Color palette
export const colors = {
  primary: '#16a34a',      // green-600
  primaryLight: '#22c55e', // green-500
  secondary: '#3b82f6',    // blue-500
  text: '#111827',         // gray-900
  textMuted: '#6b7280',    // gray-500
  textLight: '#9ca3af',    // gray-400
  border: '#e5e7eb',       // gray-200
  background: '#f9fafb',   // gray-50
  white: '#ffffff',
  success: '#16a34a',
  warning: '#f59e0b',
  danger: '#dc2626',
}

// Shared styles
export const styles = StyleSheet.create({
  // Page
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: colors.text,
    backgroundColor: colors.white,
  },

  // Header/Footer
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pageFooter: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: colors.textLight,
  },

  // Cover page
  coverTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginTop: 80,
    marginBottom: 10,
    color: colors.text,
  },
  coverSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: colors.textMuted,
    marginBottom: 40,
  },

  // Summary box
  summaryBox: {
    backgroundColor: colors.background,
    padding: 20,
    marginHorizontal: 40,
    marginTop: 20,
    borderRadius: 4,
  },
  summaryTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 15,
    color: colors.text,
  },
  summaryStatus: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 12,
  },
  summaryMetric: {
    flexDirection: 'row',
    marginBottom: 4,
    fontSize: 10,
  },
  summaryLabel: {
    width: 140,
    color: colors.textMuted,
  },
  summaryValue: {
    fontFamily: 'Helvetica-Bold',
    color: colors.text,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 12,
    color: colors.text,
  },

  // Input categories (2-column layout)
  inputGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  inputCategory: {
    width: '48%',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 4,
    marginBottom: 10,
  },
  inputCategoryTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 9,
    color: colors.textMuted,
  },
  inputValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.text,
  },

  // Results
  resultsContainer: {
    marginTop: 15,
  },
  resultCard: {
    backgroundColor: colors.background,
    padding: 12,
    marginBottom: 10,
    borderRadius: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: colors.text,
  },
  resultValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
  },
  resultExplanation: {
    fontSize: 8,
    color: colors.textMuted,
    lineHeight: 1.4,
  },
  resultSubValue: {
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Charts (2x2 grid)
  chartGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chartContainer: {
    width: '48%',
    height: 180,
    padding: 10,
    backgroundColor: colors.background,
    borderRadius: 4,
  },
  chartTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.text,
    marginBottom: 5,
  },
  chartCaption: {
    fontSize: 7,
    color: colors.textMuted,
    marginTop: 5,
  },

  // Table
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRowHighlight: {
    backgroundColor: '#f0fdf4', // green-50
  },
  tableCell: {
    fontSize: 9,
    color: colors.text,
  },
  tableCellBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.text,
  },
})

// Column widths for state rankings table
export const tableColumns = {
  rank: '8%',
  state: '25%',
  elecRate: '17%',
  savings: '17%',
  cope: '16%',
  subsidy: '17%',
}
