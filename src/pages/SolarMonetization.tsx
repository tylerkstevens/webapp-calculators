import { useState, useMemo, useEffect } from 'react'
import { Sun, Zap, TrendingUp, Info, Loader2, MapPin, ChevronDown, ChevronUp } from 'lucide-react'

import InputField from '../components/InputField'
import SelectField from '../components/SelectField'
import ResultCard from '../components/ResultCard'
import { LocationPicker } from '../components/LocationPicker'

import {
  calculateSimpleMiningPotential,
  analyzeExcessSolar,
  getRecommendedMiner,
  MINER_PRESETS,
  MinerSpec,
  BTCMetrics,
} from '../calculations/solar'

import {
  getSolarProfile,
  estimateProductionByLatitude,
  AnnualSolarProfile,
  MONTH_ABBREV,
} from '../api/solar'

import { getBitcoinPrice, getNetworkStats } from '../api/bitcoin'

export default function SolarMonetization() {
  // ============================================================================
  // State
  // ============================================================================

  // Location
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [address, setAddress] = useState('')

  // Solar Profile
  const [solarProfile, setSolarProfile] = useState<AnnualSolarProfile | null>(null)
  const [loadingSolar, setLoadingSolar] = useState(false)
  const [solarError, setSolarError] = useState<string | null>(null)

  // Bitcoin data
  const [btcPrice, setBtcPrice] = useState<number | null>(null)
  const [networkHashrate, setNetworkHashrate] = useState<number | null>(null)
  const [loadingBtc, setLoadingBtc] = useState(true)

  // Solar system inputs
  const [systemSize, setSystemSize] = useState('10')
  const [selectedMiner, setSelectedMiner] = useState('0')
  const [customPower, setCustomPower] = useState('3500')
  const [customHashrate, setCustomHashrate] = useState('200')

  // Advanced section
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [excessKwh, setExcessKwh] = useState('2000')
  const [netMeteringRate, setNetMeteringRate] = useState('0.08')

  // ============================================================================
  // Effects
  // ============================================================================

  // Fetch BTC data on mount
  useEffect(() => {
    async function fetchBtcData() {
      setLoadingBtc(true)
      try {
        const [priceData, statsData] = await Promise.all([
          getBitcoinPrice(),
          getNetworkStats(),
        ])
        setBtcPrice(priceData.usd)
        setNetworkHashrate(statsData.hashrate)
      } catch (error) {
        console.error('Failed to fetch BTC data:', error)
        setBtcPrice(100000)
        setNetworkHashrate(700e6)
      } finally {
        setLoadingBtc(false)
      }
    }
    fetchBtcData()
  }, [])

  // Fetch solar profile when location changes
  useEffect(() => {
    if (latitude === null || longitude === null) return

    async function fetchSolarProfile() {
      setLoadingSolar(true)
      setSolarError(null)
      try {
        const profile = await getSolarProfile(latitude!, longitude!, 3) // 3 years for speed
        setSolarProfile(profile)
      } catch (error) {
        console.error('Failed to fetch solar data:', error)
        setSolarError('Could not fetch solar data. Using estimated values.')
      } finally {
        setLoadingSolar(false)
      }
    }
    fetchSolarProfile()
  }, [latitude, longitude])

  // ============================================================================
  // Derived Values
  // ============================================================================

  const miner: MinerSpec = useMemo(() => {
    const idx = parseInt(selectedMiner)
    if (idx >= 0 && idx < MINER_PRESETS.length) {
      return MINER_PRESETS[idx]
    }
    return {
      name: 'Custom',
      powerW: parseFloat(customPower) || 3500,
      hashrateTH: parseFloat(customHashrate) || 200,
    }
  }, [selectedMiner, customPower, customHashrate])

  const btcMetrics: BTCMetrics | null = useMemo(() => {
    if (btcPrice === null || networkHashrate === null) return null
    return {
      btcPrice,
      networkHashrate,
      blockReward: 3.125,
    }
  }, [btcPrice, networkHashrate])

  const systemSizeNum = parseFloat(systemSize) || 10
  const excessKwhNum = parseFloat(excessKwh) || 2000
  const netMeteringRateNum = parseFloat(netMeteringRate) || 0.08

  // Estimate annual production
  const annualSolarKwh = useMemo(() => {
    if (solarProfile) {
      return solarProfile.annualKwhPerKw * systemSizeNum
    }
    if (latitude !== null) {
      return estimateProductionByLatitude(systemSizeNum, latitude)
    }
    // Default estimate for continental US
    return systemSizeNum * 1400
  }, [solarProfile, systemSizeNum, latitude])

  // Calculate mining potential
  const miningPotential = useMemo(() => {
    if (!btcMetrics) return null
    return calculateSimpleMiningPotential(annualSolarKwh, miner, btcMetrics)
  }, [annualSolarKwh, miner, btcMetrics])

  // Excess solar analysis
  const excessAnalysis = useMemo(() => {
    if (!btcMetrics) return null
    return analyzeExcessSolar(excessKwhNum, netMeteringRateNum, miner, btcMetrics)
  }, [excessKwhNum, netMeteringRateNum, miner, btcMetrics])

  // Recommended miner
  const recommendation = useMemo(() => {
    return getRecommendedMiner(systemSizeNum)
  }, [systemSizeNum])

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleLocationChange = (lat: number, lon: number, addr: string) => {
    setLatitude(lat)
    setLongitude(lon)
    setAddress(addr)
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-surface-900 mb-2">Solar Monetization</h1>
          <p className="text-surface-600">
            Estimate Bitcoin mining potential from your solar system
          </p>
        </div>

        {/* BTC Data Status */}
        <div className="mb-6 p-4 bg-white rounded-xl border border-surface-200">
          <div className="flex items-center gap-4">
            {loadingBtc ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                <span className="text-surface-600">Loading Bitcoin data...</span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-surface-700 font-medium">
                    BTC: ${btcPrice?.toLocaleString()}
                  </span>
                </div>
                <div className="text-surface-500">|</div>
                <span className="text-surface-600">
                  Network: {((networkHashrate || 0) / 1e6).toFixed(0)} EH/s
                </span>
              </>
            )}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Inputs */}
          <div className="space-y-6">
            {/* Location */}
            <div className="bg-white rounded-xl border border-surface-200 p-6">
              <h2 className="text-lg font-semibold text-surface-800 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-500" />
                Location
              </h2>
              <LocationPicker
                latitude={latitude}
                longitude={longitude}
                address={address}
                onLocationChange={handleLocationChange}
              />
              {loadingSolar && (
                <div className="mt-3 flex items-center gap-2 text-sm text-primary-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Fetching solar data...</span>
                </div>
              )}
              {solarError && (
                <div className="mt-3 text-sm text-amber-600">{solarError}</div>
              )}
            </div>

            {/* Solar System */}
            <div className="bg-white rounded-xl border border-surface-200 p-6">
              <h2 className="text-lg font-semibold text-surface-800 mb-4 flex items-center gap-2">
                <Sun className="w-5 h-5 text-yellow-500" />
                Solar System
              </h2>
              <div className="space-y-4">
                <InputField
                  label="System Size (DC Rating)"
                  value={systemSize}
                  onChange={setSystemSize}
                  suffix="kW"
                  type="number"
                  min={1}
                  max={100}
                  helpText="Total DC capacity of your solar panels"
                />

                <div className="p-3 bg-yellow-50 rounded-lg text-sm">
                  <div className="flex justify-between text-yellow-800">
                    <span>Estimated Annual Production:</span>
                    <span className="font-bold">{annualSolarKwh.toLocaleString()} kWh</span>
                  </div>
                  {solarProfile && (
                    <div className="flex justify-between text-yellow-700 mt-1">
                      <span>Peak month:</span>
                      <span>{MONTH_ABBREV[solarProfile.peakMonth - 1]}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Miner Selection */}
            <div className="bg-white rounded-xl border border-surface-200 p-6">
              <h2 className="text-lg font-semibold text-surface-800 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary-500" />
                Miner Configuration
              </h2>
              <div className="space-y-4">
                <SelectField
                  label="Select Miner"
                  value={selectedMiner}
                  onChange={setSelectedMiner}
                  options={[
                    ...MINER_PRESETS.map((m, i) => ({
                      value: i.toString(),
                      label: `${m.name} (${m.powerW}W, ${m.hashrateTH} TH/s)`,
                    })),
                    { value: 'custom', label: 'Custom' },
                  ]}
                />

                {selectedMiner === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="Power"
                      value={customPower}
                      onChange={setCustomPower}
                      suffix="W"
                      type="number"
                    />
                    <InputField
                      label="Hashrate"
                      value={customHashrate}
                      onChange={setCustomHashrate}
                      suffix="TH/s"
                      type="number"
                    />
                  </div>
                )}

                {recommendation && (
                  <div className="p-3 bg-surface-50 rounded-lg text-sm text-surface-600">
                    <div className="font-medium text-surface-700">Recommendation:</div>
                    <div>{recommendation.notes}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Advanced Section */}
            <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-surface-50 transition-colors"
              >
                <span className="font-semibold text-surface-800">
                  Advanced: Excess Solar Analysis
                </span>
                {showAdvanced ? (
                  <ChevronUp className="w-5 h-5 text-surface-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-surface-500" />
                )}
              </button>

              {showAdvanced && (
                <div className="p-6 pt-0 space-y-4">
                  <p className="text-sm text-surface-600">
                    Enter your annual excess solar exported to the grid to compare
                    net metering credits vs. Bitcoin mining potential.
                  </p>
                  <InputField
                    label="Annual Excess Solar"
                    value={excessKwh}
                    onChange={setExcessKwh}
                    suffix="kWh"
                    type="number"
                    helpText="kWh exported to grid annually (from utility bill)"
                  />
                  <InputField
                    label="Net Metering Rate"
                    value={netMeteringRate}
                    onChange={setNetMeteringRate}
                    prefix="$"
                    suffix="/kWh"
                    type="number"
                    step={0.01}
                    helpText="Credit rate for exported power"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6 lg:sticky lg:top-4 lg:self-start">
            {/* Mining Potential */}
            {miningPotential && (
              <div className="bg-white rounded-xl border border-surface-200 p-6">
                <h2 className="text-lg font-semibold text-surface-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Mining Potential (100% Solar)
                </h2>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <ResultCard
                    label="Annual BTC"
                    value={miningPotential.annualBtc.toFixed(6)}
                    variant="highlight"
                  />
                  <ResultCard
                    label="Annual Value"
                    value={`$${miningPotential.annualUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    variant="success"
                  />
                </div>

                <div className="p-4 bg-green-50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700">Effective rate:</span>
                    <span className="font-bold text-green-800">
                      ${miningPotential.effectiveRate.toFixed(3)}/kWh
                    </span>
                  </div>
                  <div className="text-xs text-green-600">
                    This is what your solar is &quot;earning&quot; when used for mining
                  </div>
                </div>

                <div className="mt-4 p-3 bg-surface-50 rounded-lg text-sm text-surface-600">
                  <div className="font-medium text-surface-700 mb-1">Assumptions:</div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>All solar production goes to mining</li>
                    <li>No grid power used</li>
                    <li>Current BTC price and network hashrate</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Excess Solar Analysis */}
            {showAdvanced && excessAnalysis && (
              <div className="bg-white rounded-xl border border-surface-200 p-6">
                <h2 className="text-lg font-semibold text-surface-800 mb-4">
                  Excess Solar: Grid vs. Mining
                </h2>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <ResultCard
                    label="Current Credits"
                    value={`$${excessAnalysis.currentCredits.toFixed(0)}/yr`}
                    subValue="Net metering"
                  />
                  <ResultCard
                    label="Mining Potential"
                    value={`$${excessAnalysis.potentialUsd.toFixed(0)}/yr`}
                    subValue={`${excessAnalysis.potentialBtc.toFixed(6)} BTC`}
                    variant={excessAnalysis.potentialUsd > excessAnalysis.currentCredits ? 'success' : 'default'}
                  />
                </div>

                <div className={`p-4 rounded-lg ${
                  excessAnalysis.recommendation === 'mine' ? 'bg-green-50' :
                  excessAnalysis.recommendation === 'grid' ? 'bg-blue-50' : 'bg-surface-50'
                }`}>
                  {excessAnalysis.recommendation === 'mine' && (
                    <div className="text-green-800">
                      <strong>Mining is better!</strong> You could earn{' '}
                      ${excessAnalysis.opportunityCost.toFixed(0)}/yr more by mining
                      instead of selling to the grid.
                    </div>
                  )}
                  {excessAnalysis.recommendation === 'grid' && (
                    <div className="text-blue-800">
                      <strong>Grid credits are better.</strong> Net metering provides
                      better value with current BTC economics.
                    </div>
                  )}
                  {excessAnalysis.recommendation === 'neutral' && (
                    <div className="text-surface-700">
                      <strong>About equal.</strong> Both options provide similar value.
                      Consider other factors like convenience and risk preference.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Monthly Production Chart (if profile available) */}
            {solarProfile && (
              <div className="bg-white rounded-xl border border-surface-200 p-6">
                <h2 className="text-lg font-semibold text-surface-800 mb-4">
                  Monthly Solar Production
                </h2>
                <div className="space-y-2">
                  {solarProfile.monthly.map((m, i) => {
                    const monthlyKwh = m.totalKwh * systemSizeNum
                    const maxMonthly = Math.max(...solarProfile.monthly.map(x => x.totalKwh)) * systemSizeNum
                    const pct = (monthlyKwh / maxMonthly) * 100
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-8 text-surface-600">{MONTH_ABBREV[i]}</span>
                        <div className="flex-1 h-4 bg-surface-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-20 text-right text-surface-700">
                          {monthlyKwh.toFixed(0)} kWh
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-2">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Disclaimer</p>
                  <p>
                    These calculations are estimates based on historical solar data
                    and current Bitcoin market conditions. Actual results will vary
                    based on weather, system performance, and market changes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
