import { useState, useMemo, useEffect } from 'react'
import { Sun, Zap, Loader2, TrendingUp, DollarSign, Bolt, BookOpen, Bitcoin, Pencil, RefreshCw } from 'lucide-react'

import InputField from '../components/InputField'
import SelectField from '../components/SelectField'
import SmartTooltip from '../components/SmartTooltip'

import {
  calculateSolarMining,
  calculateNetMeteringComparison,
  calculateMaxMiners,
  formatBtc,
  formatUsd,
  formatKwh,
  getMonthName,
  MINER_PRESETS,
  DEFAULT_CUSTOM_MINER,
  MinerSpec,
  BTCMetrics,
} from '../calculations/solar'

import { getSolarEstimate, SolarEstimate } from '../api/solar'
import { getBraiinsData, BraiinsMetrics } from '../api/bitcoin'

// ============================================================================
// Types
// ============================================================================

type InputMode = 'estimate' | 'production' | 'excess'

// ============================================================================
// Component
// ============================================================================

export default function SolarMonetization() {
  // ============================================================================
  // State - Bitcoin Data
  // ============================================================================
  const [braiinsData, setBraiinsData] = useState<BraiinsMetrics | null>(null)
  const [loadingBtc, setLoadingBtc] = useState(true)

  // Manual overrides for scenario exploration (Two-Knob System)
  // Knob 1 (Price): BTC Price ↔ Hashprice (editing one implies the other)
  // Knob 2 (Network): Network Hashrate ↔ Hashvalue (editing one implies the other)
  const [btcPriceOverride, setBtcPriceOverride] = useState<string>('')
  const [hashvalueOverride, setHashvalueOverride] = useState<string>('')
  const [hashpriceOverride, setHashpriceOverride] = useState<string>('')
  const [networkHashrateOverride, setNetworkHashrateOverride] = useState<string>('')

  // ============================================================================
  // State - Solar Data
  // ============================================================================
  const [solarEstimate, setSolarEstimate] = useState<SolarEstimate | null>(null)
  const [loadingSolar, setLoadingSolar] = useState(false)

  // ============================================================================
  // State - User Inputs
  // ============================================================================
  const [inputMode, setInputMode] = useState<InputMode>('estimate')
  const [zipCode, setZipCode] = useState('')
  const [systemSizeKw, setSystemSizeKw] = useState('10')
  const [annualProductionKwh, setAnnualProductionKwh] = useState('')
  const [excessKwh, setExcessKwh] = useState('')
  const [netMeteringRate, setNetMeteringRate] = useState('0.08')

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
  const [minerQuantity, setMinerQuantity] = useState('')
  const [quantityOverride, setQuantityOverride] = useState(false)

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
      if (zipCode.length < 5 || inputMode !== 'estimate') return

      setLoadingSolar(true)
      try {
        const systemKw = parseFloat(systemSizeKw) || 10
        const estimate = await getSolarEstimate(zipCode, systemKw)
        setSolarEstimate(estimate)
      } catch (error) {
        console.error('Error fetching solar estimate:', error)
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
  // Override Handlers (Two-Knob System)
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

  // Network group handlers (Knob 2)
  const handleHashvalueOverride = (value: string) => {
    setHashvalueOverride(value)
    setNetworkHashrateOverride('')  // Clear other in same group
  }

  const handleNetworkHashrateOverride = (value: string) => {
    setNetworkHashrateOverride(value)
    setHashvalueOverride('')  // Clear other in same group
  }

  // Check if user has any overrides active
  const hasOverrides = btcPriceOverride !== '' || hashvalueOverride !== '' ||
                       hashpriceOverride !== '' || networkHashrateOverride !== ''

  // ============================================================================
  // Two-Knob Calculation Model
  // ============================================================================
  // Knob 1 (Price): BTC Price ↔ Hashprice
  //   - hashprice = hashvalue × btcPrice / 1e8
  //   - btcPrice = hashprice × 1e8 / hashvalue
  //
  // Knob 2 (Network): Network Hashrate ↔ Hashvalue
  //   - hashvalue = (144 × 3.125 × 1e8) / networkHashrate
  //   - networkHashrate = (144 × 3.125 × 1e8) / hashvalue
  // ============================================================================

  // KNOB 2: Calculate effective network hashrate (Network group)
  const effectiveNetworkHashrate = useMemo(() => {
    if (networkHashrateOverride) {
      const nh = parseFloat(networkHashrateOverride)
      if (nh > 0) return nh * 1e6 // Convert EH/s to TH/s
    }
    if (hashvalueOverride) {
      const hv = parseFloat(hashvalueOverride)
      if (hv > 0) {
        // Back-calculate: networkHashrate = (144 × 3.125 × 1e8) / hashvalue
        return (144 * 3.125 * 1e8) / hv
      }
    }
    return braiinsData?.networkHashrate ?? null
  }, [networkHashrateOverride, hashvalueOverride, braiinsData])

  // Calculate effective hashvalue (derived from network hashrate or Braiins API)
  const effectiveHashvalue = useMemo(() => {
    if (hashvalueOverride) {
      const hv = parseFloat(hashvalueOverride)
      if (hv > 0) return hv
    }
    // If networkHashrate is overridden, recalculate hashvalue for consistency
    if (networkHashrateOverride) {
      const nh = parseFloat(networkHashrateOverride)
      if (nh > 0) return (144 * 3.125 * 1e8) / (nh * 1e6)
    }
    // Use Braiins hashvalue directly (includes fees, more accurate)
    if (braiinsData?.hashvalue) {
      return braiinsData.hashvalue * 1e8
    }
    // Fallback: calculate from network hashrate
    if (effectiveNetworkHashrate && effectiveNetworkHashrate > 0) {
      return (144 * 3.125 * 1e8) / effectiveNetworkHashrate
    }
    return null
  }, [hashvalueOverride, networkHashrateOverride, braiinsData, effectiveNetworkHashrate])

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

  // Calculate effective hashprice
  const effectiveHashprice = useMemo(() => {
    if (hashpriceOverride) {
      const hp = parseFloat(hashpriceOverride)
      if (hp > 0) return hp
    }
    // If btcPrice is overridden, recalculate hashprice for consistency
    if (btcPriceOverride && effectiveHashvalue) {
      const bp = parseFloat(btcPriceOverride)
      if (bp > 0) return (effectiveHashvalue * bp) / 1e8
    }
    // Use Braiins hashprice directly
    if (braiinsData?.hashprice) {
      return braiinsData.hashprice
    }
    // Fallback: calculate from btcPrice and hashvalue
    if (effectiveBtcPrice && effectiveHashvalue) {
      return (effectiveHashvalue * effectiveBtcPrice) / 1e8
    }
    return null
  }, [hashpriceOverride, btcPriceOverride, braiinsData, effectiveHashvalue, effectiveBtcPrice])

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

  // System size
  const systemKw = useMemo(() => parseFloat(systemSizeKw) || 10, [systemSizeKw])

  // Max miners calculation
  const maxMiners = useMemo(() =>
    calculateMaxMiners(systemKw, miner.powerW),
    [systemKw, miner.powerW]
  )

  // Actual miner quantity
  const actualQuantity = useMemo(() => {
    if (quantityOverride && minerQuantity) {
      return Math.min(parseInt(minerQuantity) || 1, maxMiners)
    }
    return maxMiners
  }, [quantityOverride, minerQuantity, maxMiners])

  // BTC metrics for calculations (uses effective values with overrides)
  const btcMetrics: BTCMetrics | null = useMemo(() => {
    if (effectiveBtcPrice === null || effectiveNetworkHashrate === null) return null
    return {
      btcPrice: effectiveBtcPrice,
      networkHashrate: effectiveNetworkHashrate,
      blockReward: 3.125,
    }
  }, [effectiveBtcPrice, effectiveNetworkHashrate])

  // Monthly production breakdown
  const monthlyKwh = useMemo(() => {
    if (inputMode === 'estimate' && solarEstimate) {
      return solarEstimate.monthlyKwh
    }

    // Monthly entry: use user's inputs directly
    if (dataEntryMethod === 'monthly') {
      return monthlyProductionInputs.map(v => parseFloat(v) || 0)
    }

    // Annual entry: distribute by location's seasonal profile
    const annual = parseFloat(annualProductionKwh) || 0
    if (solarEstimate?.monthlySunHours) {
      // Use actual sun hours ratio from location
      const totalSunHours = solarEstimate.monthlySunHours.reduce((a, b) => a + b, 0)
      if (totalSunHours > 0) {
        return solarEstimate.monthlySunHours.map(
          hours => Math.round(annual * (hours / totalSunHours))
        )
      }
    }

    // Fallback: generic seasonal factors
    const monthlyFactors = [0.060, 0.065, 0.080, 0.090, 0.100, 0.105, 0.105, 0.100, 0.090, 0.080, 0.065, 0.060]
    return monthlyFactors.map(f => Math.round(annual * f))
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

    // Annual entry: distribute by location's sun hours or generic seasonal pattern
    const annualExport = parseFloat(excessKwh) || 0
    if (annualExport === 0) return Array(12).fill(0)

    // Use sun hours for seasonal distribution (solar export correlates with sun hours)
    const sunHoursPattern = solarEstimate?.monthlySunHours || [3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.0, 5.5, 5.0, 4.5, 3.5, 3.0]
    const totalSunHours = sunHoursPattern.reduce((a, b) => a + b, 0)

    return sunHoursPattern.map(hours => Math.round(annualExport * (hours / totalSunHours)))
  }, [inputMode, dataEntryMethod, monthlyExportInputs, excessKwh, solarEstimate])

  // Annual export (from monthly sum or user input)
  const annualExportKwh = useMemo(() => {
    if (inputMode !== 'excess') return 0
    if (dataEntryMethod === 'monthly' && monthlyExportKwh) {
      return monthlyExportKwh.reduce((sum, val) => sum + val, 0)
    }
    return parseFloat(excessKwh) || 0
  }, [inputMode, dataEntryMethod, monthlyExportKwh, excessKwh])

  // Sun hours
  const sunHours = useMemo(() => {
    if (inputMode === 'estimate' && solarEstimate) {
      return solarEstimate.monthlySunHours
    }
    // Default seasonal pattern
    return [3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.0, 5.5, 5.0, 4.5, 3.5, 3.0]
  }, [inputMode, solarEstimate])

  // Average sun hours
  const avgSunHours = useMemo(() => {
    return sunHours.reduce((a, b) => a + b, 0) / 12
  }, [sunHours])

  // Main mining results
  const miningResult = useMemo(() => {
    if (!btcMetrics || annualKwh <= 0) return null

    return calculateSolarMining(
      systemKw,
      annualKwh,
      monthlyKwh,
      sunHours,
      miner,
      actualQuantity,
      btcMetrics
    )
  }, [btcMetrics, systemKw, annualKwh, monthlyKwh, sunHours, miner, actualQuantity])

  // Net metering comparison (for excess mode)
  const netMeteringResult = useMemo(() => {
    if (!btcMetrics || inputMode !== 'excess') return null

    const rate = parseFloat(netMeteringRate) || 0.08

    if (annualExportKwh <= 0) return null

    return calculateNetMeteringComparison(
      annualExportKwh,
      rate,
      miner,
      avgSunHours,
      btcMetrics
    )
  }, [btcMetrics, inputMode, annualExportKwh, netMeteringRate, miner, avgSunHours])

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
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

      {/* Bitcoin Network Data Header (Two-Knob System) */}
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
                  }}
                  className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium px-1.5 sm:px-2 py-1 rounded hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="hidden xs:inline">Reset to live data</span>
                  <span className="xs:hidden">Reset</span>
                </button>
              )}
            </div>

            {/* Two-knob layout: Price group | Network group */}
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

              {/* KNOB 2: Network Group (Hashvalue ↔ Network Hashrate) */}
              <div className="rounded-lg border border-orange-200 dark:border-orange-800/50 bg-orange-50/30 dark:bg-orange-900/10 p-2 sm:p-3">
                <div className="text-[8px] sm:text-[9px] text-orange-600 dark:text-orange-400 uppercase tracking-wider font-semibold mb-1.5 sm:mb-2 text-center">
                  Mining Network
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {/* Hashvalue - Editable */}
                  <div className={`rounded-lg p-2 sm:p-3 text-center transition-all ${
                    hashvalueOverride
                      ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-400 dark:border-orange-600'
                      : 'bg-white dark:bg-surface-800 border-2 border-dashed border-orange-300 dark:border-orange-700 hover:border-orange-400 dark:hover:border-orange-500 cursor-text'
                  }`}>
                    <div className="text-[9px] sm:text-[10px] text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-0.5 sm:mb-1 flex items-center justify-center gap-1">
                      <Pencil className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${hashvalueOverride ? 'text-orange-600 dark:text-orange-400' : 'text-surface-400 dark:text-surface-500'}`} />
                      Hashvalue
                      {networkHashrateOverride && !hashvalueOverride && (
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
          />

          {/* System Size */}
          <InputField
            label="System Size"
            type="number"
            value={systemSizeKw}
            onChange={setSystemSizeKw}
            suffix="kW"
            helpText={`${(parseFloat(systemSizeKw) || 0) * 1000}W peak`}
          />

          {/* Annual Production (only for production mode with annual entry) */}
          {inputMode === 'production' && dataEntryMethod === 'annual' && (
            <div className="relative">
              <div className="flex items-center gap-1 mb-1">
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  Annual Production
                </label>
                <SmartTooltip content="Find this on your solar monitoring app (Enphase, SolarEdge, etc.) or your utility bill under 'Solar Generation' or 'Customer Generation'." />
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
                <SmartTooltip content="Look for 'Energy Delivered to Grid', 'Net Export', or 'Excess Generation' on your utility bill. Some bills show this as negative kWh." />
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

          {/* Net Metering Rate (Mode 3) */}
          {inputMode === 'excess' && (
            <InputField
              label="Net Metering Rate"
              type="number"
              value={netMeteringRate}
              onChange={setNetMeteringRate}
              prefix="$"
              suffix="/kWh"
              helpText="What utility pays you"
            />
          )}
        </div>

        {/* Monthly Production Grid (only for production mode with monthly entry) */}
        {inputMode === 'production' && dataEntryMethod === 'monthly' && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300">
                Production by Month (kWh)
              </h4>
              <SmartTooltip content="Find this on your solar monitoring app (Enphase, SolarEdge, etc.) or your utility bill under 'Solar Generation' or 'Customer Generation'." />
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
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  Quantity
                </label>
                <span className="text-xs text-surface-500">(max {maxMiners})</span>
                <SmartTooltip content={`Max: ${maxMiners} miners (based on ${systemKw}kW system)`} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={quantityOverride}
                  onChange={(e) => setQuantityOverride(e.target.checked)}
                  className="rounded border-surface-300 text-primary-500 focus:ring-primary-500"
                />
                <input
                  type="number"
                  value={quantityOverride ? minerQuantity : maxMiners.toString()}
                  onChange={(e) => setMinerQuantity(e.target.value)}
                  disabled={!quantityOverride}
                  min="1"
                  max={maxMiners}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    quantityOverride
                      ? 'border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700'
                      : 'border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800'
                  } text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500`}
                />
              </div>
              <p className="text-xs text-surface-500 mt-1">
                {quantityOverride ? 'Custom quantity' : 'Auto (max capacity)'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section - Full Mining Potential (Estimate/Production modes only) */}
      {miningResult && inputMode !== 'excess' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
            Total Solar Mining Potential
          </h2>

          {/* Main Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Solar Production */}
            <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sun className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-surface-500 dark:text-surface-400">Annual Production</span>
              </div>
              <div className="text-2xl font-bold text-surface-900 dark:text-surface-100">
                {formatKwh(miningResult.annualProductionKwh)}
              </div>
              <p className="text-sm text-surface-500 mt-1">
                {miningResult.avgSunHoursPerDay.toFixed(1)} avg sun hours/day
              </p>
            </div>

            {/* Mining Capacity */}
            <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <Bolt className="w-5 h-5 text-orange-500" />
                <span className="text-sm text-surface-500 dark:text-surface-400">Mining Capacity</span>
              </div>
              <div className="text-2xl font-bold text-surface-900 dark:text-surface-100">
                {miningResult.actualMiners}x {miner.name}
              </div>
              <p className="text-sm text-surface-500 mt-1">
                {(miningResult.totalPowerW / 1000).toFixed(1)}kW / {miningResult.totalHashrateTH.toFixed(0)} TH/s
              </p>
            </div>

            {/* Annual BTC */}
            <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <Bitcoin className="w-5 h-5 text-orange-500" />
                <span className="text-sm text-surface-500 dark:text-surface-400">Annual BTC Earnings</span>
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
              </div>
              <div className="text-2xl font-bold text-surface-900 dark:text-surface-100">
                ${miningResult.effectiveRevenuePerKwh.toFixed(3)}
              </div>
              <p className="text-sm text-surface-500 mt-1">
                {miningResult.btcPerKwh.toFixed(0)} sats/kWh
              </p>
            </div>

            {/* Utilization */}
            <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-surface-500 dark:text-surface-400">Solar Utilization</span>
              </div>
              <div className="text-2xl font-bold text-surface-900 dark:text-surface-100">
                {miningResult.utilizationPercent.toFixed(0)}%
              </div>
              <p className="text-sm text-surface-500 mt-1">
                of {systemKw}kW system capacity
              </p>
            </div>
          </div>

          {/* Monthly Breakdown Chart */}
          <div className="bg-white dark:bg-surface-800 rounded-xl p-4 sm:p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-4">
              Monthly Revenue Breakdown
            </h3>
            <div className="overflow-x-auto">
              <div className="flex gap-2 min-w-[600px]">
                {miningResult.monthlyUsdBreakdown.map((usd, i) => {
                  const maxUsd = Math.max(...miningResult.monthlyUsdBreakdown)
                  const heightPercent = maxUsd > 0 ? (usd / maxUsd) * 100 : 0
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div className="w-full h-32 flex items-end">
                        <div
                          className="w-full bg-primary-500 dark:bg-primary-400 rounded-t"
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <div className="text-xs text-surface-500 mt-1">{getMonthName(i)}</div>
                      <div className="text-xs font-medium text-surface-700 dark:text-surface-300">
                        ${usd.toFixed(0)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Section - Net Metering Comparison (Excess mode only) */}
      {netMeteringResult && inputMode === 'excess' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100">
            Mining vs Net Metering Comparison
          </h2>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 shadow-lg border border-green-200 dark:border-green-800">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-surface-500 dark:text-surface-400 mb-1">Net Metering Credits</div>
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

          {/* Mining Details Card */}
          <div className="bg-white dark:bg-surface-800 rounded-xl p-4 shadow-lg">
            <h3 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">Mining Setup Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-surface-500 dark:text-surface-400">Miner</div>
                <div className="font-medium text-surface-900 dark:text-surface-100">{miner.name}</div>
              </div>
              <div>
                <div className="text-surface-500 dark:text-surface-400">Power</div>
                <div className="font-medium text-surface-900 dark:text-surface-100">{miner.powerW}W</div>
              </div>
              <div>
                <div className="text-surface-500 dark:text-surface-400">Hashrate</div>
                <div className="font-medium text-surface-900 dark:text-surface-100">{miner.hashrateTH} TH/s</div>
              </div>
              <div>
                <div className="text-surface-500 dark:text-surface-400">Avg Sun Hours</div>
                <div className="font-medium text-surface-900 dark:text-surface-100">{avgSunHours.toFixed(1)} hrs/day</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loadingSolar && (
        <div className="flex items-center justify-center gap-2 text-surface-500 py-8">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Fetching solar data for {zipCode}...</span>
        </div>
      )}

      {/* Empty State - Different for each mode */}
      {inputMode !== 'excess' && !miningResult && !loadingSolar && (
        <div className="text-center py-8 text-surface-500">
          <Sun className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Enter your zip code and system size to see solar mining potential.</p>
        </div>
      )}
      {inputMode === 'excess' && !netMeteringResult && !loadingSolar && (
        <div className="text-center py-8 text-surface-500">
          <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Enter your grid export data to compare mining vs net metering.</p>
        </div>
      )}
    </div>
  )
}
