import { useState, useMemo, useEffect } from 'react'
import { Sun, Flame, Zap, TrendingUp, Info, Loader2, Calendar } from 'lucide-react'

import InputField from '../components/InputField'
import SelectField from '../components/SelectField'
import ResultCard from '../components/ResultCard'

import {
  calculateCOPe,
  MINER_PRESETS,
  MinerSpec,
  BTCMetrics,
} from '../calculations/hashrate'

import { estimateProductionByLatitude, MONTH_ABBREV } from '../api/solar'
import { getBitcoinPrice, getNetworkStats } from '../api/bitcoin'

// Seasonal heating demand profile (relative to peak month)
// Higher values = more heating needed
const HEATING_PROFILE = [1.0, 0.9, 0.7, 0.4, 0.1, 0, 0, 0, 0.1, 0.4, 0.7, 0.9]

// Solar production profile (relative to peak month)
// Inverse of heating - higher in summer
const SOLAR_PROFILE = [0.5, 0.6, 0.75, 0.85, 0.95, 1.0, 1.0, 0.95, 0.85, 0.7, 0.55, 0.45]

export default function HeatPlusSolar() {
  // ============================================================================
  // State
  // ============================================================================

  // Bitcoin data
  const [btcPrice, setBtcPrice] = useState<number | null>(null)
  const [networkHashrate, setNetworkHashrate] = useState<number | null>(null)
  const [loadingBtc, setLoadingBtc] = useState(true)

  // System inputs
  const [latitude, setLatitude] = useState('40') // Default to mid-US
  const [solarSize, setSolarSize] = useState('10')
  const [annualHeatingKwh, setAnnualHeatingKwh] = useState('15000')
  const [electricityRate, setElectricityRate] = useState('0.12')
  const [selectedMiner, setSelectedMiner] = useState('0')

  // ============================================================================
  // Effects
  // ============================================================================

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

  // ============================================================================
  // Derived Values
  // ============================================================================

  const miner: MinerSpec = useMemo(() => {
    const idx = parseInt(selectedMiner)
    if (idx >= 0 && idx < MINER_PRESETS.length) {
      return MINER_PRESETS[idx]
    }
    return MINER_PRESETS[0]
  }, [selectedMiner])

  const btcMetrics: BTCMetrics | null = useMemo(() => {
    if (btcPrice === null || networkHashrate === null) return null
    return {
      btcPrice,
      networkHashrate,
      blockReward: 3.125,
    }
  }, [btcPrice, networkHashrate])

  const latitudeNum = parseFloat(latitude) || 40
  const solarSizeNum = parseFloat(solarSize) || 10
  const heatingKwhNum = parseFloat(annualHeatingKwh) || 15000
  const electricityRateNum = parseFloat(electricityRate) || 0.12

  // ============================================================================
  // Calculations
  // ============================================================================

  // Monthly breakdown
  const monthlyData = useMemo(() => {
    const annualSolar = estimateProductionByLatitude(solarSizeNum, latitudeNum)
    const minerPowerKw = miner.powerW / 1000

    return Array.from({ length: 12 }, (_, i) => {
      // Heating demand for this month
      const heatingFactor = HEATING_PROFILE[i]
      const monthlyHeatingKwh = (heatingKwhNum / 12) * (heatingFactor / 0.5) // Normalize

      // Solar production for this month
      const solarFactor = SOLAR_PROFILE[i]
      const monthlySolarKwh = (annualSolar / 12) * (solarFactor / 0.75) // Normalize

      // Mining hours from heating (assuming all heat comes from miner)
      const heatingHours = monthlyHeatingKwh / minerPowerKw
      const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][i]
      const maxHeatingHours = daysInMonth * 24 * heatingFactor // Scaled by heating need
      const actualHeatingHours = Math.min(heatingHours, maxHeatingHours)

      // Excess solar (after powering heating miner)
      const solarUsedForHeating = actualHeatingHours * minerPowerKw
      const excessSolarKwh = Math.max(0, monthlySolarKwh - solarUsedForHeating)

      return {
        month: i + 1,
        heating: monthlyHeatingKwh,
        solar: monthlySolarKwh,
        heatingHours: actualHeatingHours,
        excessSolar: excessSolarKwh,
        gridPower: Math.max(0, solarUsedForHeating - monthlySolarKwh),
      }
    })
  }, [solarSizeNum, latitudeNum, heatingKwhNum, miner])

  // Annual summaries
  const annualSummary = useMemo(() => {
    if (!btcMetrics) return null

    const copeResult = calculateCOPe(electricityRateNum, miner, btcMetrics)

    const totalHeatingHours = monthlyData.reduce((sum, m) => sum + m.heatingHours, 0)
    const totalExcessSolar = monthlyData.reduce((sum, m) => sum + m.excessSolar, 0)
    const totalGridPower = monthlyData.reduce((sum, m) => sum + m.gridPower, 0)
    const totalSolar = monthlyData.reduce((sum, m) => sum + m.solar, 0)

    // BTC from heating (miner runs for heating hours)
    const dailyBtcFull = (144 * btcMetrics.blockReward * miner.hashrateTH) / btcMetrics.networkHashrate
    const btcFromHeating = dailyBtcFull * (totalHeatingHours / 24)

    // BTC from excess solar (additional mining potential)
    const excessMiningHours = totalExcessSolar / (miner.powerW / 1000)
    const btcFromExcess = dailyBtcFull * (excessMiningHours / 24)

    const totalBtc = btcFromHeating + btcFromExcess
    const totalBtcUsd = totalBtc * btcMetrics.btcPrice

    // Costs
    const gridElectricityCost = totalGridPower * electricityRateNum

    // Solar self-consumption percentage
    const solarUsedPercent = totalSolar > 0
      ? ((totalSolar - totalExcessSolar) / totalSolar) * 100
      : 0

    return {
      copeResult,
      totalHeatingHours,
      totalExcessSolar,
      totalGridPower,
      totalSolar,
      btcFromHeating,
      btcFromExcess,
      totalBtc,
      totalBtcUsd,
      gridElectricityCost,
      solarUsedPercent,
      netProfit: totalBtcUsd - gridElectricityCost,
    }
  }, [monthlyData, btcMetrics, electricityRateNum, miner])

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-surface-900 mb-2">Heat + Solar Combined</h1>
          <p className="text-surface-600">
            Analyze year-round economics of hashrate heating with solar
          </p>
        </div>

        {/* BTC Status */}
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
              </>
            )}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Inputs */}
          <div className="space-y-6">
            {/* Location & Solar */}
            <div className="bg-white rounded-xl border border-surface-200 p-6">
              <h2 className="text-lg font-semibold text-surface-800 mb-4 flex items-center gap-2">
                <Sun className="w-5 h-5 text-yellow-500" />
                Solar System
              </h2>
              <div className="space-y-4">
                <InputField
                  label="Latitude"
                  value={latitude}
                  onChange={setLatitude}
                  suffix="°"
                  type="number"
                  min={-90}
                  max={90}
                  helpText="Your approximate latitude (e.g., 40 for New York)"
                />
                <InputField
                  label="Solar System Size"
                  value={solarSize}
                  onChange={setSolarSize}
                  suffix="kW"
                  type="number"
                  min={0}
                  max={100}
                />
                <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                  Est. annual production: {estimateProductionByLatitude(solarSizeNum, latitudeNum).toLocaleString()} kWh
                </div>
              </div>
            </div>

            {/* Heating */}
            <div className="bg-white rounded-xl border border-surface-200 p-6">
              <h2 className="text-lg font-semibold text-surface-800 mb-4 flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                Heating Load
              </h2>
              <div className="space-y-4">
                <InputField
                  label="Annual Heating Demand"
                  value={annualHeatingKwh}
                  onChange={setAnnualHeatingKwh}
                  suffix="kWh"
                  type="number"
                  min={0}
                  helpText="Total annual heating energy (from Exergy Audit or utility bills)"
                />
                <InputField
                  label="Electricity Rate"
                  value={electricityRate}
                  onChange={setElectricityRate}
                  prefix="$"
                  suffix="/kWh"
                  type="number"
                  step={0.01}
                />
              </div>
            </div>

            {/* Miner */}
            <div className="bg-white rounded-xl border border-surface-200 p-6">
              <h2 className="text-lg font-semibold text-surface-800 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary-500" />
                Miner
              </h2>
              <SelectField
                label="Select Miner"
                value={selectedMiner}
                onChange={setSelectedMiner}
                options={MINER_PRESETS.map((m, i) => ({
                  value: i.toString(),
                  label: `${m.name} (${m.powerW}W)`,
                }))}
              />
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6 lg:sticky lg:top-4 lg:self-start">
            {/* Annual Summary */}
            {annualSummary && (
              <div className="bg-white rounded-xl border border-surface-200 p-6">
                <h2 className="text-lg font-semibold text-surface-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Annual Summary
                </h2>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <ResultCard
                    label="Total BTC Mined"
                    value={annualSummary.totalBtc.toFixed(6)}
                    subValue={`$${annualSummary.totalBtcUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    variant="highlight"
                  />
                  <ResultCard
                    label="Net Profit"
                    value={`$${annualSummary.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    variant={annualSummary.netProfit > 0 ? 'success' : 'warning'}
                  />
                  <ResultCard
                    label="COPe"
                    value={annualSummary.copeResult.COPe === Infinity ? '∞' : annualSummary.copeResult.COPe.toFixed(1)}
                    subValue="Economic COP"
                  />
                  <ResultCard
                    label="Solar Self-Use"
                    value={`${annualSummary.solarUsedPercent.toFixed(0)}%`}
                    subValue="Of production"
                  />
                </div>

                <div className="p-4 bg-surface-50 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-surface-600">BTC from heating:</span>
                    <span className="font-medium">{annualSummary.btcFromHeating.toFixed(6)} BTC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-600">BTC from excess solar:</span>
                    <span className="font-medium">{annualSummary.btcFromExcess.toFixed(6)} BTC</span>
                  </div>
                  <div className="flex justify-between border-t border-surface-200 pt-2">
                    <span className="text-surface-600">Grid electricity used:</span>
                    <span className="font-medium">{annualSummary.totalGridPower.toLocaleString()} kWh</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-600">Grid electricity cost:</span>
                    <span className="font-medium text-red-600">
                      -${annualSummary.gridElectricityCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Monthly Chart */}
            <div className="bg-white rounded-xl border border-surface-200 p-6">
              <h2 className="text-lg font-semibold text-surface-800 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary-500" />
                Monthly Profile
              </h2>
              <div className="space-y-2">
                {monthlyData.map((m, i) => {
                  const maxVal = Math.max(
                    ...monthlyData.map(x => Math.max(x.heating, x.solar))
                  )
                  const heatingPct = (m.heating / maxVal) * 100
                  const solarPct = (m.solar / maxVal) * 100

                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-surface-600">
                        <span className="w-8">{MONTH_ABBREV[i]}</span>
                        <div className="flex-1 flex gap-1">
                          <div
                            className="h-3 bg-orange-400 rounded"
                            style={{ width: `${heatingPct}%` }}
                            title={`Heating: ${m.heating.toFixed(0)} kWh`}
                          />
                        </div>
                        <div className="flex-1 flex gap-1">
                          <div
                            className="h-3 bg-yellow-400 rounded"
                            style={{ width: `${solarPct}%` }}
                            title={`Solar: ${m.solar.toFixed(0)} kWh`}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div className="flex gap-4 mt-3 text-xs text-surface-600 justify-center">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-orange-400 rounded" />
                    <span>Heating</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-400 rounded" />
                    <span>Solar</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-2">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Simplified Model</p>
                  <p>
                    This uses typical seasonal patterns. For precise analysis,
                    use the Exergy Audit with your actual location and utility data.
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
