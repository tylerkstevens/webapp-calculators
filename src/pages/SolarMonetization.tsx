import { useState, useMemo, useEffect } from 'react'
import { Sun, Zap, Loader2, TrendingUp, DollarSign, BookOpen, Bitcoin, Pencil, RefreshCw, Info } from 'lucide-react'

import InputField from '../components/InputField'
import SelectField from '../components/SelectField'
import SmartTooltip from '../components/SmartTooltip'
import DualAxisChart from '../components/DualAxisChart'
import PdfReportButton from '../components/PdfReportButton'
import SEO from '../components/SEO'
import type { SolarMiningReportData, PdfInputCategory, PdfResultItem } from '../pdf/types'

import {
  calculateSolarMining,
  calculateNetMeteringComparison,
  calculateMonthlyExcessMining,
  formatBtc,
  formatUsd,
  formatKwh,
  getMonthName,
  MINER_PRESETS,
  DEFAULT_CUSTOM_MINER,
  MinerSpec,
} from '../calculations/solar'

import { getSolarEstimate, SolarEstimate } from '../api/solar'
import {
  getBraiinsData,
  BraiinsMetrics,
  calculateHashvalueSats,
  calculateImpliedHashrate,
} from '../api/bitcoin'

// ============================================================================
// Types
// ============================================================================

type InputMode = 'estimate' | 'production' | 'excess'
type CompensationType = 'credits' | 'netBilling' | 'cashOut'

// ============================================================================
// Constants - Compensation Types
// ============================================================================

const COMPENSATION_TYPES: Record<CompensationType, {
  label: string
  icon: string
  defaultRate: string
  shortDesc: string
  tooltip: string
}> = {
  credits: {
    label: 'Bill Credits',
    icon: '💳',
    defaultRate: '0.12',
    shortDesc: '~12¢/kWh',
    tooltip: 'Each kWh exported = 1 kWh credit on your bill. Credits offset future electricity purchases at full retail rate. Best value if you use all your credits within the year.'
  },
  netBilling: {
    label: 'Net Billing',
    icon: '📊',
    defaultRate: '0.05',
    shortDesc: '~5¢/kWh',
    tooltip: "Your utility pays their 'avoided cost' rate — what they'd pay a power plant. Common in CA (NEM 3.0), AZ, ID, AR. Usually 30-50% of retail rate."
  },
  cashOut: {
    label: 'Annual Cash-Out',
    icon: '💵',
    defaultRate: '0.02',
    shortDesc: '~2¢/kWh',
    tooltip: 'Credits roll over monthly, but excess at year-end is paid out at a much lower rate (often 1-3¢/kWh). Common with Xcel (CO), TVA, and many utilities.'
  }
}

// ============================================================================
// Component
// ============================================================================

export default function SolarMonetization() {
  // ============================================================================
  // State - Bitcoin Data
  // ============================================================================
  const [braiinsData, setBraiinsData] = useState<BraiinsMetrics | null>(null)
  const [loadingBtc, setLoadingBtc] = useState(true)

  // Manual overrides for scenario exploration (Three-Knob System)
  // Knob 1 (Price): BTC Price ↔ Hashprice (editing one implies the other)
  // Knob 2 (Network): Fee % is the anchor, Network Hashrate ↔ Hashvalue imply each other
  const [btcPriceOverride, setBtcPriceOverride] = useState<string>('')
  const [hashvalueOverride, setHashvalueOverride] = useState<string>('')
  const [hashpriceOverride, setHashpriceOverride] = useState<string>('')
  const [networkHashrateOverride, setNetworkHashrateOverride] = useState<string>('')
  const [feeOverride, setFeeOverride] = useState<string>('')

  // ============================================================================
  // State - Solar Data
  // ============================================================================
  const [solarEstimate, setSolarEstimate] = useState<SolarEstimate | null>(null)
  const [loadingSolar, setLoadingSolar] = useState(false)
  const [solarError, setSolarError] = useState<string>('')

  // ============================================================================
  // State - User Inputs
  // ============================================================================
  const [inputMode, setInputMode] = useState<InputMode>('estimate')
  const [zipCode, setZipCode] = useState('')
  const [systemSizeKw, setSystemSizeKw] = useState('10')
  const [annualProductionKwh, setAnnualProductionKwh] = useState('')
  const [excessKwh, setExcessKwh] = useState('')
  const [compensationType, setCompensationType] = useState<CompensationType>('netBilling')
  const [netMeteringRate, setNetMeteringRate] = useState('0.05') // Net billing default

  // Data entry method toggle (for production/excess modes)
  const [dataEntryMethod, setDataEntryMethod] = useState<'annual' | 'monthly'>('annual')

  // Monthly production inputs (12 months, Jan-Dec)
  const [monthlyProductionInputs, setMonthlyProductionInputs] = useState<string[]>(
    Array(12).fill('')
  )

  // Monthly export inputs (12 months, for excess mode)
  const [monthlyExportInputs, setMonthlyExportInputs] = useState<string[]>(
    Array(12).fill('')
  )

  // Miner selection
  const [minerType, setMinerType] = useState('Custom')
  const [minerPower, setMinerPower] = useState('850')
  const [minerHashrate, setMinerHashrate] = useState('40')

  // ============================================================================
  // Effects - Fetch Bitcoin Data
  // ============================================================================
  useEffect(() => {
    async function fetchBtcData() {
      setLoadingBtc(true)
      try {
        const data = await getBraiinsData()
        setBraiinsData(data)
      } catch (error) {
        console.error('Error fetching BTC data:', error)
      } finally {
        setLoadingBtc(false)
      }
    }
    fetchBtcData()
  }, [])

  // ============================================================================
  // Effects - Fetch Solar Estimate (when zip code changes)
  // ============================================================================
  useEffect(() => {
    async function fetchSolarData() {
      if (zipCode.length < 5 || inputMode !== 'estimate') {
        setSolarError('')
        return
      }

      setLoadingSolar(true)
      setSolarError('')
      try {
        const systemKw = parseFloat(systemSizeKw) || 10
        const estimate = await getSolarEstimate(zipCode, systemKw)
        setSolarEstimate(estimate)
      } catch (error) {
        console.error('Error fetching solar estimate:', error)
        setSolarEstimate(null)
        setSolarError('Invalid zip code - please verify and try again')
      } finally {
        setLoadingSolar(false)
      }
    }

    // Debounce the API call
    const timer = setTimeout(fetchSolarData, 500)
    return () => clearTimeout(timer)
  }, [zipCode, systemSizeKw, inputMode])

  // ============================================================================
  // Effects - Update miner specs when preset changes
  // ============================================================================
  useEffect(() => {
    const preset = MINER_PRESETS.find(m => m.name === minerType)
    if (preset) {
      setMinerPower(preset.powerW.toString())
      setMinerHashrate(preset.hashrateTH.toString())
    } else {
      setMinerPower(DEFAULT_CUSTOM_MINER.powerW.toString())
      setMinerHashrate(DEFAULT_CUSTOM_MINER.hashrateTH.toString())
    }
  }, [minerType])

  // ============================================================================
  // Override Handlers (Three-Knob System)
  // ============================================================================

  // Price group handlers (Knob 1)
  const handleBtcPriceOverride = (value: string) => {
    setBtcPriceOverride(value)
    setHashpriceOverride('')  // Clear other in same group
  }

  const handleHashpriceOverride = (value: string) => {
    setHashpriceOverride(value)
    setBtcPriceOverride('')   // Clear other in same group
  }

  // Network group handlers (Three-Knob System)
  // Fee % is the anchor - never implied, only explicitly set
  // When adjusting hashvalue: hold fee %, recalc network hashrate
  // When adjusting network hashrate: hold fee %, recalc hashvalue
  const handleFeeOverride = (value: string) => {
    // Clamp to 0-99
    const num = parseInt(value)
    if (value === '' || isNaN(num)) {
      setFeeOverride('')
    } else {
      setFeeOverride(Math.min(99, Math.max(0, num)).toString())
    }
    // Fee adjustment holds network hashrate fixed, hashvalue is recalculated
  }

  const handleHashvalueOverride = (value: string) => {
    setHashvalueOverride(value)
    setNetworkHashrateOverride('')  // Hashvalue override implies network hashrate
  }

  const handleNetworkHashrateOverride = (value: string) => {
    setNetworkHashrateOverride(value)
    setHashvalueOverride('')  // Network hashrate override implies hashvalue
  }

  // Check if user has any overrides active
  const hasOverrides = btcPriceOverride !== '' || hashvalueOverride !== '' ||
                       hashpriceOverride !== '' || networkHashrateOverride !== '' ||
                       feeOverride !== ''

  // Compensation type handler
  const handleCompensationTypeChange = (type: CompensationType) => {
    setCompensationType(type)
    setNetMeteringRate(COMPENSATION_TYPES[type].defaultRate)
  }

  // ============================================================================
  // Three-Knob Calculation Model
  // ============================================================================
  // Knob 1 (Price): BTC Price ↔ Hashprice
  //   - hashprice = hashvalue × btcPrice / 1e8
  //   - btcPrice = hashprice × 1e8 / hashvalue
  //
  // Knob 2 (Network): Fee % is the ANCHOR (never implied)
  //   - Adjust Fee % → Hold Network Hashrate → Recalc Hashvalue
  //   - Adjust Hashvalue → Hold Fee % → Recalc Network Hashrate
  //   - Adjust Network Hashrate → Hold Fee % → Recalc Hashvalue
  // ============================================================================

  // Get block subsidy from API data (auto-halving based on block height)
  const blockSubsidy = braiinsData?.blockSubsidy ?? 3.125

  // Effective fee % (user override or API value)
  const effectiveFeePercent = useMemo(() => {
    if (feeOverride !== '') {
      const fee = parseInt(feeOverride)
      if (!isNaN(fee) && fee >= 0 && fee <= 99) return fee
    }
    return braiinsData?.feePercent ?? 6
  }, [feeOverride, braiinsData])

  // KNOB 2: Calculate effective network hashrate (Network group)
  // Three-knob logic: Fee % is anchor, hashvalue and network hashrate imply each other
  const effectiveNetworkHashrate = useMemo(() => {
    if (networkHashrateOverride) {
      const nh = parseFloat(networkHashrateOverride)
      if (nh > 0) return nh * 1e6 // Convert EH/s to TH/s
    }
    if (hashvalueOverride) {
      const hv = parseFloat(hashvalueOverride)
      if (hv > 0) {
        // Back-calculate: networkHashrate = daily_reward_sats / hashvalue
        // Using effectiveFeePercent to calculate total reward
        return calculateImpliedHashrate(blockSubsidy, effectiveFeePercent, hv)
      }
    }
    return braiinsData?.networkHashrate ?? null
  }, [networkHashrateOverride, hashvalueOverride, braiinsData, blockSubsidy, effectiveFeePercent])

  // Calculate effective hashvalue (derived from network hashrate or API)
  const effectiveHashvalue = useMemo(() => {
    if (hashvalueOverride) {
      const hv = parseFloat(hashvalueOverride)
      if (hv > 0) return hv
    }
    // If networkHashrate is overridden OR fee is overridden, recalculate hashvalue
    if (networkHashrateOverride || feeOverride !== '') {
      const nh = networkHashrateOverride
        ? parseFloat(networkHashrateOverride) * 1e6
        : (braiinsData?.networkHashrate ?? null)
      if (nh && nh > 0) {
        return calculateHashvalueSats(blockSubsidy, effectiveFeePercent, nh)
      }
    }
    // Use API hashvalue directly (in sats/TH/day)
    if (braiinsData?.hashvalueSats) {
      return braiinsData.hashvalueSats
    }
    // Legacy fallback: convert from BTC/TH/day to sats
    if (braiinsData?.hashvalue) {
      return braiinsData.hashvalue * 1e8
    }
    // Final fallback: calculate from network hashrate
    if (effectiveNetworkHashrate && effectiveNetworkHashrate > 0) {
      return calculateHashvalueSats(blockSubsidy, effectiveFeePercent, effectiveNetworkHashrate)
    }
    return null
  }, [hashvalueOverride, networkHashrateOverride, feeOverride, braiinsData, effectiveNetworkHashrate, blockSubsidy, effectiveFeePercent])

  // KNOB 1: Calculate effective BTC price (Price group)
  const effectiveBtcPrice = useMemo(() => {
    if (btcPriceOverride) {
      return parseFloat(btcPriceOverride) || (braiinsData?.btcPrice ?? null)
    }
    if (hashpriceOverride && effectiveHashvalue) {
      const hp = parseFloat(hashpriceOverride)
      if (hp > 0 && effectiveHashvalue > 0) {
        // Back-calculate: btcPrice = hashprice × 1e8 / hashvalue
        return (hp * 1e8) / effectiveHashvalue
      }
    }
    return braiinsData?.btcPrice ?? null
  }, [btcPriceOverride, hashpriceOverride, effectiveHashvalue, braiinsData])

  // Calculate effective hashprice (hashprice = hashvalue × btcPrice / 1e8)
  // Always derive from effective values to stay consistent with network overrides
  const effectiveHashprice = useMemo(() => {
    if (hashpriceOverride) {
      const hp = parseFloat(hashpriceOverride)
      if (hp > 0) return hp
    }
    // Always calculate from effective values when available
    // This ensures hashprice updates when hashvalue changes due to network overrides
    if (effectiveBtcPrice && effectiveHashvalue) {
      return (effectiveHashvalue * effectiveBtcPrice) / 1e8
    }
    // Fallback to API hashprice (only when effective values unavailable)
    if (braiinsData?.hashprice) {
      return braiinsData.hashprice
    }
    return null
  }, [hashpriceOverride, braiinsData, effectiveHashvalue, effectiveBtcPrice])

  // Network metrics for display
  const networkMetrics = useMemo(() => {
    if (!effectiveBtcPrice || !effectiveHashvalue || !effectiveNetworkHashrate) return null
    return {
      hashvalue: effectiveHashvalue,
      hashprice: effectiveHashprice || (effectiveHashvalue * effectiveBtcPrice) / 1e8,
      networkHashrateEH: effectiveNetworkHashrate / 1e6,
    }
  }, [effectiveBtcPrice, effectiveHashvalue, effectiveNetworkHashrate, effectiveHashprice])

  // ============================================================================
  // Derived Values
  // ============================================================================

  // Current miner specs
  const miner: MinerSpec = useMemo(() => ({
    name: minerType,
    powerW: parseFloat(minerPower) || 850,
    hashrateTH: parseFloat(minerHashrate) || 40,
  }), [minerType, minerPower, minerHashrate])

  // Note: Miner quantity removed - calculations now assume 100% solar utilization

  // Check if we have required data for calculations
  const hasRequiredData = effectiveBtcPrice !== null && effectiveHashvalue !== null

  // Generic seasonal distribution factors (US average)
  const SEASONAL_FACTORS = [0.060, 0.065, 0.080, 0.090, 0.100, 0.105, 0.105, 0.100, 0.090, 0.080, 0.065, 0.060]

  // Monthly production breakdown
  const monthlyKwh = useMemo(() => {
    if (inputMode === 'estimate' && solarEstimate) {
      return solarEstimate.monthlyKwh
    }

    // Monthly entry: use user's inputs directly
    if (dataEntryMethod === 'monthly') {
      return monthlyProductionInputs.map(v => parseFloat(v) || 0)
    }

    // Annual entry: distribute by location's production profile or generic seasonal factors
    const annual = parseFloat(annualProductionKwh) || 0
    if (solarEstimate?.monthlyKwh) {
      // Use NREL's monthly production ratios (already accounts for location)
      const nrelTotal = solarEstimate.monthlyKwh.reduce((a, b) => a + b, 0)
      if (nrelTotal > 0) {
        return solarEstimate.monthlyKwh.map(
          kwh => Math.round(annual * (kwh / nrelTotal))
        )
      }
    }

    // Fallback: generic seasonal factors
    return SEASONAL_FACTORS.map(f => Math.round(annual * f))
  }, [inputMode, solarEstimate, dataEntryMethod, monthlyProductionInputs, annualProductionKwh])

  // Annual production (from estimate, monthly sum, or user input)
  const annualKwh = useMemo(() => {
    if (inputMode === 'estimate' && solarEstimate) {
      return solarEstimate.annualKwh
    }
    // Monthly entry: sum of monthly inputs
    if (dataEntryMethod === 'monthly') {
      return monthlyKwh.reduce((sum, val) => sum + val, 0)
    }
    return parseFloat(annualProductionKwh) || 0
  }, [inputMode, solarEstimate, dataEntryMethod, monthlyKwh, annualProductionKwh])

  // Monthly export breakdown (for excess mode)
  const monthlyExportKwh = useMemo(() => {
    if (inputMode !== 'excess') return null

    // Monthly entry: use user's inputs directly
    if (dataEntryMethod === 'monthly') {
      return monthlyExportInputs.map(v => parseFloat(v) || 0)
    }

    // Annual entry: distribute by location's production profile or generic seasonal factors
    const annualExport = parseFloat(excessKwh) || 0
    if (annualExport === 0) return Array(12).fill(0)

    // Use NREL's monthly production ratios if available (excess correlates with production)
    if (solarEstimate?.monthlyKwh) {
      const nrelTotal = solarEstimate.monthlyKwh.reduce((a, b) => a + b, 0)
      if (nrelTotal > 0) {
        return solarEstimate.monthlyKwh.map(
          kwh => Math.round(annualExport * (kwh / nrelTotal))
        )
      }
    }

    // Fallback: generic seasonal factors
    return SEASONAL_FACTORS.map(f => Math.round(annualExport * f))
  }, [inputMode, dataEntryMethod, monthlyExportInputs, excessKwh, solarEstimate])

  // Annual export (from monthly sum or user input)
  const annualExportKwh = useMemo(() => {
    if (inputMode !== 'excess') return 0
    if (dataEntryMethod === 'monthly' && monthlyExportKwh) {
      return monthlyExportKwh.reduce((sum, val) => sum + val, 0)
    }
    return parseFloat(excessKwh) || 0
  }, [inputMode, dataEntryMethod, monthlyExportKwh, excessKwh])

  // Main mining results (uses kWh-based formula with hashvalue)
  const miningResult = useMemo(() => {
    if (!hasRequiredData || annualKwh <= 0 || !effectiveHashvalue || !effectiveBtcPrice) return null

    return calculateSolarMining(
      annualKwh,
      monthlyKwh,
      miner,
      effectiveHashvalue,
      effectiveBtcPrice
    )
  }, [hasRequiredData, annualKwh, monthlyKwh, miner, effectiveHashvalue, effectiveBtcPrice])

  // Net metering comparison (for excess mode)
  const netMeteringResult = useMemo(() => {
    if (!hasRequiredData || inputMode !== 'excess' || !effectiveHashvalue || !effectiveBtcPrice) return null

    const rate = parseFloat(netMeteringRate) || 0.08

    if (annualExportKwh <= 0) return null

    return calculateNetMeteringComparison(
      annualExportKwh,
      rate,
      miner,
      effectiveHashvalue,
      effectiveBtcPrice
    )
  }, [hasRequiredData, inputMode, annualExportKwh, netMeteringRate, miner, effectiveHashvalue, effectiveBtcPrice])

  // Monthly mining revenue breakdown (for excess mode chart)
  const monthlyExcessMiningResult = useMemo(() => {
    if (!hasRequiredData || inputMode !== 'excess' || !monthlyExportKwh || !effectiveHashvalue || !effectiveBtcPrice) return null

    return calculateMonthlyExcessMining(
      monthlyExportKwh,
      miner,
      effectiveHashvalue,
      effectiveBtcPrice
    )
  }, [hasRequiredData, inputMode, monthlyExportKwh, miner, effectiveHashvalue, effectiveBtcPrice])
  // ============================================================================
  // PDF Report Data Generation
  // ============================================================================

  // PDF Report for potential mode (full mining potential)
  const pdfPotentialReportData = useMemo((): SolarMiningReportData | null => {
    if (!miningResult || inputMode === 'excess') return null

    const minerName = minerType === 'Custom'
      ? 'Custom Miner'
      : MINER_PRESETS.find(p => p.name === minerType)?.name || minerType

    const location = solarEstimate
      ? `${solarEstimate.city}, ${solarEstimate.state}`
      : zipCode || 'Not specified'

    // Determine solar input method
    const solarInputMethod = inputMode === 'estimate'
      ? {
          source: 'nrel_estimate' as const,
          description: `Estimated from ${systemSizeKw} kW system using NREL PVWatts API based on location (${location})`
        }
      : dataEntryMethod === 'monthly'
        ? {
            source: 'manual_monthly' as const,
            description: 'User-provided monthly production breakdown (Jan-Dec)'
          }
        : {
            source: 'manual_annual' as const,
            description: 'User-provided annual production estimate'
          }

    // Build input categories with all Bitcoin network data
    const inputs: PdfInputCategory[] = [
      {
        title: 'Bitcoin Network',
        items: [
          { label: 'BTC Price', value: `$${effectiveBtcPrice?.toLocaleString() || 'N/A'}` },
          { label: 'Hashvalue', value: `${networkMetrics?.hashvalue.toFixed(0) || 'N/A'} sats/TH/d` },
          { label: 'Fee %', value: `${effectiveFeePercent}%` },
          { label: 'Hashprice', value: `$${effectiveHashprice?.toFixed(4) || 'N/A'}/TH/d` },
          { label: 'Network Hashrate', value: `${((effectiveNetworkHashrate || 0) / 1e6).toFixed(0)} EH/s` },
        ],
      },
      {
        title: 'Solar System',
        items: [
          { label: 'Location', value: location },
          { label: 'System Size', value: `${systemSizeKw} kW` },
          { label: 'Annual Production', value: `${Math.round(annualKwh).toLocaleString()} kWh` },
          { label: 'Monthly Average', value: `${Math.round(annualKwh / 12).toLocaleString()} kWh` },
          { label: 'Data Source', value: solarInputMethod.source === 'nrel_estimate' ? 'NREL PVWatts Estimate' : solarInputMethod.source === 'manual_monthly' ? 'Manual (Monthly)' : 'Manual (Annual)' },
        ],
      },
      {
        title: 'Mining Setup',
        items: [
          { label: 'Miner Model', value: minerName },
          { label: 'Miner Specs', value: `${miner.hashrateTH.toFixed(1)} TH/s @ ${miner.powerW}W` },
          { label: 'Efficiency', value: `${(miner.powerW / miner.hashrateTH).toFixed(1)} J/TH` },
        ],
      },
    ]

    const annualSats = Math.round(miningResult.annualBtc * 1e8)
    const monthlyAvgSats = Math.round(annualSats / 12)

    // Build results
    const results: PdfResultItem[] = [
      {
        label: 'Annual BTC Earnings',
        value: formatBtc(miningResult.annualBtc),
        explanation: 'Total bitcoin mined annually using your solar power. This projection assumes current network conditions remain constant. Actual earnings will vary as network difficulty adjusts approximately every 2 weeks.',
        subValue: `${annualSats.toLocaleString()} sats`,
      },
      {
        label: 'Annual Revenue (USD)',
        value: formatUsd(miningResult.annualUsd),
        explanation: 'Dollar value of mined bitcoin at today\'s price. Actual USD value depends on market conditions when you sell.',
      },
      {
        label: 'Monthly Average',
        value: formatUsd(miningResult.monthlyUsd),
        explanation: 'Average monthly revenue. Actual monthly earnings vary with seasonal solar production—summer months typically produce 40-60% more than winter.',
        subValue: `${monthlyAvgSats.toLocaleString()} sats`,
      },
      {
        label: 'Revenue per kWh',
        value: `$${miningResult.effectiveRevenuePerKwh.toFixed(3)}`,
        explanation: 'Effective value per kWh of solar electricity via mining. Compare to net metering rates to evaluate best monetization strategy.',
        subValue: `${miningResult.btcPerKwh.toFixed(0)} sats/kWh`,
      },
    ]

    // Monthly dual-axis chart data
    const monthlyChart = {
      title: 'Monthly Revenue & Solar Generation',
      bars: miningResult.monthlyUsdBreakdown.map((usd, i) => ({
        label: getMonthName(i),
        value: usd,
        valueSats: Math.round(miningResult.monthlyBtcBreakdown[i] * 1e8),
      })),
      lineData: miningResult.monthlyProductionKwh,
      barLabel: 'Mining Revenue',
      barUnit: '$',
      lineLabel: 'Solar Generation',
      lineUnit: 'kWh',
      caption: 'Revenue varies with seasonal solar production. Analysis assumes constant BTC price and network conditions.',
    }

    return {
      mode: 'potential',
      generatedDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      location,
      keyMetrics: {
        annualBtc: formatBtc(miningResult.annualBtc),
        annualSats: `${annualSats.toLocaleString()} sats`,
        monthlyAvgSats: `${monthlyAvgSats.toLocaleString()} sats/mo`,
        annualRevenue: formatUsd(miningResult.annualUsd),
        annualProductionKwh: `${Math.round(annualKwh).toLocaleString()} kWh`,
        monthlyAvgProductionKwh: `${Math.round(annualKwh / 12).toLocaleString()} kWh/mo`,
      },
      summaryText: `Your ${Math.round(annualKwh).toLocaleString()} kWh solar system could mine ${formatBtc(miningResult.annualBtc)} (${formatUsd(miningResult.annualUsd)}) annually at current network conditions.`,
      solarInputMethod,
      analysisType: {
        type: 'total_potential',
      },
      inputs,
      results,
      monthlyChart,
    }
  }, [miningResult, inputMode, minerType, solarEstimate, zipCode, effectiveBtcPrice, effectiveHashprice, effectiveNetworkHashrate, systemSizeKw, annualKwh, miner, dataEntryMethod, networkMetrics, effectiveFeePercent])

  // PDF Report for comparison mode (mining vs net metering)
  const pdfComparisonReportData = useMemo((): SolarMiningReportData | null => {
    if (!netMeteringResult || inputMode !== 'excess') return null

    const minerName = minerType === 'Custom'
      ? 'Custom Miner'
      : MINER_PRESETS.find(p => p.name === minerType)?.name || minerType

    const location = solarEstimate
      ? `${solarEstimate.city}, ${solarEstimate.state}`
      : zipCode || 'Not specified'

    const compType = COMPENSATION_TYPES[compensationType]

    // Determine solar input method for excess mode
    const solarInputMethod = dataEntryMethod === 'monthly'
      ? {
          source: 'manual_monthly' as const,
          description: 'User-provided monthly excess energy breakdown (Jan-Dec)'
        }
      : {
          source: 'manual_annual' as const,
          description: 'User-provided annual excess energy estimate'
        }

    const annualSats = Math.round(netMeteringResult.miningBtc * 1e8)
    const monthlyAvgSats = Math.round(annualSats / 12)

    // Build input categories with all Bitcoin network data
    const inputs: PdfInputCategory[] = [
      {
        title: 'Bitcoin Network',
        items: [
          { label: 'BTC Price', value: `$${effectiveBtcPrice?.toLocaleString() || 'N/A'}` },
          { label: 'Hashvalue', value: `${networkMetrics?.hashvalue.toFixed(0) || 'N/A'} sats/TH/d` },
          { label: 'Fee %', value: `${effectiveFeePercent}%` },
          { label: 'Hashprice', value: `$${effectiveHashprice?.toFixed(4) || 'N/A'}/TH/d` },
          { label: 'Network Hashrate', value: `${((effectiveNetworkHashrate || 0) / 1e6).toFixed(0)} EH/s` },
        ],
      },
      {
        title: 'Excess Solar Energy',
        items: [
          { label: 'Location', value: location },
          { label: 'Annual Excess', value: `${annualExportKwh.toLocaleString()} kWh` },
          { label: 'Monthly Average', value: `${Math.round(annualExportKwh / 12).toLocaleString()} kWh` },
          { label: 'Data Entry', value: dataEntryMethod === 'monthly' ? 'Monthly Breakdown' : 'Annual Estimate' },
        ],
      },
      {
        title: 'Utility Compensation',
        items: [
          { label: 'Type', value: compType.label },
          { label: 'Rate', value: `$${netMeteringRate}/kWh` },
          { label: 'Description', value: compType.shortDesc },
        ],
      },
      {
        title: 'Mining Setup',
        items: [
          { label: 'Miner Model', value: minerName },
          { label: 'Miner Specs', value: `${minerHashrate} TH/s @ ${minerPower}W` },
          { label: 'Efficiency', value: `${(parseFloat(minerPower) / parseFloat(minerHashrate)).toFixed(1)} J/TH` },
        ],
      },
    ]

    // Build results
    const results: PdfResultItem[] = [
      {
        label: `${compType.label} Value`,
        value: formatUsd(netMeteringResult.netMeteringRevenue),
        explanation: `Annual value of excess solar at $${netMeteringRate}/kWh via ${compType.label.toLowerCase()}. This is your baseline utility compensation.`,
      },
      {
        label: 'Mining Revenue',
        value: formatUsd(netMeteringResult.miningRevenue),
        explanation: 'Annual mining revenue from excess solar at current BTC price and network conditions.',
        subValue: `${formatBtc(netMeteringResult.miningBtc)} (${annualSats.toLocaleString()} sats)`,
      },
      {
        label: netMeteringResult.recommendMining ? 'Mining Advantage' : 'Net Metering Advantage',
        value: `${netMeteringResult.recommendMining ? '+' : '-'}${formatUsd(Math.abs(netMeteringResult.advantageUsd))}`,
        explanation: netMeteringResult.recommendMining
          ? 'Additional revenue from mining vs utility compensation. This advantage varies with market conditions.'
          : 'Additional value from utility compensation vs mining at current conditions.',
      },
      {
        label: 'Multiplier',
        value: `${netMeteringResult.advantageMultiplier.toFixed(1)}x`,
        explanation: netMeteringResult.recommendMining
          ? `Mining earns ${netMeteringResult.advantageMultiplier.toFixed(1)}x more than ${compType.label.toLowerCase()}.`
          : `${compType.label} earns ${(1 / netMeteringResult.advantageMultiplier).toFixed(1)}x more than mining.`,
      },
      {
        label: 'Mining $/kWh',
        value: `$${(netMeteringResult.miningRevenue / netMeteringResult.excessKwh).toFixed(3)}`,
        explanation: `Effective mining value per kWh. Compare to your ${compType.label.toLowerCase()} rate of $${netMeteringRate}/kWh.`,
      },
    ]

    // Monthly dual-axis chart data (if monthly breakdown available)
    const monthlyChart = monthlyExcessMiningResult && monthlyExportKwh ? {
      title: 'Monthly Mining Revenue & Excess Generation',
      bars: monthlyExcessMiningResult.monthlyUsd.map((usd, i) => ({
        label: getMonthName(i),
        value: usd,
        valueSats: Math.round(monthlyExcessMiningResult.monthlyBtc[i] * 1e8),
      })),
      lineData: monthlyExportKwh,
      barLabel: 'Mining Revenue',
      barUnit: '$',
      lineLabel: 'Excess Energy',
      lineUnit: 'kWh',
      caption: 'Monthly mining revenue from excess solar. Analysis assumes constant BTC price and network conditions.',
    } : undefined

    return {
      mode: 'comparison',
      generatedDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      location,
      keyMetrics: {
        annualBtc: formatBtc(netMeteringResult.miningBtc),
        annualSats: `${annualSats.toLocaleString()} sats`,
        monthlyAvgSats: `${monthlyAvgSats.toLocaleString()} sats/mo`,
        annualRevenue: formatUsd(netMeteringResult.miningRevenue),
        annualProductionKwh: `${Math.round(annualExportKwh).toLocaleString()} kWh`,
        monthlyAvgProductionKwh: `${Math.round(annualExportKwh / 12).toLocaleString()} kWh/mo`,
      },
      summaryText: netMeteringResult.recommendMining
        ? `Mining excess solar earns ${formatUsd(netMeteringResult.advantageUsd)}/year more than ${compType.label.toLowerCase()}.`
        : `${compType.label} provides ${formatUsd(Math.abs(netMeteringResult.advantageUsd))}/year more than mining.`,
      solarInputMethod,
      analysisType: {
        type: 'excess_comparison',
        compensationType: compType.label,
        compensationRate: `$${netMeteringRate}/kWh`,
      },
      inputs,
      results,
      monthlyChart,
      comparison: {
        netMeteringValue: netMeteringResult.netMeteringRevenue,
        miningRevenue: netMeteringResult.miningRevenue,
        advantage: netMeteringResult.advantageUsd,
        advantageMultiplier: netMeteringResult.advantageMultiplier,
        recommendMining: netMeteringResult.recommendMining,
        compensationType: compType.label,
      },
    }
  }, [netMeteringResult, inputMode, minerType, solarEstimate, zipCode, effectiveBtcPrice, effectiveHashprice, effectiveNetworkHashrate, annualExportKwh, compensationType, netMeteringRate, minerPower, minerHashrate, dataEntryMethod, networkMetrics, effectiveFeePercent, monthlyExcessMiningResult, monthlyExportKwh])

  // ============================================================================
  // Render
  // ============================================================================

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Solar Bitcoin Mining Calculator',
    applicationCategory: 'FinanceApplication',
    description: 'Calculate bitcoin mining revenue from your solar PV system. Compare mining profitability vs traditional net metering compensation.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'Estimate mining revenue from solar production',
      'Compare mining vs net metering returns',
      'Location-based solar production estimates',
      'Real-time Bitcoin network data',
      'Customizable miner specifications',
    ],
  }

  return (
    <div className="space-y-6">
      <SEO
        title="Solar Bitcoin Mining Calculator"
        description="Calculate bitcoin mining revenue from your solar PV system. Compare mining profitability vs traditional net metering with real-time BTC network data and location-specific solar estimates."
        keywords="solar bitcoin mining, net metering calculator, solar mining profitability, bitcoin mining revenue, solar monetization, PV mining calculator"
        canonical="/solar"
        structuredData={structuredData}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-100">Solar Monetization</h1>
          <p className="text-sm sm:text-base text-surface-600 dark:text-surface-400 mt-1">
            Estimate bitcoin mining revenue from your solar PV system
          </p>
        </div>
        <a
          href="https://docs.exergyheat.com/calculators/solar-monetization.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors self-start"
        >
          <BookOpen className="w-4 h-4" />
          <span>Documentation</span>
        </a>
      </div>

      {/* Bitcoin Network Data Header (Three-Knob System) */}
      <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-3 sm:p-4 shadow-lg">
        {loadingBtc ? (
          <div className="flex items-center justify-center gap-2 py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
            <span className="text-sm sm:text-base text-surface-600 dark:text-surface-400">Loading Bitcoin network data...</span>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {/* Header row with title and reset button */}
            <div className="flex items-center justify-between">
              <div className="text-[10px] sm:text-xs text-surface-500 dark:text-surface-400 uppercase tracking-wide font-medium">
                Bitcoin Network Data
                {!hasOverrides && <span className="ml-1 sm:ml-2 text-green-600 dark:text-green-400 font-normal">(Live)</span>}
              </div>
              {hasOverrides && (
                <button
                  onClick={() => {
                    setBtcPriceOverride('')
                    setHashvalueOverride('')
                    setHashpriceOverride('')
                    setNetworkHashrateOverride('')
                    setFeeOverride('')
                  }}
                  className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium px-1.5 sm:px-2 py-1 rounded hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="hidden xs:inline">Reset to live data</span>
                  <span className="xs:hidden">Reset</span>
                </button>
              )}
            </div>

            {/* Three-knob layout: Price group | Network group (with Fee % slider) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {/* KNOB 1: Price Group (BTC Price ↔ Hashprice) */}
              <div className="rounded-lg border border-green-200 dark:border-green-800/50 bg-green-50/30 dark:bg-green-900/10 p-2 sm:p-3">
                <div className="text-[8px] sm:text-[9px] text-green-600 dark:text-green-400 uppercase tracking-wider font-semibold mb-1.5 sm:mb-2 text-center">
                  Market Price
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {/* BTC Price - Editable */}
                  <div className={`rounded-lg p-2 sm:p-3 text-center transition-all ${
                    btcPriceOverride
                      ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-400 dark:border-green-600'
                      : 'bg-white dark:bg-surface-800 border-2 border-dashed border-green-300 dark:border-green-700 hover:border-green-400 dark:hover:border-green-500 cursor-text'
                  }`}>
                    <div className="text-[9px] sm:text-[10px] text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-0.5 sm:mb-1 flex items-center justify-center gap-1">
                      <Pencil className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${btcPriceOverride ? 'text-green-600 dark:text-green-400' : 'text-surface-400 dark:text-surface-500'}`} />
                      BTC Price
                      {hashpriceOverride && !btcPriceOverride && (
                        <span className="text-green-600 dark:text-green-400">(implied)</span>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                      <span className="text-surface-500 dark:text-surface-400 text-xs sm:text-sm font-medium">$</span>
                      <input
                        type="number"
                        value={btcPriceOverride || (hashpriceOverride ? effectiveBtcPrice?.toFixed(0) : (braiinsData?.btcPrice?.toFixed(0) ?? '')) || ''}
                        onChange={(e) => handleBtcPriceOverride(e.target.value)}
                        className={`w-16 sm:w-24 text-base sm:text-xl font-bold text-center py-0.5 sm:py-1 bg-transparent focus:outline-none ${
                          btcPriceOverride ? 'text-green-700 dark:text-green-400' : 'text-surface-900 dark:text-surface-100'
                        }`}
                        placeholder={braiinsData?.btcPrice?.toLocaleString()}
                      />
                    </div>
                  </div>

                  {/* Hashprice - Editable */}
                  <div className={`rounded-lg p-2 sm:p-3 text-center transition-all ${
                    hashpriceOverride
                      ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-400 dark:border-green-600'
                      : 'bg-white dark:bg-surface-800 border-2 border-dashed border-green-300 dark:border-green-700 hover:border-green-400 dark:hover:border-green-500 cursor-text'
                  }`}>
                    <div className="text-[9px] sm:text-[10px] text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-0.5 sm:mb-1 flex items-center justify-center gap-1">
                      <Pencil className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${hashpriceOverride ? 'text-green-600 dark:text-green-400' : 'text-surface-400 dark:text-surface-500'}`} />
                      Hashprice
                      {(btcPriceOverride || hashvalueOverride || networkHashrateOverride) && !hashpriceOverride && (
                        <span className="text-green-600 dark:text-green-400">(implied)</span>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                      <span className="text-surface-500 dark:text-surface-400 text-xs sm:text-sm">$</span>
                      <input
                        type="number"
                        value={hashpriceOverride || networkMetrics?.hashprice.toFixed(4) || ''}
                        onChange={(e) => handleHashpriceOverride(e.target.value)}
                        step="0.0001"
                        className={`w-14 sm:w-20 text-base sm:text-xl font-bold text-center py-0.5 sm:py-1 bg-transparent focus:outline-none ${
                          hashpriceOverride ? 'text-green-700 dark:text-green-400' : 'text-green-600 dark:text-green-400'
                        }`}
                        placeholder={networkMetrics?.hashprice.toFixed(4)}
                      />
                      <span className="text-[9px] sm:text-xs text-surface-500 dark:text-surface-400">/TH/d</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* KNOB 2: Network Group (Fee % anchor, Hashvalue ↔ Network Hashrate) */}
              <div className="rounded-lg border border-orange-200 dark:border-orange-800/50 bg-orange-50/30 dark:bg-orange-900/10 p-2 sm:p-3">
                <div className="text-[8px] sm:text-[9px] text-orange-600 dark:text-orange-400 uppercase tracking-wider font-semibold mb-1.5 sm:mb-2 text-center">
                  Mining Network
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {/* Fee % - Slider + Input (ANCHOR - never implied) */}
                  <div className={`rounded-lg p-2 sm:p-3 text-center transition-all ${
                    feeOverride !== ''
                      ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-400 dark:border-orange-600'
                      : 'bg-white dark:bg-surface-800 border-2 border-dashed border-orange-300 dark:border-orange-700 hover:border-orange-400 dark:hover:border-orange-500'
                  }`}>
                    <div className="text-[9px] sm:text-[10px] text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-0.5 sm:mb-1 flex items-center justify-center gap-1">
                      <Pencil className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${feeOverride !== '' ? 'text-orange-600 dark:text-orange-400' : 'text-surface-400 dark:text-surface-500'}`} />
                      Fee %
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <input
                        type="range"
                        min="0"
                        max="99"
                        step="1"
                        value={feeOverride !== '' ? parseInt(feeOverride) : effectiveFeePercent}
                        onChange={(e) => handleFeeOverride(e.target.value)}
                        className="w-full h-1.5 sm:h-2 bg-orange-200 dark:bg-orange-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                      <div className="flex items-center gap-0.5">
                        <input
                          type="number"
                          min="0"
                          max="99"
                          value={feeOverride !== '' ? feeOverride : effectiveFeePercent}
                          onChange={(e) => handleFeeOverride(e.target.value)}
                          className={`w-10 sm:w-12 text-base sm:text-xl font-bold text-center py-0.5 bg-transparent focus:outline-none ${
                            feeOverride !== '' ? 'text-orange-700 dark:text-orange-400' : 'text-orange-600 dark:text-orange-400'
                          }`}
                        />
                        <span className="text-[9px] sm:text-xs text-surface-500 dark:text-surface-400">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Hashvalue - Editable */}
                  <div className={`rounded-lg p-2 sm:p-3 text-center transition-all ${
                    hashvalueOverride
                      ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-400 dark:border-orange-600'
                      : 'bg-white dark:bg-surface-800 border-2 border-dashed border-orange-300 dark:border-orange-700 hover:border-orange-400 dark:hover:border-orange-500 cursor-text'
                  }`}>
                    <div className="text-[9px] sm:text-[10px] text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-0.5 sm:mb-1 flex items-center justify-center gap-1">
                      <Pencil className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${hashvalueOverride ? 'text-orange-600 dark:text-orange-400' : 'text-surface-400 dark:text-surface-500'}`} />
                      Hashvalue
                      {(networkHashrateOverride || feeOverride !== '') && !hashvalueOverride && (
                        <span className="text-orange-600 dark:text-orange-400">(implied)</span>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                      <input
                        type="number"
                        value={hashvalueOverride || networkMetrics?.hashvalue.toFixed(2) || ''}
                        onChange={(e) => handleHashvalueOverride(e.target.value)}
                        step="0.01"
                        className={`w-12 sm:w-16 text-base sm:text-xl font-bold text-center py-0.5 sm:py-1 bg-transparent focus:outline-none ${
                          hashvalueOverride ? 'text-orange-700 dark:text-orange-400' : 'text-orange-600 dark:text-orange-400'
                        }`}
                        placeholder={networkMetrics?.hashvalue.toFixed(2)}
                      />
                      <span className="text-[9px] sm:text-xs text-surface-500 dark:text-surface-400">sats/TH/d</span>
                    </div>
                  </div>

                  {/* Network Hashrate - Editable */}
                  <div className={`rounded-lg p-2 sm:p-3 text-center transition-all ${
                    networkHashrateOverride
                      ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-400 dark:border-orange-600'
                      : 'bg-white dark:bg-surface-800 border-2 border-dashed border-orange-300 dark:border-orange-700 hover:border-orange-400 dark:hover:border-orange-500 cursor-text'
                  }`}>
                    <div className="text-[9px] sm:text-[10px] text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-0.5 sm:mb-1 flex items-center justify-center gap-1">
                      <Pencil className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${networkHashrateOverride ? 'text-orange-600 dark:text-orange-400' : 'text-surface-400 dark:text-surface-500'}`} />
                      Network
                      {hashvalueOverride && !networkHashrateOverride && (
                        <span className="text-orange-600 dark:text-orange-400">(implied)</span>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                      <input
                        type="number"
                        value={networkHashrateOverride || networkMetrics?.networkHashrateEH.toFixed(0) || ''}
                        onChange={(e) => handleNetworkHashrateOverride(e.target.value)}
                        className={`w-12 sm:w-16 text-base sm:text-xl font-bold text-center py-0.5 sm:py-1 bg-transparent focus:outline-none ${
                          networkHashrateOverride ? 'text-orange-700 dark:text-orange-400' : 'text-surface-700 dark:text-surface-200'
                        }`}
                        placeholder={networkMetrics?.networkHashrateEH.toFixed(0)}
                      />
                      <span className="text-[9px] sm:text-xs text-surface-500 dark:text-surface-400">EH/s</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Section */}
      <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 p-4 sm:p-6 shadow-lg">
        {/* Mode Selector - Visually distinct groups */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">
            What do you want to calculate?
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Group 1: Total Solar Mining Potential */}
            <div className={`rounded-xl border-2 p-4 transition-all ${
              inputMode === 'estimate' || inputMode === 'production'
                ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20'
                : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Sun className="w-5 h-5 text-primary-500" />
                <h4 className="font-medium text-surface-900 dark:text-surface-100">Total Solar Mining Potential</h4>
              </div>
              <p className="text-sm text-surface-600 dark:text-surface-400 mb-3">
                How much BTC could I mine if all my solar production went to mining?
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setInputMode('estimate')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    inputMode === 'estimate'
                      ? 'bg-primary-500 text-white'
                      : 'bg-white dark:bg-surface-700 text-surface-700 dark:text-surface-300 border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-600'
                  }`}
                >
                  Estimate from system size
                </button>
                <button
                  onClick={() => setInputMode('production')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    inputMode === 'production'
                      ? 'bg-primary-500 text-white'
                      : 'bg-white dark:bg-surface-700 text-surface-700 dark:text-surface-300 border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-600'
                  }`}
                >
                  Use my actual production
                </button>
              </div>
            </div>

            {/* Group 2: Excess Energy Comparison */}
            <div className={`rounded-xl border-2 p-4 transition-all ${
              inputMode === 'excess'
                ? 'border-green-500 bg-green-50/50 dark:bg-green-900/20'
                : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-green-500" />
                <h4 className="font-medium text-surface-900 dark:text-surface-100">Excess Energy Comparison</h4>
              </div>
              <p className="text-sm text-surface-600 dark:text-surface-400 mb-3">
                Is mining my excess solar worth more than selling it back to the grid?
              </p>
              <button
                onClick={() => setInputMode('excess')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  inputMode === 'excess'
                    ? 'bg-green-500 text-white'
                    : 'bg-white dark:bg-surface-700 text-surface-700 dark:text-surface-300 border border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-600'
                }`}
              >
                Compare mining vs net metering
              </button>
            </div>
          </div>
        </div>

        {/* Data Entry Method Toggle (only for production mode - has annual/monthly production) */}
        {inputMode === 'production' && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                Production Data Entry
              </label>
              <SmartTooltip content="Monthly data provides more accurate calculations. Check your utility's online portal for historical monthly breakdowns." />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDataEntryMethod('annual')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dataEntryMethod === 'annual'
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600'
                }`}
              >
                Annual Total
              </button>
              <button
                onClick={() => setDataEntryMethod('monthly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  dataEntryMethod === 'monthly'
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600'
                }`}
              >
                Monthly Breakdown
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  dataEntryMethod === 'monthly'
                    ? 'bg-white/20'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                }`}>
                  More Accurate
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Data Entry Method Toggle (only for excess mode - has annual/monthly export) */}
        {inputMode === 'excess' && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                Export Data Entry
              </label>
              <SmartTooltip content="Monthly data provides more accurate calculations. Check your utility's online portal for historical monthly breakdowns." />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDataEntryMethod('annual')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dataEntryMethod === 'annual'
                    ? 'bg-green-500 text-white'
                    : 'bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600'
                }`}
              >
                Annual Total
              </button>
              <button
                onClick={() => setDataEntryMethod('monthly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  dataEntryMethod === 'monthly'
                    ? 'bg-green-500 text-white'
                    : 'bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600'
                }`}
              >
                Monthly Breakdown
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  dataEntryMethod === 'monthly'
                    ? 'bg-white/20'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                }`}>
                  More Accurate
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Input Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Zip Code */}
          <InputField
            label="Zip Code"
            type="text"
            value={zipCode}
            onChange={setZipCode}
            placeholder="e.g., 85001"
            helpText={solarEstimate ? `${solarEstimate.city}, ${solarEstimate.state}` : undefined}
            tooltip="US zip code for your installation. We use NREL PVWatts solar data for your location to estimate production."
          />

          {/* System Size */}
          <InputField
            label="System Size"
            type="number"
            value={systemSizeKw}
            onChange={setSystemSizeKw}
            suffix="kW"
            helpText={`${(parseFloat(systemSizeKw) || 0) * 1000}W peak`}
            tooltip="Peak DC capacity in kW. Find this on your solar panel installation paperwork or inverter specs. Typical residential systems are 5-10 kW."
          />

          {/* Annual Production (only for production mode with annual entry) */}
          {inputMode === 'production' && dataEntryMethod === 'annual' && (
            <div className="relative">
              <div className="flex items-center gap-1 mb-1">
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  Annual Production
                </label>
                <SmartTooltip content="Total kWh generated in one year. Find this on your solar monitoring app (Enphase, SolarEdge, etc.) or utility bill under 'Solar Generation' or 'Customer Generation'." />
              </div>
              <InputField
                label=""
                type="number"
                value={annualProductionKwh}
                onChange={setAnnualProductionKwh}
                suffix="kWh"
                placeholder="e.g., 14000"
              />
            </div>
          )}

          {/* Annual Grid Export (only for excess mode with annual entry) */}
          {inputMode === 'excess' && dataEntryMethod === 'annual' && (
            <div className="relative">
              <div className="flex items-center gap-1 mb-1">
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  Annual Grid Export
                </label>
                <SmartTooltip content="Total kWh sent to grid annually. Look for 'Energy Delivered to Grid', 'Net Export', or 'Excess Generation' on your utility bill. Some bills show this as negative kWh." />
              </div>
              <InputField
                label=""
                type="number"
                value={excessKwh}
                onChange={setExcessKwh}
                suffix="kWh"
                placeholder="e.g., 5000"
              />
            </div>
          )}

        </div>

        {/* Compensation Type Quick Select (only for excess mode) */}
        {inputMode === 'excess' && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                How does your utility compensate for excess solar?
              </label>
            </div>

            {/* Quick Select Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(Object.entries(COMPENSATION_TYPES) as [CompensationType, typeof COMPENSATION_TYPES.credits][]).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => handleCompensationTypeChange(type)}
                  className={`flex flex-col items-center px-4 py-2.5 rounded-lg text-sm transition-colors ${
                    compensationType === type
                      ? 'bg-green-500 text-white'
                      : 'bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{config.icon}</span>
                    <span className="font-medium">{config.label}</span>
                    <SmartTooltip content={config.tooltip} />
                  </div>
                  <span className={`text-xs mt-0.5 ${compensationType === type ? 'text-white/80' : 'text-surface-500'}`}>
                    {config.shortDesc}
                  </span>
                </button>
              ))}
            </div>

            {/* Rate Input (always visible and editable) */}
            <div className="max-w-xs">
              <div className="flex items-center gap-1 mb-1">
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  Your Rate
                </label>
                <SmartTooltip content="Your actual export compensation rate. Find this on your utility bill under 'Export Credit Rate', 'Net Metering Rate', or 'Avoided Cost'. Contact your utility if you're unsure of your exact rate." />
              </div>
              <InputField
                label=""
                type="number"
                value={netMeteringRate}
                onChange={setNetMeteringRate}
                prefix="$"
                suffix="/kWh"
              />
            </div>
          </div>
        )}

        {/* Monthly Production Grid (only for production mode with monthly entry) */}
        {inputMode === 'production' && dataEntryMethod === 'monthly' && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300">
                Production by Month (kWh)
              </h4>
              <SmartTooltip content="Monthly generation in kWh. Find this on your solar monitoring app (Enphase, SolarEdge, etc.) or utility bill under 'Solar Generation' or 'Customer Generation'." />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {monthlyProductionInputs.map((value, index) => (
                <div key={index} className="relative">
                  <label className="block text-xs text-surface-500 dark:text-surface-400 mb-1">
                    {getMonthName(index)}
                  </label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => {
                      const newInputs = [...monthlyProductionInputs]
                      newInputs[index] = e.target.value
                      setMonthlyProductionInputs(newInputs)
                    }}
                    placeholder="0"
                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 text-sm font-medium text-surface-700 dark:text-surface-300">
              Annual Total: <span className="text-primary-600 dark:text-primary-400">{formatKwh(annualKwh)}</span>
            </div>
          </div>
        )}

        {/* Monthly Export Grid (only for excess mode with monthly entry) */}
        {inputMode === 'excess' && dataEntryMethod === 'monthly' && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300">
                Grid Export by Month (kWh)
              </h4>
              <SmartTooltip content="Look for 'Energy Delivered to Grid', 'Net Export', or 'Excess Generation' on your utility bill. Some bills show this as negative kWh." />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {monthlyExportInputs.map((value, index) => (
                <div key={index} className="relative">
                  <label className="block text-xs text-surface-500 dark:text-surface-400 mb-1">
                    {getMonthName(index)}
                  </label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => {
                      const newInputs = [...monthlyExportInputs]
                      newInputs[index] = e.target.value
                      setMonthlyExportInputs(newInputs)
                    }}
                    placeholder="0"
                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 text-sm font-medium text-surface-700 dark:text-surface-300">
              Annual Export Total: <span className="text-green-600 dark:text-green-400">{formatKwh(annualExportKwh)}</span>
            </div>
          </div>
        )}

        {/* Miner Selection */}
        <div className="mt-6 pt-6 border-t border-surface-200 dark:border-surface-700">
          <h3 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-4">
            Miner Selection
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SelectField
              label="Miner Model"
              value={minerType}
              onChange={setMinerType}
              options={[
                { value: 'Custom', label: 'Custom' },
                ...MINER_PRESETS.map(m => ({ value: m.name, label: m.name })),
              ]}
              tooltip="Choose your miner model or enter custom specs. More efficient miners (lower W/TH) earn more BTC per kWh of solar energy."
            />
            <InputField
              label="Power"
              type="number"
              value={minerPower}
              onChange={setMinerPower}
              suffix="W"
            />
            <InputField
              label="Hashrate"
              type="number"
              value={minerHashrate}
              onChange={setMinerHashrate}
              suffix="TH/s"
            />
            {/* Efficiency Display Card */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  Efficiency
                </label>
                <SmartTooltip content="Miner efficiency measured in watts per terahash. Lower is better - more efficient miners extract more BTC value per kWh of solar energy consumed." />
              </div>
              <div className="h-[42px] px-3 flex items-center justify-between rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-700/50">
                <span className="text-surface-900 dark:text-surface-100 font-medium">
                  {miner.hashrateTH > 0 ? (miner.powerW / miner.hashrateTH).toFixed(1) : '—'}
                </span>
                <span className="text-surface-500 dark:text-surface-400 text-sm">W/TH</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {solarError && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-300">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{solarError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Validation Guidance */}
      {inputMode !== 'estimate' && annualKwh === 0 && !loadingSolar && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-blue-700 dark:text-blue-300">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Tip</p>
              <p className="text-sm mt-1">For production estimates, try the 'Estimate from system size' mode instead</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Section - Mining Analysis (non-excess modes only) */}
      {miningResult && inputMode !== 'excess' && (
        <div id="solar-mining-results" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
              Total Solar Mining Potential
            </h2>
            <PdfReportButton
              reportType="solar"
              reportData={pdfPotentialReportData}
              filename="solar-mining-potential.pdf"
            />
          </div>

          {/* Main Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Solar Production / Export */}
            <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sun className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-surface-500 dark:text-surface-400">
                  Annual Production
                </span>
                <SmartTooltip content="Total solar energy available for mining. Based on your location's sun hours and system size. Higher sun hours mean more mining opportunity." />
              </div>
              <div className="text-2xl font-bold text-surface-900 dark:text-surface-100">
                {formatKwh(miningResult.annualProductionKwh)}
              </div>
              <p className="text-sm text-surface-500 mt-1">
                {miner.hashrateTH > 0 ? `${(miner.powerW / miner.hashrateTH).toFixed(1)} J/TH efficiency` : 'N/A'}
              </p>
            </div>

            {/* Annual BTC */}
            <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <Bitcoin className="w-5 h-5 text-orange-500" />
                <span className="text-sm text-surface-500 dark:text-surface-400">Annual BTC Earnings</span>
                <SmartTooltip content="Total bitcoin mined annually using your solar power. Calculated from your hashrate (based on miner efficiency) and solar production hours. Assumes static BTC price and network conditions - actual earnings depend on BTC price when you sell and network difficulty changes over time. Does not account for future volatility." />
              </div>
              <div className="text-2xl font-bold text-surface-900 dark:text-surface-100">
                {formatBtc(miningResult.annualBtc)}
              </div>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                ≈ {formatUsd(miningResult.annualUsd)}/year
              </p>
            </div>

            {/* Monthly BTC */}
            <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-primary-500" />
                <span className="text-sm text-surface-500 dark:text-surface-400">Monthly Average</span>
                <SmartTooltip content="Average monthly mining revenue. Summer months typically earn more due to longer sun hours. Remember this assumes current BTC price and network conditions throughout the year." />
              </div>
              <div className="text-2xl font-bold text-surface-900 dark:text-surface-100">
                {formatBtc(miningResult.monthlyBtc)}
              </div>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                ≈ {formatUsd(miningResult.monthlyUsd)}/month
              </p>
            </div>

            {/* Revenue per kWh */}
            <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                <span className="text-sm text-surface-500 dark:text-surface-400">Revenue per kWh</span>
                <SmartTooltip content="How much value you extract from each kWh of solar power via mining. Compare this to your utility's net metering rate to see relative value. Higher miner efficiency = higher revenue per kWh." />
              </div>
              <div className="text-2xl font-bold text-surface-900 dark:text-surface-100">
                ${miningResult.effectiveRevenuePerKwh.toFixed(3)}
              </div>
              <p className="text-sm text-surface-500 mt-1">
                {miningResult.btcPerKwh.toFixed(0)} sats/kWh
              </p>
            </div>
          </div>

          {/* Monthly Breakdown Chart */}
          <div className="bg-white dark:bg-surface-800 rounded-xl p-4 sm:p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-4">
              Monthly Revenue & Generation
            </h3>
            <DualAxisChart
              revenueData={miningResult.monthlyUsdBreakdown}
              revenueDataSats={miningResult.monthlyBtcBreakdown.map(btc => btc * 1e8)}
              generationData={miningResult.monthlyProductionKwh}
              monthLabels={Array.from({ length: 12 }, (_, i) => getMonthName(i))}
            />
          </div>
        </div>
      )}

      {/* Results Section - Net Metering Comparison (Excess mode only) */}
      {netMeteringResult && inputMode === 'excess' && (
        <div id="solar-comparison-results" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
              Mining vs Net Metering Comparison
            </h2>
            <PdfReportButton
              reportType="solar"
              reportData={pdfComparisonReportData}
              filename="solar-net-metering-comparison.pdf"
            />
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 shadow-lg border border-green-200 dark:border-green-800">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-surface-500 dark:text-surface-400 mb-1">
                  {compensationType === 'credits' ? 'Bill Credit Value' :
                   compensationType === 'cashOut' ? 'Cash-Out Value' :
                   'Net Billing Value'}
                </div>
                <div className="text-2xl font-bold text-surface-700 dark:text-surface-300">
                  {formatUsd(netMeteringResult.netMeteringRevenue)}/year
                </div>
                <p className="text-sm text-surface-500 mt-1">
                  {formatKwh(netMeteringResult.excessKwh)} × ${netMeteringResult.netMeteringRate}/kWh
                </p>
              </div>
              <div>
                <div className="text-sm text-surface-500 dark:text-surface-400 mb-1">Mining Revenue</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatUsd(netMeteringResult.miningRevenue)}/year
                </div>
                <p className="text-sm text-surface-500 mt-1">
                  {formatBtc(netMeteringResult.miningBtc)} BTC from excess energy
                </p>
              </div>
              <div>
                <div className="text-sm text-surface-500 dark:text-surface-400 mb-1">
                  {netMeteringResult.recommendMining ? 'Mining Advantage' : 'Net Metering Advantage'}
                </div>
                <div className={`text-2xl font-bold ${
                  netMeteringResult.recommendMining
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {netMeteringResult.recommendMining ? '+' : '-'}{formatUsd(Math.abs(netMeteringResult.advantageUsd))}/year
                </div>
                <p className="text-sm text-surface-500 mt-1">
                  {netMeteringResult.advantageMultiplier.toFixed(1)}x {netMeteringResult.recommendMining ? 'more' : 'less'} than net metering
                </p>
              </div>
            </div>

            {netMeteringResult.recommendMining ? (
              <div className="mt-4 p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>Recommendation:</strong> Mining your excess solar energy could earn you{' '}
                  <strong>{formatUsd(netMeteringResult.advantageUsd)}</strong> more per year than selling to the grid!
                </p>
              </div>
            ) : (
              <div className="mt-4 p-4 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Analysis:</strong> At current BTC prices and network conditions, net metering provides better returns than mining your excess energy.
                </p>
              </div>
            )}
          </div>

          {/* Monthly Breakdown Chart (Excess Mode) */}
          {monthlyExcessMiningResult && monthlyExportKwh && (
            <div className="bg-white dark:bg-surface-800 rounded-xl p-4 sm:p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-4">
                Monthly Revenue & Generation
              </h3>
              <DualAxisChart
                revenueData={monthlyExcessMiningResult.monthlyUsd}
                revenueDataSats={monthlyExcessMiningResult.monthlyBtc.map(btc => btc * 1e8)}
                generationData={monthlyExportKwh}
                monthLabels={Array.from({ length: 12 }, (_, i) => getMonthName(i))}
              />
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loadingSolar && (
        <div className="flex items-center justify-center gap-2 text-surface-500 py-8">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Fetching solar data for {zipCode}...</span>
        </div>
      )}
    </div>
  )
}
