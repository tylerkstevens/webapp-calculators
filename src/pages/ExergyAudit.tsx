import { useState, useMemo, useEffect } from 'react'
import { Loader2, AlertCircle, Calculator, Thermometer, Info } from 'lucide-react'

// Components
import InputField from '../components/InputField'
import SelectField from '../components/SelectField'
import ResultCard from '../components/ResultCard'
import { BuildingTypeToggle } from '../components/BuildingTypeToggle'
import { LocationPicker } from '../components/LocationPicker'
import { MonthlyBillsTable, createEmptyBillInputs } from '../components/MonthlyBillsTable'
import { HeatLoadChart, DutyCycleChart } from '../components/HeatLoadChart'
import { EconomicsSummary } from '../components/EconomicsSummary'

// Types
import {
  FuelType,
  BuildingEra,
  WindowType,
  FoundationType,
  ACHTightness,
  MonthlyBillInput,
  MonthlyBillData,
  HLCCalibrationResult,
  SizingResult,
  FreezeFrameResult,
  MonthlySizingProfile,
} from '../types/audit'

// Calculations
import {
  FUEL_TYPE_LABELS,
  TYPICAL_AFUE,
  fuelCostToKwhCost,
} from '../calculations/conversions'
import {
  calculateHLCFromBills,
  calibrateHLC,
  generateHeatLoadProfile,
} from '../calculations/existingBuild'
import {
  createEnvelopeFromInputs,
  calculateTotalHLC,
} from '../calculations/newBuild'
import {
  calculateBaseloadSizing,
  calculateExtremeSizing,
  sizeSystem,
  calculateMonthlyDutyCycles,
  generateMonthlySizingProfile,
  DEFAULT_MINERS,
} from '../calculations/sizing'
import { analyzeFreezeFrame } from '../calculations/economics'

// API
import { getHistoricalHDDProfile, getDesignTemperature, getYearHDD } from '../api/weather'
import { getBitcoinPrice, getNetworkStats, calculateDailyBTC } from '../api/bitcoin'

type BuildingType = 'existing' | 'new'

export default function ExergyAudit() {
  // ============================================================================
  // State
  // ============================================================================

  // Building Type
  const [buildingType, setBuildingType] = useState<BuildingType>('existing')

  // Location
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [address, setAddress] = useState('')

  // Climate Data
  const [historicalHDD, setHistoricalHDD] = useState<number[] | null>(null)
  const [referenceHDD, setReferenceHDD] = useState<number[] | null>(null)
  const [designTemp, setDesignTemp] = useState<number | null>(null)
  const [loadingClimate, setLoadingClimate] = useState(false)
  const [climateError, setClimateError] = useState<string | null>(null)

  // Existing Building Inputs
  const [fuelType, setFuelType] = useState<FuelType>('therms')
  const [afue, setAfue] = useState('0.85')
  const [monthlyBills, setMonthlyBills] = useState<MonthlyBillInput[]>(createEmptyBillInputs())

  // New Building Inputs
  const [floorArea, setFloorArea] = useState('2000')
  const [ceilingHeight, setCeilingHeight] = useState('9')
  const [buildingEra, setBuildingEra] = useState<BuildingEra>('2010_2020')
  const [windowType, setWindowType] = useState<WindowType>('2010_low_e')
  const [foundationType, setFoundationType] = useState<FoundationType>('slab_on_grade')
  const [achTightness, setAchTightness] = useState<ACHTightness>('new_standard')

  // Economic Inputs
  const [electricityRate, setElectricityRate] = useState('0.12')
  const [fuelPrice, setFuelPrice] = useState('1.50')
  const [hardwareCost, setHardwareCost] = useState('10000')
  const [poolFee, setPoolFee] = useState('2')
  const [targetTemp, setTargetTemp] = useState('70')

  // Bitcoin Data
  const [btcPrice, setBtcPrice] = useState<number | null>(null)
  const [networkHashrate, setNetworkHashrate] = useState<number | null>(null)
  const [loadingBtc, setLoadingBtc] = useState(false)

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
        // Use fallbacks
        setBtcPrice(100000)
        setNetworkHashrate(700e18)
      } finally {
        setLoadingBtc(false)
      }
    }
    fetchBtcData()
  }, [])

  // Fetch climate data when location changes
  useEffect(() => {
    if (latitude === null || longitude === null) return

    async function fetchClimateData() {
      setLoadingClimate(true)
      setClimateError(null)
      try {
        const [hddProfile, design, refHdd] = await Promise.all([
          getHistoricalHDDProfile(latitude!, longitude!, 5), // Use 5 years for speed
          getDesignTemperature(latitude!, longitude!, 5),
          getYearHDD(latitude!, longitude!, new Date().getFullYear() - 1),
        ])
        setHistoricalHDD(hddProfile)
        setDesignTemp(design)
        setReferenceHDD(refHdd.map(h => h.hdd))
      } catch (error) {
        console.error('Failed to fetch climate data:', error)
        setClimateError('Failed to fetch climate data. Please try again or enter location manually.')
      } finally {
        setLoadingClimate(false)
      }
    }
    fetchClimateData()
  }, [latitude, longitude])

  // Update AFUE when fuel type changes
  useEffect(() => {
    setAfue(TYPICAL_AFUE[fuelType].toString())
  }, [fuelType])

  // ============================================================================
  // Calculations
  // ============================================================================

  // Parse numeric inputs
  const afueNum = parseFloat(afue) || 0.85
  const floorAreaNum = parseFloat(floorArea) || 2000
  const ceilingHeightNum = parseFloat(ceilingHeight) || 9
  const electricityRateNum = parseFloat(electricityRate) || 0.12
  const fuelPriceNum = parseFloat(fuelPrice) || 1.50
  const hardwareCostNum = parseFloat(hardwareCost) || 10000
  const poolFeeNum = (parseFloat(poolFee) || 2) / 100
  const targetTempNum = parseFloat(targetTemp) || 70

  // Calculate HLC based on building type
  const hlcResult = useMemo<HLCCalibrationResult | null>(() => {
    if (buildingType === 'existing') {
      // Need HDD data for existing building
      if (!referenceHDD) return null

      // Convert bill inputs to data
      const billData: MonthlyBillData[] = monthlyBills.map((bill, i) => ({
        month: bill.month,
        fuelQuantity: parseFloat(bill.fuelQuantity) || 0,
        fuelType,
        totalCost: parseFloat(bill.totalCost) || 0,
        hddReference: referenceHDD[i] || 0,
      }))

      // Check if we have enough data
      const hasData = billData.some(b => b.fuelQuantity > 0)
      if (!hasData) return null

      try {
        const monthlyHLC = calculateHLCFromBills(billData, afueNum)
        const result = calibrateHLC(monthlyHLC, billData, 'median', true)
        return result
      } catch (error) {
        console.error('HLC calculation error:', error)
        return null
      }
    } else {
      // New building - Manual J
      try {
        const envelope = createEnvelopeFromInputs(
          floorAreaNum,
          ceilingHeightNum,
          buildingEra,
          windowType,
          foundationType,
          achTightness
        )
        const breakdown = calculateTotalHLC(envelope)

        // Convert BTU/h/°F to kW/°F and kWh/°F-day
        const hlcRateKw = breakdown.hlcTotal / 3412
        const hlcHdd = hlcRateKw * 24

        // Calculate annual heat with historical HDD
        const annualHdd = historicalHDD?.reduce((sum, hdd) => sum + hdd, 0) || 4500
        const annualHeatKwh = hlcHdd * annualHdd

        return {
          hlcHdd,
          hlcRate: hlcRateKw,
          hlcBtu: breakdown.hlcTotal,
          monthlyHlcValues: new Array(12).fill(hlcHdd),
          excludedMonths: [],
          method: 'median' as const,
          annualHeatKwh,
        }
      } catch (error) {
        console.error('Manual J calculation error:', error)
        return null
      }
    }
  }, [
    buildingType,
    monthlyBills,
    fuelType,
    afueNum,
    referenceHDD,
    floorAreaNum,
    ceilingHeightNum,
    buildingEra,
    windowType,
    foundationType,
    achTightness,
    historicalHDD,
  ])

  // Generate heat load profile
  const heatLoadProfile = useMemo(() => {
    if (!hlcResult || !historicalHDD) return null
    return generateHeatLoadProfile(hlcResult.hlcHdd, historicalHDD)
  }, [hlcResult, historicalHDD])

  // Calculate sizing
  const sizingResult = useMemo<SizingResult | null>(() => {
    if (!heatLoadProfile) return null

    const baseloadKw = calculateBaseloadSizing(heatLoadProfile)
    return sizeSystem(baseloadKw, DEFAULT_MINERS, 'baseload', 'cost_per_th')
  }, [heatLoadProfile])

  // Extreme sizing (for comparison)
  const extremeSizingKw = useMemo(() => {
    if (!hlcResult || designTemp === null) return null
    return calculateExtremeSizing(hlcResult.hlcRate, targetTempNum, designTemp)
  }, [hlcResult, designTemp, targetTempNum])

  // Monthly sizing profile - reserved for detailed monthly breakdown table
  const _monthlySizingProfile = useMemo<MonthlySizingProfile[] | null>(() => {
    if (!heatLoadProfile || !sizingResult) return null
    return generateMonthlySizingProfile(heatLoadProfile, sizingResult)
  }, [heatLoadProfile, sizingResult])
  void _monthlySizingProfile

  // Monthly duty cycles
  const monthlyDutyCycles = useMemo(() => {
    if (!heatLoadProfile || !sizingResult) return null
    return calculateMonthlyDutyCycles(heatLoadProfile, sizingResult.totalCapacityKw)
  }, [heatLoadProfile, sizingResult])

  // Economic analysis
  const economicsResult = useMemo<FreezeFrameResult | null>(() => {
    if (!heatLoadProfile || !monthlyDutyCycles || !sizingResult || !btcPrice || !networkHashrate) {
      return null
    }

    // Calculate hashprice from network stats
    const blockReward = 3.125 // Current block reward after halving
    const dailyBtc = calculateDailyBTC(1, networkHashrate, blockReward) // Per TH
    const hashpriceUsd = dailyBtc * btcPrice

    // Calculate fuel cost per kWh
    const fuelCostPerKwh = fuelCostToKwhCost(fuelPriceNum, fuelType, afueNum)

    try {
      return analyzeFreezeFrame({
        totalHashrateTh: sizingResult.totalHashrateTh,
        totalPowerKw: sizingResult.totalCapacityKw,
        monthlyHeatLoadKwh: heatLoadProfile,
        monthlyDutyCycles,
        hashpriceUsdPerThDay: hashpriceUsd,
        btcPriceUsd: btcPrice,
        fuelCostPerKwh,
        electricityRateKwh: electricityRateNum,
        capitalCostUsd: hardwareCostNum,
        poolFeePercent: poolFeeNum,
      })
    } catch (error) {
      console.error('Economics calculation error:', error)
      return null
    }
  }, [
    heatLoadProfile,
    monthlyDutyCycles,
    sizingResult,
    btcPrice,
    networkHashrate,
    fuelPriceNum,
    fuelType,
    afueNum,
    electricityRateNum,
    hardwareCostNum,
    poolFeeNum,
  ])

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
          <h1 className="text-3xl font-bold text-surface-900 mb-2">Exergy Audit</h1>
          <p className="text-surface-600">
            Comprehensive energy analysis for hashrate heating systems
          </p>
        </div>

        {/* Building Type Toggle */}
        <div className="mb-6">
          <BuildingTypeToggle value={buildingType} onChange={setBuildingType} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Inputs */}
          <div className="space-y-6">
            {/* Location Section */}
            <div className="bg-white rounded-xl border border-surface-200 p-6">
              <h2 className="text-lg font-semibold text-surface-800 mb-4">Location</h2>
              <LocationPicker
                latitude={latitude}
                longitude={longitude}
                address={address}
                onLocationChange={handleLocationChange}
              />
              {loadingClimate && (
                <div className="mt-3 flex items-center gap-2 text-sm text-primary-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Fetching climate data...</span>
                </div>
              )}
              {climateError && (
                <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>{climateError}</span>
                </div>
              )}
              {designTemp !== null && (
                <div className="mt-3 text-sm text-surface-600">
                  <span className="font-medium">99% Design Temp:</span> {designTemp.toFixed(0)}°F
                </div>
              )}
            </div>

            {/* Building Data Section */}
            <div className="bg-white rounded-xl border border-surface-200 p-6">
              <h2 className="text-lg font-semibold text-surface-800 mb-4">
                {buildingType === 'existing' ? 'Utility Bills' : 'Building Specifications'}
              </h2>

              {buildingType === 'existing' ? (
                <div className="space-y-4">
                  <SelectField
                    label="Heating Fuel Type"
                    value={fuelType}
                    onChange={(value) => setFuelType(value as FuelType)}
                    options={Object.entries(FUEL_TYPE_LABELS).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                  />
                  <InputField
                    label="Heating System Efficiency (AFUE)"
                    value={afue}
                    onChange={setAfue}
                    type="number"
                    min={0.5}
                    max={1.0}
                    step={0.01}
                    helpText="Annual Fuel Utilization Efficiency (0.5-1.0)"
                  />
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-surface-700 mb-2">
                      Monthly Utility Bills
                    </label>
                    <MonthlyBillsTable
                      bills={monthlyBills}
                      fuelType={fuelType}
                      onChange={setMonthlyBills}
                      hddData={referenceHDD || undefined}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="Floor Area"
                      value={floorArea}
                      onChange={setFloorArea}
                      suffix="sq ft"
                      type="number"
                      min={500}
                      max={10000}
                    />
                    <InputField
                      label="Ceiling Height"
                      value={ceilingHeight}
                      onChange={setCeilingHeight}
                      suffix="ft"
                      type="number"
                      min={7}
                      max={20}
                    />
                  </div>
                  <SelectField
                    label="Building Era"
                    value={buildingEra}
                    onChange={(value) => setBuildingEra(value as BuildingEra)}
                    options={[
                      { value: 'pre_1980', label: 'Pre-1980 (minimal insulation)' },
                      { value: '1980_2000', label: '1980-2000 (code minimum)' },
                      { value: '2000_2010', label: '2000-2010 (improved)' },
                      { value: '2010_2020', label: '2010-2020 (modern)' },
                      { value: 'post_2020', label: 'Post-2020 (high performance)' },
                    ]}
                  />
                  <SelectField
                    label="Window Type"
                    value={windowType}
                    onChange={(value) => setWindowType(value as WindowType)}
                    options={[
                      { value: 'pre_2000_single', label: 'Single pane' },
                      { value: '2000_double', label: 'Double pane' },
                      { value: '2010_low_e', label: 'Double pane Low-E' },
                      { value: 'post_2020_triple', label: 'Triple pane' },
                    ]}
                  />
                  <SelectField
                    label="Foundation Type"
                    value={foundationType}
                    onChange={(value) => setFoundationType(value as FoundationType)}
                    options={[
                      { value: 'slab_on_grade', label: 'Slab on grade' },
                      { value: 'basement', label: 'Basement' },
                      { value: 'crawlspace', label: 'Crawlspace' },
                      { value: 'none', label: 'Above grade only' },
                    ]}
                  />
                  <SelectField
                    label="Air Tightness"
                    value={achTightness}
                    onChange={(value) => setAchTightness(value as ACHTightness)}
                    options={[
                      { value: 'new_tight', label: 'Very tight (0.35 ACH)' },
                      { value: 'new_standard', label: 'Standard new (0.5 ACH)' },
                      { value: 'retrofit_tight', label: 'Well-sealed existing (0.75 ACH)' },
                      { value: 'standard_existing', label: 'Average existing (1.25 ACH)' },
                      { value: 'leaky_old', label: 'Leaky/old (2.5 ACH)' },
                    ]}
                  />
                </div>
              )}
            </div>

            {/* Economic Inputs */}
            <div className="bg-white rounded-xl border border-surface-200 p-6">
              <h2 className="text-lg font-semibold text-surface-800 mb-4">Economic Inputs</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Electricity Rate"
                    value={electricityRate}
                    onChange={setElectricityRate}
                    prefix="$"
                    suffix="/kWh"
                    type="number"
                    min={0}
                    step={0.01}
                  />
                  <InputField
                    label={`Fuel Price (${fuelType === 'therms' ? 'per therm' : 'per gallon'})`}
                    value={fuelPrice}
                    onChange={setFuelPrice}
                    prefix="$"
                    type="number"
                    min={0}
                    step={0.01}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Hardware Cost"
                    value={hardwareCost}
                    onChange={setHardwareCost}
                    prefix="$"
                    type="number"
                    min={0}
                    helpText="Total system cost including installation"
                  />
                  <InputField
                    label="Pool Fee"
                    value={poolFee}
                    onChange={setPoolFee}
                    suffix="%"
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                  />
                </div>
                <InputField
                  label="Target Indoor Temperature"
                  value={targetTemp}
                  onChange={setTargetTemp}
                  suffix="°F"
                  type="number"
                  min={60}
                  max={80}
                />
              </div>

              {/* BTC Price Info */}
              <div className="mt-4 p-3 bg-surface-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  {loadingBtc ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                      <span className="text-surface-600">Loading BTC price...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-surface-600">
                        BTC: ${btcPrice?.toLocaleString() || '—'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6 lg:sticky lg:top-4 lg:self-start">
            {/* HLC Summary */}
            {hlcResult && (
              <div className="bg-white rounded-xl border border-surface-200 p-6">
                <h2 className="text-lg font-semibold text-surface-800 mb-4">
                  Heat Loss Coefficient
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <ResultCard
                    label="HLC (HDD-based)"
                    value={`${hlcResult.hlcHdd.toFixed(2)} kWh/°F-day`}
                    icon={<Thermometer className="w-5 h-5" />}
                  />
                  <ResultCard
                    label="HLC (Rate-based)"
                    value={`${(hlcResult.hlcRate * 1000).toFixed(0)} W/°F`}
                    icon={<Calculator className="w-5 h-5" />}
                  />
                  <ResultCard
                    label="Annual Heat Load"
                    value={`${(hlcResult.annualHeatKwh / 1000).toFixed(1)} MWh`}
                  />
                  <ResultCard
                    label="BTU/h/°F"
                    value={hlcResult.hlcBtu.toFixed(0)}
                    subValue="HVAC industry units"
                  />
                </div>
              </div>
            )}

            {/* Heat Load Chart */}
            {heatLoadProfile && (
              <HeatLoadChart monthlyHeatLoad={heatLoadProfile} />
            )}

            {/* Sizing Recommendation */}
            {sizingResult && (
              <div className="bg-white rounded-xl border border-surface-200 p-6">
                <h2 className="text-lg font-semibold text-surface-800 mb-4">
                  System Sizing
                </h2>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <ResultCard
                    label="Baseload Sizing"
                    value={`${sizingResult.requiredPowerKw.toFixed(1)} kW`}
                    subValue="Recommended"
                    variant="highlight"
                  />
                  {extremeSizingKw !== null && (
                    <ResultCard
                      label="Extreme Sizing"
                      value={`${extremeSizingKw.toFixed(1)} kW`}
                      subValue="Peak demand"
                    />
                  )}
                </div>
                <div className="p-3 bg-primary-50 rounded-lg">
                  <div className="text-sm font-medium text-primary-800">
                    Recommended Configuration
                  </div>
                  <div className="mt-1 text-primary-700">
                    {sizingResult.minerQuantity}× units @ {sizingResult.totalCapacityKw.toFixed(1)} kW total
                  </div>
                  <div className="mt-1 text-sm text-primary-600">
                    {sizingResult.totalHashrateTh.toFixed(0)} TH/s total hashrate
                  </div>
                  <div className="mt-1 text-sm text-primary-600">
                    Est. cost: ${sizingResult.totalCostUsd.toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* Duty Cycle Chart */}
            {monthlyDutyCycles && (
              <DutyCycleChart monthlyDutyCycles={monthlyDutyCycles} />
            )}

            {/* Economic Summary */}
            {economicsResult && (
              <EconomicsSummary result={economicsResult} />
            )}

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-2">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Disclaimer</p>
                  <p>
                    These calculations are estimates based on the inputs provided and current market
                    conditions. Actual performance may vary due to weather, building characteristics,
                    Bitcoin network changes, and other factors. This is not financial advice.
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
