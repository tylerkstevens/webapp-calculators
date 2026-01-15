// PDF Report Types

export interface PdfInputItem {
  label: string
  value: string
}

export interface PdfInputCategory {
  title: string
  items: PdfInputItem[]
}

export interface PdfResultItem {
  label: string
  value: string
  explanation: string
  subValue?: string
}

export interface PdfChartPoint {
  x: number
  y: number
}

export interface PdfChartData {
  title: string
  points: PdfChartPoint[]
  currentX: number
  currentY: number
  xLabel: string
  yLabel: string
  xUnit: string
  yUnit: string
  caption: string
}

export interface PdfStateRanking {
  rank: number
  state: string
  electricityRate: number
  savings: number
  cope: number
  subsidy: number
  isUser?: boolean
  // For user ranking: position relative to ranked states
  rankAbove?: number  // State rank the user is just below (e.g., 10)
  rankBelow?: number  // State rank the user is just above (e.g., 11)
  stateAbove?: string // State abbreviation above
  stateBelow?: string // State abbreviation below
}

export interface PdfMiniRanking {
  metric: 'savings' | 'cope' | 'subsidy'
  metricLabel: string
  unit: string
  // States surrounding the user (2 above, 2 below)
  surroundingStates: { rank: number; state: string; value: number; isUser?: boolean }[]
  userRank: {
    position: string // e.g., "between #7-#8" or "above #1" or "#5"
    value: number
  }
}

export interface HashrateHeatingReportData {
  // Header
  generatedDate: string
  location: string
  fuelType: string // e.g., "propane", "natural gas" - for chart descriptions
  description: string // Methodology overview for cover page

  // Executive Summary
  isProfitable: boolean
  summaryText: string

  // Inputs
  inputs: PdfInputCategory[]

  // Results
  results: PdfResultItem[]

  // Charts - Savings vs fuel (2x2): elec, fuel, efficiency, hashprice
  savingsCharts: PdfChartData[]

  // Charts - COPe sensitivity (row of 3): elec, efficiency, hashprice
  copeCharts: PdfChartData[]

  // Charts - Subsidy % sensitivity (row of 3): elec, efficiency, hashprice
  subsidyCharts: PdfChartData[]

  // State Rankings - Mini tables for each metric
  miniRankings: PdfMiniRanking[]
}

export interface PdfBarChartData {
  title: string
  bars: { label: string; value: number }[]
  yLabel: string
  yUnit: string
  caption: string
}

export interface PdfDualAxisChartData {
  title: string
  // Bar data (revenue)
  bars: { label: string; value: number; valueSats: number }[]
  // Line data (generation)
  lineData: number[]
  // Labels
  barLabel: string
  barUnit: string
  lineLabel: string
  lineUnit: string
  caption: string
}

export interface SolarMiningReportData {
  // Mode: 'potential' for full system, 'comparison' for net metering comparison
  mode: 'potential' | 'comparison'

  // Header
  generatedDate: string
  location: string

  // Executive Summary - key metrics shown on cover
  keyMetrics: {
    annualBtc: string
    annualSats: string
    monthlyAvgSats: string
    annualRevenue: string
    annualProductionKwh: string
    monthlyAvgProductionKwh: string
  }
  summaryText: string

  // Solar input method info
  solarInputMethod: {
    source: 'nrel_estimate' | 'manual_annual' | 'manual_monthly'
    description: string
  }

  // Analysis type info (for excess mode)
  analysisType?: {
    type: 'total_potential' | 'excess_comparison'
    compensationType?: string
    compensationRate?: string
  }

  // Inputs
  inputs: PdfInputCategory[]

  // Results
  results: PdfResultItem[]

  // Monthly dual-axis chart (bars + line)
  monthlyChart?: PdfDualAxisChartData

  // Net Metering Comparison (for comparison mode)
  comparison?: {
    netMeteringValue: number
    miningRevenue: number
    advantage: number
    advantageMultiplier: number
    recommendMining: boolean
    compensationType: string
  }
}
