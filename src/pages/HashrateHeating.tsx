import { useState, useMemo, useEffect } from 'react'
import { Flame, Zap, Info, Loader2, HelpCircle, TrendingUp, Percent, DollarSign, Thermometer, RefreshCw, Pencil, Gauge } from 'lucide-react'

import InputField from '../components/InputField'
import SelectField from '../components/SelectField'

import {
  calculateCOPe,
  calculateArbitrage,
  calculateNetworkMetrics,
  getMinerEfficiency,
  formatCOPe,
  DEFAULT_MINER,
  FUEL_SPECS,
  FuelType,
  MinerSpec,
  BTCMetrics,
} from '../calculations/hashrate'

import { getBitcoinPrice, getNetworkStats } from '../api/bitcoin'
import {
  STATES_LIST,
  getStatePrices,
  getDefaultFuelRate,
} from '../data/fuelPrices'

// Tooltip component
function Tooltip({ content }: { content: string }) {
  return (
    <div className="group relative inline-block">
      <HelpCircle className="w-4 h-4 text-surface-400 hover:text-surface-600 cursor-help" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-64 z-50">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-800" />
      </div>
    </div>
  )
}

// Metric card component
function MetricCard({
  label,
  value,
  subValue,
  secondaryValue,
  tertiaryValue,
  tooltip,
  variant = 'default',
  icon: Icon,
}: {
  label: string
  value: string
  subValue?: string
  secondaryValue?: string
  tertiaryValue?: string
  tooltip?: string
  variant?: 'default' | 'success' | 'warning' | 'highlight'
  icon?: React.ComponentType<{ className?: string }>
}) {
  const bgColors = {
    default: 'bg-white border-surface-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-red-50 border-red-200',
    highlight: 'bg-blue-50 border-blue-200',
  }

  const valueColors = {
    default: 'text-surface-900',
    success: 'text-green-700',
    warning: 'text-red-700',
    highlight: 'text-blue-700',
  }

  return (
    <div className={`rounded-xl border p-5 ${bgColors[variant]}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-surface-500" />}
          <span className="text-sm font-medium text-surface-600">{label}</span>
        </div>
        {tooltip && <Tooltip content={tooltip} />}
      </div>
      <div className={`text-2xl font-bold ${valueColors[variant]}`}>{value}</div>
      {secondaryValue && (
        <div className="text-lg font-semibold text-surface-700 mt-1">{secondaryValue}</div>
      )}
      {tertiaryValue && (
        <div className="text-base font-medium text-surface-600">{tertiaryValue}</div>
      )}
      {subValue && (
        <div className="text-xs text-surface-500 mt-2">{subValue}</div>
      )}
    </div>
  )
}

export default function HashrateHeating() {
  // ============================================================================
  // State
  // ============================================================================

  // Bitcoin data (from API)
  const [btcPrice, setBtcPrice] = useState<number | null>(null)
  const [networkHashrate, setNetworkHashrate] = useState<number | null>(null)
  const [difficulty, setDifficulty] = useState<number>(0)
  const [loadingBtc, setLoadingBtc] = useState(true)

  // Manual overrides for scenario exploration
  const [btcPriceOverride, setBtcPriceOverride] = useState<string>('')
  const [hashvalueOverride, setHashvalueOverride] = useState<string>('')

  // Miner inputs
  const [minerType, setMinerType] = useState('default') // 'default' or 'custom'
  const [minerPower, setMinerPower] = useState(DEFAULT_MINER.powerW.toString())
  const [minerHashrate, setMinerHashrate] = useState(DEFAULT_MINER.hashrateTH.toString())

  // Electricity inputs
  const [electricityRate, setElectricityRate] = useState('0.12')
  const [billAmount, setBillAmount] = useState('')
  const [billKwh, setBillKwh] = useState('')

  // Fuel inputs
  const [selectedState, setSelectedState] = useState<string>('')
  const [fuelType, setFuelType] = useState<FuelType>('propane')
  const [fuelRate, setFuelRate] = useState('2.75')
  const [fuelEfficiency, setFuelEfficiency] = useState('0.90') // AFUE as decimal or COP

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
        setDifficulty(statsData.difficulty)
      } catch (error) {
        console.error('Failed to fetch BTC data:', error)
        // Use fallbacks
        setBtcPrice(100000)
        setNetworkHashrate(700e6) // 700 EH/s in TH/s
        setDifficulty(100e12)
      } finally {
        setLoadingBtc(false)
      }
    }
    fetchBtcData()
  }, [])

  // Update fuel rate when state or fuel type changes
  useEffect(() => {
    const prices = getStatePrices(selectedState)
    const defaultRate = getDefaultFuelRate(fuelType, prices)
    setFuelRate(defaultRate.toFixed(2))
  }, [selectedState, fuelType])

  // Update fuel efficiency default when fuel type changes
  useEffect(() => {
    const defaultEfficiency = FUEL_SPECS[fuelType].typicalEfficiency
    // For AFUE fuels (< 1), show as percentage; for COP (heat pump), show as decimal
    if (fuelType === 'heat_pump') {
      setFuelEfficiency(defaultEfficiency.toFixed(1))
    } else {
      setFuelEfficiency((defaultEfficiency * 100).toFixed(0))
    }
  }, [fuelType])

  // Update electricity rate when state changes
  useEffect(() => {
    if (selectedState) {
      const prices = getStatePrices(selectedState)
      setElectricityRate(prices.electricity.toFixed(2))
    }
  }, [selectedState])

  // Calculate electricity rate from bill when both values entered
  useEffect(() => {
    const bill = parseFloat(billAmount)
    const kwh = parseFloat(billKwh)
    if (bill > 0 && kwh > 0) {
      const calculatedRate = bill / kwh
      setElectricityRate(calculatedRate.toFixed(3))
    }
  }, [billAmount, billKwh])

  // ============================================================================
  // Derived Values
  // ============================================================================

  // Handler for miner type selection
  const handleMinerTypeChange = (value: string) => {
    setMinerType(value)
    if (value === 'default') {
      // Reset to default miner values
      setMinerPower(DEFAULT_MINER.powerW.toString())
      setMinerHashrate(DEFAULT_MINER.hashrateTH.toString())
    } else if (value === 'custom') {
      // Clear values for custom input
      setMinerPower('')
      setMinerHashrate('')
    }
  }

  // Handler for power input - auto-switch to custom if different from default
  const handlePowerChange = (value: string) => {
    setMinerPower(value)
    const numValue = parseFloat(value)
    if (minerType === 'default' && numValue !== DEFAULT_MINER.powerW) {
      setMinerType('custom')
    }
  }

  // Handler for hashrate input - auto-switch to custom if different from default
  const handleHashrateChange = (value: string) => {
    setMinerHashrate(value)
    const numValue = parseFloat(value)
    if (minerType === 'default' && numValue !== DEFAULT_MINER.hashrateTH) {
      setMinerType('custom')
    }
  }

  const miner: MinerSpec = useMemo(() => {
    const power = parseFloat(minerPower) || DEFAULT_MINER.powerW
    const hashrate = parseFloat(minerHashrate) || DEFAULT_MINER.hashrateTH

    if (minerType === 'default') {
      return DEFAULT_MINER
    }
    return {
      name: 'Custom',
      powerW: power,
      hashrateTH: hashrate,
    }
  }, [minerType, minerPower, minerHashrate])

  // Check if user has any overrides active
  const hasOverrides = btcPriceOverride !== '' || hashvalueOverride !== ''

  // Calculate effective BTC price (override or API value)
  const effectiveBtcPrice = btcPriceOverride
    ? parseFloat(btcPriceOverride) || btcPrice
    : btcPrice

  // Calculate effective network hashrate
  // If hashvalue is overridden, back-calculate network hashrate from: hashvalue = (144 × blockReward × 1e8) / networkHashrate
  const effectiveNetworkHashrate = useMemo(() => {
    if (hashvalueOverride) {
      const hashval = parseFloat(hashvalueOverride)
      if (hashval > 0) {
        // networkHashrate = (144 × blockReward × 1e8) / hashvalue
        return (144 * 3.125 * 1e8) / hashval
      }
    }
    return networkHashrate
  }, [hashvalueOverride, networkHashrate])

  const btcMetrics: BTCMetrics | null = useMemo(() => {
    if (effectiveBtcPrice === null || effectiveNetworkHashrate === null) return null
    return {
      btcPrice: effectiveBtcPrice,
      networkHashrate: effectiveNetworkHashrate,
      blockReward: 3.125,
    }
  }, [effectiveBtcPrice, effectiveNetworkHashrate])

  const networkMetrics = useMemo(() => {
    if (!btcMetrics) return null
    return calculateNetworkMetrics(btcMetrics, difficulty)
  }, [btcMetrics, difficulty])

  const electricityRateNum = parseFloat(electricityRate) || 0.12
  const fuelRateNum = parseFloat(fuelRate) || 2.75

  // Convert efficiency input to decimal (AFUE is entered as %, COP as decimal)
  const fuelEfficiencyNum = fuelType === 'heat_pump'
    ? (parseFloat(fuelEfficiency) || 3.0)
    : (parseFloat(fuelEfficiency) || 90) / 100

  // Check if fuel type is electric-based (uses electricity rate instead of separate fuel rate)
  const isElectricFuel = fuelType === 'electric_resistance' || fuelType === 'heat_pump'

  // Check if fuel type needs an efficiency input (not electric resistance - always 100%)
  const hasEfficiencyInput = fuelType !== 'electric_resistance'

  // ============================================================================
  // Calculations
  // ============================================================================

  const copeResult = useMemo(() => {
    if (!btcMetrics) return null
    return calculateCOPe(electricityRateNum, miner, btcMetrics)
  }, [electricityRateNum, miner, btcMetrics])

  const arbitrageResult = useMemo(() => {
    if (!btcMetrics) return null
    // For electric fuel types, use the main electricity rate
    const effectiveFuelRate = isElectricFuel ? electricityRateNum : fuelRateNum
    return calculateArbitrage(fuelType, effectiveFuelRate, electricityRateNum, miner, btcMetrics, 1500, fuelEfficiencyNum)
  }, [fuelType, fuelRateNum, electricityRateNum, miner, btcMetrics, isElectricFuel, fuelEfficiencyNum])

  const minerEfficiency = getMinerEfficiency(miner)

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Hashrate Heating</h1>
        <p className="text-surface-600 mt-1">
          Calculate the economic efficiency of heating with Bitcoin miners
        </p>
      </div>

      {/* Bitcoin Data Header */}
      <div className="bg-white rounded-xl border border-surface-200 p-4">
        {loadingBtc ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
            <span className="text-surface-600">Loading Bitcoin network data...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Override indicator and reset button */}
            {hasOverrides && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-600 font-medium flex items-center gap-1">
                  <Pencil className="w-3 h-3" />
                  Custom scenario mode
                </span>
                <button
                  onClick={() => {
                    setBtcPriceOverride('')
                    setHashvalueOverride('')
                  }}
                  className="flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset to live data
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* BTC Price - Editable */}
              <div className="text-center">
                <div className="text-xs text-surface-500 uppercase tracking-wide mb-1 flex items-center justify-center gap-1">
                  BTC Price
                  {btcPriceOverride && <Pencil className="w-2.5 h-2.5 text-amber-500" />}
                </div>
                <div className="relative inline-block">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-surface-500 text-sm">$</span>
                  <input
                    type="number"
                    value={btcPriceOverride || btcPrice?.toString() || ''}
                    onChange={(e) => setBtcPriceOverride(e.target.value)}
                    className={`w-32 text-lg font-bold text-center py-1 pl-5 pr-2 rounded border ${
                      btcPriceOverride
                        ? 'border-amber-300 bg-amber-50 text-amber-700'
                        : 'border-transparent hover:border-surface-300 text-surface-900'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
                    placeholder={btcPrice?.toString()}
                  />
                </div>
              </div>
              {/* Hashvalue - Editable */}
              <div className="text-center">
                <div className="text-xs text-surface-500 uppercase tracking-wide mb-1 flex items-center justify-center gap-1">
                  Hashvalue
                  {hashvalueOverride && <Pencil className="w-2.5 h-2.5 text-amber-500" />}
                </div>
                <div className="flex items-center justify-center gap-1">
                  <input
                    type="number"
                    value={hashvalueOverride || networkMetrics?.hashvalue.toFixed(2) || ''}
                    onChange={(e) => setHashvalueOverride(e.target.value)}
                    step="0.01"
                    className={`w-20 text-lg font-bold text-center py-1 px-2 rounded border ${
                      hashvalueOverride
                        ? 'border-amber-300 bg-amber-50 text-amber-700'
                        : 'border-transparent hover:border-surface-300 text-orange-600'
                    } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
                    placeholder={networkMetrics?.hashvalue.toFixed(2)}
                  />
                  <span className="text-sm font-normal text-surface-600">sats/TH/day</span>
                </div>
              </div>
              {/* Hashprice - Calculated (not editable) */}
              <div className="text-center">
                <div className="text-xs text-surface-500 uppercase tracking-wide mb-1">Hashprice</div>
                <div className="text-lg font-bold text-green-600">
                  ${networkMetrics?.hashprice.toFixed(4)} <span className="text-sm font-normal">/TH/day</span>
                </div>
              </div>
              {/* Network Hashrate - Derived when hashvalue is overridden */}
              <div className="text-center">
                <div className="text-xs text-surface-500 uppercase tracking-wide mb-1 flex items-center justify-center gap-1">
                  Network
                  {hashvalueOverride && <span className="text-amber-500 text-[10px]">(implied)</span>}
                </div>
                <div className="text-lg font-bold text-surface-700">
                  {networkMetrics?.networkHashrateEH.toFixed(0)} <span className="text-sm font-normal">EH/s</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Strip */}
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Miner Selection */}
          <div>
            <h3 className="text-sm font-semibold text-surface-700 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary-500" />
              Miner
            </h3>
            <SelectField
              label="Select Miner"
              value={minerType}
              onChange={handleMinerTypeChange}
              options={[
                { value: 'default', label: `${DEFAULT_MINER.name}` },
                { value: 'custom', label: 'Custom Miner' },
              ]}
            />
            <div className="mt-3 p-3 bg-surface-50 rounded-lg space-y-2">
              <div className="text-xs text-surface-600 mb-2">
                {minerType === 'custom' ? 'Enter specs:' : 'Adjust specs:'}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <InputField
                  label="Power"
                  value={minerPower}
                  onChange={handlePowerChange}
                  suffix="W"
                  type="number"
                  min={100}
                  max={15000}
                  placeholder={DEFAULT_MINER.powerW.toString()}
                />
                <InputField
                  label="Hashrate"
                  value={minerHashrate}
                  onChange={handleHashrateChange}
                  suffix="TH/s"
                  type="number"
                  min={1}
                  max={1000}
                  placeholder={DEFAULT_MINER.hashrateTH.toString()}
                />
              </div>
              <div className="text-xs text-surface-500 pt-1">
                Efficiency: {minerEfficiency.toFixed(1)} J/TH
              </div>
            </div>
          </div>

          {/* Electricity Rate */}
          <div>
            <h3 className="text-sm font-semibold text-surface-700 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary-500" />
              Electricity
            </h3>
            <InputField
              label="Rate"
              value={electricityRate}
              onChange={setElectricityRate}
              prefix="$"
              suffix="/kWh"
              type="number"
              min={0}
              max={1}
              step={0.001}
              tooltip="Find your rate on your electric bill. Look for 'Price per kWh' or divide your total bill by kWh used. Include all charges (delivery, supply, taxes) for your true all-in rate. Or use the bill calculator below."
            />
            <div className="mt-3 p-3 bg-surface-50 rounded-lg">
              <div className="text-xs text-surface-600 mb-2">Calculate from bill:</div>
              <div className="grid grid-cols-2 gap-2">
                <InputField
                  label="Bill"
                  value={billAmount}
                  onChange={setBillAmount}
                  prefix="$"
                  type="number"
                  min={0}
                />
                <InputField
                  label="kWh"
                  value={billKwh}
                  onChange={setBillKwh}
                  suffix="kWh"
                  type="number"
                  min={0}
                />
              </div>
            </div>
          </div>

          {/* Fuel Type & Rate */}
          <div>
            <h3 className="text-sm font-semibold text-surface-700 mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Compare to Fuel
            </h3>
            <SelectField
              label="Fuel Type"
              value={fuelType}
              onChange={(value) => setFuelType(value as FuelType)}
              options={Object.entries(FUEL_SPECS).map(([key, spec]) => ({
                value: key,
                label: spec.label,
              }))}
            />
            {/* Show rate input only for non-electric fuel types */}
            {!isElectricFuel && (
              <div className="mt-3">
                <InputField
                  label="Rate"
                  value={fuelRate}
                  onChange={setFuelRate}
                  prefix="$"
                  suffix={`/${FUEL_SPECS[fuelType].unit}`}
                  type="number"
                  min={0}
                  step={0.01}
                  tooltip={
                    fuelType === 'natural_gas'
                      ? "Find your rate on your gas bill under 'Price per therm' or 'Cost per CCF' (1 CCF ≈ 1.037 therms). Include delivery charges for total cost."
                      : fuelType === 'propane'
                      ? "Check your propane delivery receipt or contact your supplier. Prices vary seasonally — use your average annual rate for best accuracy."
                      : "Find your rate on your heating oil delivery receipt. Prices vary seasonally — use your average annual rate for best accuracy."
                  }
                />
              </div>
            )}
            {/* Show efficiency input for fuels that have it (not electric resistance) */}
            {hasEfficiencyInput && (
              <div className="mt-3">
                <InputField
                  label={fuelType === 'heat_pump' ? 'COP' : 'AFUE'}
                  value={fuelEfficiency}
                  onChange={setFuelEfficiency}
                  suffix={fuelType === 'heat_pump' ? '' : '%'}
                  type="number"
                  min={fuelType === 'heat_pump' ? 1 : 50}
                  max={fuelType === 'heat_pump' ? 6 : 100}
                  step={fuelType === 'heat_pump' ? 0.1 : 1}
                  tooltip={
                    fuelType === 'heat_pump'
                      ? "COP (Coefficient of Performance) measures heat output vs electricity input. A COP of 3.0 means 3 kWh of heat per 1 kWh of electricity. Find your unit's COP on its spec sheet or EnergyGuide label. COP varies with outdoor temperature — use your seasonal average."
                      : "AFUE (Annual Fuel Utilization Efficiency) measures what percentage of fuel becomes heat. Find it on your furnace/boiler's yellow EnergyGuide label or spec plate. Modern gas furnaces: 90-98%. Older units: 56-70%. Boilers: 80-95%."
                  }
                />
              </div>
            )}
            {/* Info message for electric fuel types */}
            {fuelType === 'electric_resistance' && (
              <div className="mt-3 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
                Uses your ${electricityRateNum.toFixed(2)}/kWh rate at 100% efficiency
              </div>
            )}
            {fuelType === 'heat_pump' && (
              <div className="mt-3 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
                Effective rate: ${(electricityRateNum / fuelEfficiencyNum).toFixed(3)}/kWh
              </div>
            )}
          </div>

          {/* State Selection */}
          <div>
            <h3 className="text-sm font-semibold text-surface-700 mb-3 flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-blue-500" />
              Your Region
            </h3>
            <SelectField
              label="State/Region"
              value={selectedState}
              onChange={setSelectedState}
              options={[
                { value: '', label: 'US National Average' },
                ...STATES_LIST.map((state) => ({
                  value: state.abbr,
                  label: state.name,
                })),
              ]}
            />
            {selectedState && (
              <div className="mt-2 text-xs text-surface-500">
                Avg. electricity: ${getStatePrices(selectedState).electricity.toFixed(2)}/kWh
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {copeResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Effective Heat Cost */}
          <MetricCard
            icon={DollarSign}
            label="Effective Heat Cost"
            value={`$${copeResult.effectiveCostPerKwh.toFixed(3)}/kWh`}
            secondaryValue={`$${copeResult.effectiveCostPerMMBTU.toFixed(2)}/MMBTU`}
            tertiaryValue={`$${copeResult.effectiveCostPerTherm.toFixed(2)}/therm`}
            tooltip="Your net cost per unit of heat after Bitcoin mining revenue offset. Formula: (Daily Electricity Cost - Daily Mining Revenue) / Daily kWh. Negative values mean you're being paid to heat. Conversions: $/MMBTU = $/kWh × 293.07, $/therm = $/kWh × 29.307. Compare these rates directly to your utility bills for natural gas, propane, or heating oil."
            variant={copeResult.effectiveCostPerKwh <= 0 ? 'success' : 'default'}
          />

          {/* COPe */}
          <MetricCard
            icon={TrendingUp}
            label="COPe (Economic COP)"
            value={formatCOPe(copeResult.COPe)}
            subValue="Compare to heat pump COP of 2.5-4.0"
            tooltip="COPe (Coefficient of Performance - Economic) measures heating efficiency through economics rather than thermodynamics. Formula: COPe = 1/(1-R), where R = mining revenue / electricity cost. A COPe of 3.0 means you get the same economic benefit as a heat pump with COP 3.0 — both give you 3 units of 'value' per unit of electricity. Heat pump COP varies with outdoor temp; COPe varies with BTC price and network hashrate. Higher is better. Infinity = free heating."
            variant={copeResult.COPe >= 3 ? 'success' : copeResult.COPe >= 2 ? 'highlight' : 'default'}
          />

          {/* Heating Subsidy */}
          <MetricCard
            icon={Percent}
            label="Heating Subsidy"
            value={`${Math.round(copeResult.R * 100)}%`}
            subValue="Of electric heating cost paid by mining"
            tooltip="The percentage of your electricity cost offset by mining revenue. Formula: R = (Daily Mining Revenue / Daily Electricity Cost) × 100. At 50%, mining pays half your electric bill. At 100%, heating is free. Above 100%, you're profiting while heating. This is the 'R' value used in the COPe formula."
            variant={copeResult.R >= 1 ? 'success' : copeResult.R >= 0.5 ? 'highlight' : 'default'}
          />

          {/* Savings vs Fuel */}
          {arbitrageResult && (
            <MetricCard
              icon={Flame}
              label={`Savings vs ${FUEL_SPECS[fuelType].label}`}
              value={`${arbitrageResult.savingsPercent >= 0 ? '+' : ''}${arbitrageResult.savingsPercent.toFixed(0)}%`}
              subValue={`${FUEL_SPECS[fuelType].label}: $${arbitrageResult.traditionalCostPerKwh.toFixed(3)}/kWh`}
              tooltip="Percentage savings vs your selected fuel. Formula: ((Traditional $/kWh - Hashrate $/kWh) / Traditional $/kWh) × 100. Traditional fuel cost accounts for efficiency (AFUE for gas/oil, COP for heat pumps). Positive = you save money with hashrate heating. Negative = traditional fuel is cheaper at current BTC economics."
              variant={arbitrageResult.savingsPercent > 50 ? 'success' : arbitrageResult.savingsPercent > 0 ? 'highlight' : 'warning'}
            />
          )}

          {/* Break-even Rate */}
          <MetricCard
            icon={Zap}
            label="Break-even Rate"
            value={`$${copeResult.breakevenRate.toFixed(3)}/kWh`}
            subValue="Free heating & profitable mining below this rate"
            tooltip="The maximum electricity rate for free heating. Formula: (Daily BTC Mined × BTC Price) / Daily kWh. At this rate, R = 100% and COPe = ∞. Below this rate, you profit while heating. This rate changes with BTC price and network hashrate — lock in low electricity rates to maintain profitability through market cycles."
            variant="default"
          />

          {/* Heating Power */}
          <MetricCard
            icon={Gauge}
            label="Heating Power"
            value={`${(miner.powerW / 1000).toFixed(1)} kW`}
            secondaryValue={`${(miner.powerW * 3.412).toLocaleString(undefined, { maximumFractionDigits: 0 })} BTU/h`}
            tertiaryValue={`${((miner.powerW * 3.412) / 12000).toFixed(2)} tons`}
            tooltip="Thermal output of your miner. Bitcoin miners convert 100% of electrical power to heat. Conversions: 1 W = 3.412 BTU/h, 1 ton = 12,000 BTU/h. Compare to furnace capacity (40,000-120,000 BTU/h typical) or room heaters (5,000-10,000 BTU/h). A 5kW miner provides ~17,000 BTU/h — enough to heat a large room or small home in moderate climates."
            variant="default"
          />
        </div>
      )}

      {/* Status Banner */}
      {copeResult && (() => {
        // Determine status based on savings vs traditional fuel
        // profitable: R >= 1 (free/paid heating)
        // subsidized: savingsPercent > 0 (hashrate heating is cheaper than traditional fuel)
        // loss: savingsPercent <= 0 (traditional fuel is cheaper - keep current heating)
        const displayStatus = copeResult.R >= 1
          ? 'profitable'
          : (arbitrageResult && arbitrageResult.savingsPercent > 0)
            ? 'subsidized'
            : 'loss'

        return (
          <div className={`rounded-xl p-4 ${
            displayStatus === 'profitable'
              ? 'bg-green-50 border border-green-200'
              : displayStatus === 'subsidized'
              ? 'bg-blue-50 border border-blue-200'
              : 'bg-amber-50 border border-amber-200'
          }`}>
            {displayStatus === 'profitable' && (
              <div className="flex items-center gap-3 text-green-800">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold">Free or Paid Heating!</div>
                  <div className="text-sm">Mining revenue exceeds electricity costs. You&apos;re effectively being paid to heat.</div>
                </div>
              </div>
            )}
            {displayStatus === 'subsidized' && (
              <div className="flex items-center gap-3 text-blue-800">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold">Hashrate Heating Recommended</div>
                  <div className="text-sm">{arbitrageResult ? `${arbitrageResult.savingsPercent.toFixed(0)}% savings` : 'Savings'} vs {FUEL_SPECS[fuelType].label}. Mining offsets {(copeResult.R * 100).toFixed(0)}% of your electricity cost.</div>
                </div>
              </div>
            )}
            {displayStatus === 'loss' && (
              <div className="flex items-center gap-3 text-amber-800">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold">Keep Current Heating</div>
                  <div className="text-sm">{FUEL_SPECS[fuelType].label} is {arbitrageResult ? `${Math.abs(arbitrageResult.savingsPercent).toFixed(0)}% cheaper` : 'cheaper'} than hashrate heating at current rates. Mining still offsets {(copeResult.R * 100).toFixed(0)}% of electricity.</div>
                </div>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
