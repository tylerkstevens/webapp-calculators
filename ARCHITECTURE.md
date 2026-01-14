# Exergy Heat Calculator Web App - Architecture Document

**Version:** 1.3
**Last Updated:** 2026-01-13
**Status:** Production (All Phases Complete)
**Reference:** [SPEC.md](./SPEC.md)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Component Architecture](#component-architecture)
4. [Data Flow](#data-flow)
5. [State Management](#state-management)
6. [Calculation Engine](#calculation-engine)
7. [API Integration Layer](#api-integration-layer)
8. [UI Component System](#ui-component-system)
9. [Key Design Decisions](#key-design-decisions)
10. [File Structure](#file-structure)
11. [Implementation Roadmap](#implementation-roadmap)
12. [Testing Architecture](#testing-architecture)

---

## System Overview

### Purpose
A React-based web application providing financial analysis calculators for bitcoin mining integrated with renewable energy and heating systems. The app helps users make data-driven decisions about solar mining and hashrate heating economics.

### Core Principles

1. **Pure Function Calculations** - All calculation logic isolated in pure functions for testability and reliability
2. **Component Composition** - Reusable UI components with consistent patterns
3. **API Resilience** - Graceful degradation with fallback data when external APIs fail
4. **User-Centric UX** - Comprehensive tooltips, clear error messages, guided workflows
5. **Brand Consistency** - Matches exergyheat.com design system throughout

### Technology Stack

```
Frontend Framework:    React 18 + TypeScript
Build Tool:           Vite 5
Styling:              Tailwind CSS 3.x
Routing:              React Router v7
State:                React Hooks (useState, useMemo, useEffect)
Charts:               Recharts + Custom SVG
Icons:                Lucide React
HTTP Client:          Axios
PDF Generation:       Custom implementation
Testing:              Vitest
```

### Deployment Context
- **Domain**: calc.exergyheat.com (subdomain of main website)
- **Hosting**: [To be documented]
- **Environment Variables**: NREL API key, build-time configuration

---

## Architecture Diagram

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              React Application (SPA)                     │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │   │
│  │  │   Router    │  │    Pages     │  │   Components  │  │   │
│  │  │  (Routes)   │→ │  Calculators │→ │  (UI Layer)   │  │   │
│  │  └─────────────┘  └──────────────┘  └───────────────┘  │   │
│  │                           ↓                ↓              │   │
│  │                    ┌─────────────┐  ┌──────────────┐    │   │
│  │                    │ Calculation │  │  State Mgmt  │    │   │
│  │                    │   Engine    │←→│ (React Hooks)│    │   │
│  │                    └─────────────┘  └──────────────┘    │   │
│  │                           ↓                               │   │
│  │                    ┌─────────────┐                       │   │
│  │                    │  API Layer  │                       │   │
│  │                    └─────────────┘                       │   │
│  └──────────────────────────┼───────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                ┌───────────┴────────────┐
                │                        │
        ┌───────▼──────┐         ┌──────▼────────┐
        │   CoinGecko  │         │  NREL PVWatts │
        │ (BTC Price)  │         │ (Solar Data)  │
        └──────────────┘         └───────────────┘
                │                        │
        ┌───────▼──────┐         ┌──────▼────────┐
        │Mempool.space │         │  Zippopotam   │
        │(Hashrate+Fee)│         │  (Geocoding)  │
        └──────────────┘         └───────────────┘
```

### Calculator Page Architecture

```
┌─────────────────────────────────────────────────────────┐
│          Calculator Page Component                       │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Bitcoin Network Data Section                    │   │
│  │  (Three-Knob Override System)                    │   │
│  │  - Live API data with manual override controls   │   │
│  │  - Fee % slider for transaction fee modeling     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Input Section                                    │   │
│  │  - Mode selector / Card layout                    │   │
│  │  - Form inputs with validation                    │   │
│  │  - Tooltips and help text                         │   │
│  └─────────────────────────────────────────────────┘   │
│                       ↓                                   │
│              [useMemo calculations]                       │
│                       ↓                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Results Section                                  │   │
│  │  - Metric cards                                   │   │
│  │  - Charts (interactive)                           │   │
│  │  - Comparison displays                            │   │
│  │  - PDF export button                              │   │
│  └─────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Layer Structure

```
┌──────────────────────────────────────────────────────────┐
│ Layer 1: Pages (Feature Components)                      │
│ - SolarMonetization.tsx                                  │
│ - HashrateHeating.tsx                                    │
│ - Home.tsx                                               │
│ Role: Orchestrate business logic, state, calculations   │
└────────────────┬─────────────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────────────┐
│ Layer 2: Shared UI Components                            │
│ - InputField, SelectField, SmartTooltip                  │
│ - PdfReportButton, StateHeatMap                          │
│ - Layout wrapper                                         │
│ Role: Reusable presentation components                  │
└────────────────┬─────────────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────────────┐
│ Layer 3: Calculation Engine (Pure Functions)             │
│ - calculations/solar.ts                                  │
│ - calculations/hashrate.ts                               │
│ Role: Pure calculation logic, testable                  │
└────────────────┬─────────────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────────────┐
│ Layer 4: API Integration                                 │
│ - api/bitcoin.ts (CoinGecko price, Mempool hashrate+fees)│
│ - api/solar.ts (NREL, Zippopotam)                        │
│ Role: External data fetching with error handling        │
└──────────────────────────────────────────────────────────┘
```

### Component Responsibilities

#### Page Components (Stateful Orchestrators)

**SolarMonetization.tsx**
- **State**: User inputs, API data, mode selection, overrides
- **Effects**: Fetch BTC data on mount, fetch solar data on ZIP change (debounced)
- **Derived State**: useMemo for calculations, monthly distributions
- **Responsibilities**:
  - Manage three input modes (Estimate, Production, Excess)
  - Coordinate API calls
  - Execute calculation pipeline
  - Render results and charts
  - Generate PDF report data

**HashrateHeating.tsx**
- **State**: User inputs, API data, location/region, fuel settings, overrides
- **Effects**: Fetch BTC data on mount
- **Derived State**: useMemo for COPe, arbitrage, chart data
- **Responsibilities**:
  - Manage input cards (Location, Electricity, Fuel, Miner)
  - Execute COPe calculation pipeline
  - Render interactive charts with variable X-axis
  - Generate state heat map data
  - Generate PDF report data

**Home.tsx**
- **Responsibilities**:
  - Display calculator selection cards
  - Provide overview descriptions
  - Route to calculator pages

#### Shared Components (Stateless Presentational)

**InputField**
```typescript
interface InputFieldProps {
  label: string
  type: 'text' | 'number' | 'email'
  value: string
  onChange: (value: string) => void
  prefix?: string          // e.g., "$"
  suffix?: string          // e.g., "/kWh"
  placeholder?: string
  tooltip?: string         // Tooltip content
  helpText?: string        // Additional help text
  error?: string           // Error message
}
```

**SelectField**
```typescript
interface SelectFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  tooltip?: string
}
```

**SmartTooltip**
```typescript
interface SmartTooltipProps {
  content: string          // 2-3 sentence explanation
  position?: 'top' | 'bottom' | 'left' | 'right'
}
```

**PdfReportButton**
```typescript
interface PdfReportButtonProps {
  reportType: 'solar' | 'hashrate'
  reportData: SolarMiningReportData | HashrateHeatingReportData | null
  filename: string
}
```

---

## Data Flow

### Solar Monetization Calculator Flow

```
User Input
    │
    ├─► ZIP Code Change
    │       └─► Debounce (500ms)
    │           └─► Zippopotam API (ZIP → lat/lon)
    │               └─► NREL PVWatts API (lat/lon, systemKw → solar estimate)
    │                   └─► Update solarEstimate state
    │
    ├─► Mode Selection
    │       └─► Update inputMode state
    │           └─► Show/hide relevant input fields
    │
    └─► Input Changes (Production, Miner, Overrides)
            └─► Update input state
                └─► useMemo recalculates
                    ├─► Monthly distribution (if needed)
                    ├─► Mining revenue calculation
                    ├─► Net metering comparison (if Excess mode)
                    └─► Update results display

BTC Network Data (on mount)
    └─► CoinGecko API (price) + Mempool.space (hashrate, fees)
        └─► btcPrice, networkHashrate, hashvalue, hashprice, feePercent
            └─► Update bitcoinData state
                └─► Enable override controls
                    └─► Three-knob system calculations
```

### Hashrate Heating Calculator Flow

```
User Input
    │
    ├─► Location Change (Country/Region)
    │       └─► Update selectedCountry, selectedRegion state
    │           └─► Auto-populate regional defaults
    │
    ├─► Fuel Type Change
    │       └─► Update fuelType state
    │           └─► Update fuel unit display
    │               └─► Reset fuel efficiency to default
    │
    └─► Input Changes (Electricity, Fuel, Miner, Overrides)
            └─► Update input state
                └─► useMemo recalculates
                    ├─► COPe calculation
                    ├─► Arbitrage/savings calculation
                    ├─► Chart data generation
                    │   └─► Variable X-axis data points
                    └─► Update results display

BTC Network Data (on mount)
    └─► CoinGecko API (price) + Mempool.space (hashrate, fees)
        └─► btcPrice, networkHashrate, hashvalue, hashprice, feePercent
            └─► Update bitcoinData state
                └─► Enable override controls
```

### Three-Knob Override System (Both Calculators)

```
Knob 1: Price Group
    ├─► User edits BTC Price
    │       └─► Clear hashpriceOverride
    │           └─► Calculate implied hashprice from (hashvalue × btcPrice / 1e8)
    │
    └─► User edits Hashprice
            └─► Clear btcPriceOverride
                └─► Calculate implied btcPrice from (hashprice × 1e8 / hashvalue)

Knob 2: Network Group (Hashvalue ↔ Network Hashrate)
    ├─► User edits Network Hashrate
    │       └─► Clear hashvalueOverride
    │           └─► Recalculate implied hashvalue (holding Fee % constant)
    │
    └─► User edits Hashvalue
            └─► Clear networkHashrateOverride
                └─► Recalculate implied network hashrate (holding Fee % constant)

Knob 3: Fee Slider
    └─► User adjusts Fee %
            └─► Clear hashvalueOverride
                └─► Recalculate implied hashvalue (holding Network Hashrate constant)
                    └─► Formula: hashvalue = (subsidy × 144 × 1e8 / (1 - feePercent/100)) / hashrate

Key Principle:
    - Fee % is the "anchor" - NEVER implied from other values
    - Fee % is only live (from API) or user-set
    - Only Hashvalue and Network Hashrate can be derived/implied
    - Block subsidy calculated from block height (auto-halving support)
```

---

## State Management

### Pattern: Component-Local State with React Hooks

**Why this approach:**
- Calculators are independent (no shared state needed)
- Simple to reason about
- No boilerplate of global state library
- Performance optimized with useMemo

### State Categories

#### 1. User Input State (useState)
```typescript
// Example from SolarMonetization
const [zipCode, setZipCode] = useState('')
const [systemSizeKw, setSystemSizeKw] = useState('10')
const [minerType, setMinerType] = useState('Custom')
const [inputMode, setInputMode] = useState<InputMode>('estimate')
```

#### 2. API Data State (useState)
```typescript
const [bitcoinData, setBitcoinData] = useState<BitcoinMetrics | null>(null)
const [solarEstimate, setSolarEstimate] = useState<SolarEstimate | null>(null)
const [loadingBtc, setLoadingBtc] = useState(true)
const [loadingSolar, setLoadingSolar] = useState(false)
```

#### 3. Override State (useState)
```typescript
// Price group
const [btcPriceOverride, setBtcPriceOverride] = useState<string>('')
const [hashpriceOverride, setHashpriceOverride] = useState<string>('')

// Network group
const [hashvalueOverride, setHashvalueOverride] = useState<string>('')
const [networkHashrateOverride, setNetworkHashrateOverride] = useState<string>('')

// Fee slider (NEW)
const [feeOverride, setFeeOverride] = useState<string>('')  // '' = use live data
```

#### 4. Derived State (useMemo)
```typescript
// Calculation results - recomputed when dependencies change
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
```

### State Update Patterns

**Synchronous Updates**
```typescript
// Direct state updates for user input
const handleSystemSizeChange = (value: string) => {
  setSystemSizeKw(value)  // Triggers useMemo recalculations
}
```

**Asynchronous Updates** (API Calls)
```typescript
useEffect(() => {
  async function fetchBtcData() {
    setLoadingBtc(true)
    try {
      const data = await getBitcoinMetrics()
      setBitcoinData(data)
    } catch (error) {
      console.error('Error fetching BTC data:', error)
    } finally {
      setLoadingBtc(false)
    }
  }
  fetchBtcData()
}, [])  // Only on mount
```

**Debounced Updates** (ZIP Code)
```typescript
useEffect(() => {
  if (zipCode.length < 5 || inputMode !== 'estimate') return

  const timer = setTimeout(async () => {
    setLoadingSolar(true)
    try {
      const estimate = await getSolarEstimate(zipCode, systemKw)
      setSolarEstimate(estimate)
    } catch (error) {
      console.error('Error fetching solar estimate:', error)
    } finally {
      setLoadingSolar(false)
    }
  }, 500)

  return () => clearTimeout(timer)
}, [zipCode, systemSizeKw, inputMode])
```

---

## Calculation Engine

### Design Principles

1. **Pure Functions** - No side effects, deterministic outputs
2. **Single Responsibility** - Each function does one calculation
3. **Type Safety** - Full TypeScript interfaces for inputs/outputs
4. **Testability** - Easy to unit test with known inputs
5. **Separation** - Calculation logic isolated from UI concerns

### Solar Calculation Pipeline

```
Input Parameters (monthlyKwh[], miner, hashvalueSats, btcPrice)
    ↓
┌────────────────────────────────────────┐
│ 1. Monthly Distribution (if needed)    │
│    - Annual → Monthly using NREL ratios│
│    - Or generic seasonal factors       │
└────────────┬───────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│ 2. Calculate Miner Efficiency          │
│    efficiency_J_TH = powerW / hashrateTH│
└────────────┬───────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│ 3. For Each Month: kWh → BTC           │
│    avg_power_W = (kWh × 1000) / hours  │
│    avg_hashrate = avg_power / efficiency│
│    sats = hashrate × hashvalue × days  │
│    btc = sats / 1e8                    │
└────────────┬───────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│ 4. BTC to USD Conversion               │
│    monthly_usd = monthly_btc × btcPrice│
│    annual_usd = sum(monthly_usd)       │
└────────────┬───────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│ 5. Per-kWh Metrics                     │
│    revenue_per_kwh = annual_usd / kWh  │
│    sats_per_kwh = (btc × 1e8) / kWh    │
└────────────┬───────────────────────────┘
             ↓
     SolarMiningResult

Key Insight: Only miner efficiency matters (J/TH)
             Revenue is proportional to kWh
```

### Hashrate Heating Calculation Pipeline

```
Input Parameters
    ↓
┌────────────────────────────────────────┐
│ 1. Daily Mining Revenue                │
│    daily_btc = hashrate_share × blocks │
│    daily_revenue = daily_btc × price   │
└────────────┬───────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│ 2. Daily Electricity Cost              │
│    daily_kwh = (power_W / 1000) × 24   │
│    daily_cost = daily_kwh × elec_rate  │
└────────────┬───────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│ 3. Revenue Ratio (R)                   │
│    R = daily_revenue / daily_cost      │
└────────────┬───────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│ 4. COPe Calculation                    │
│    COPe = 1 / (1 - R)                  │
│    Special: R >= 1 → COPe = ∞          │
└────────────┬───────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│ 5. Effective Heating Cost              │
│    cost_per_kwh = (cost - revenue) / kWh│
│    cost_per_mmbtu = cost × conversion  │
└────────────┬───────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│ 6. Arbitrage vs Traditional Fuel      │
│    traditional_cost = fuel_calc        │
│    savings_% = comparison              │
└────────────┬───────────────────────────┘
             ↓
       COPeResult
```

### Key Calculation Functions

**src/calculations/solar.ts**
```typescript
// Core function: Calculate BTC from kWh using rate-based formula
export function calculateBtcFromKwh(
  kwh: number,
  efficiencyJTH: number,
  hashvalueSats: number,
  days: number
): number

// Main solar mining calculation
export function calculateSolarMining(
  annualProductionKwh: number,
  monthlyProductionKwh: number[],
  miner: MinerSpec,
  hashvalueSats: number,
  btcPrice: number
): SolarMiningResult

// Net metering comparison
export function calculateNetMeteringComparison(
  excessKwh: number,
  netMeteringRate: number,
  miner: MinerSpec,
  hashvalueSats: number,
  btcPrice: number
): NetMeteringComparison

// Monthly excess energy mining (for excess mode chart)
export function calculateMonthlyExcessMining(
  monthlyExportKwh: number[],
  miner: MinerSpec,
  hashvalueSats: number,
  btcPrice: number
): { monthlyBtc: number[], monthlyUsd: number[] }
```

**src/calculations/hashrate.ts**
```typescript
// COPe calculation
export function calculateCOPe(
  electricityRate: number,
  miner: MinerSpec,
  btcMetrics: BTCMetrics
): COPeResult

// Arbitrage/savings calculation
export function calculateArbitrage(
  fuelType: FuelType,
  fuelRate: number,
  electricityRate: number,
  miner: MinerSpec,
  btcMetrics: BTCMetrics,
  monthlyHeatKwh?: number,
  fuelEfficiency?: number
): ArbitrageResult

// Network metrics from API data
export function calculateNetworkMetrics(
  btcMetrics: BTCMetrics,
  difficulty?: number
): NetworkMetrics

// Hashvalue: sats/TH/day
export function calculateHashvalue(
  networkHashrateTH: number,
  blockReward: number
): number

// Hashprice: $/TH/day
export function calculateHashprice(
  hashvalue: number,
  btcPrice: number
): number
```

---

## API Integration Layer

### Design Patterns

**Resilience**
- Try/catch error handling
- Fallback data for all APIs
- User-friendly error messages
- Graceful degradation

**Performance**
- Debouncing for frequent calls (ZIP code)
- Caching where appropriate
- Minimal re-fetching

### API Modules

**src/api/bitcoin.ts**

```typescript
// Bitcoin Metrics - Fetches from CoinGecko (price) + Mempool.space (hashrate, fees)
export async function getBitcoinMetrics(): Promise<BitcoinMetrics> {
  try {
    // Price from CoinGecko, hashrate + fees from Mempool.space
    return {
      btcPrice: response.data.price,
      networkHashrate: response.data.hashrate,
      hashvalue: response.data.hashvalue,  // Includes transaction fees
      hashprice: response.data.hashprice,
      difficulty: response.data.difficulty
    }
  } catch (error) {
    console.error('Bitcoin metrics API error:', error)
    throw error  // Let component handle with loading state
  }
}

// Mempool.space - Transaction fee data (for overrides)
export async function getAverageFeeRate(): Promise<number> {
  // Fetch 30-day average transaction fee rate
  // Used for override calculations to maintain realistic hashvalue
}
```

**src/api/solar.ts**

```typescript
// Zippopotam - ZIP code geocoding (free, no API key)
async function geocodeZipCode(zipCode: string): Promise<GeocodingResult | null> {
  try {
    const response = await axios.get(`https://api.zippopotam.us/us/${zipCode}`)
    const place = response.data.places[0]
    return {
      lat: parseFloat(place.latitude),
      lon: parseFloat(place.longitude),
      city: place['place name'],
      state: place['state abbreviation']
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

// NREL PVWatts - Solar production estimates
export async function getSolarEstimate(
  zipCode: string,
  systemCapacityKw: number,
  options?: Partial<SystemParams>
): Promise<SolarEstimate> {
  const API_KEY = import.meta.env.VITE_NREL_API_KEY

  if (!API_KEY) {
    console.warn('NREL API key not configured')
    return fallbackEstimate(systemCapacityKw)
  }

  // Step 1: Geocode ZIP
  const geoResult = await geocodeZipCode(zipCode)
  if (!geoResult) {
    return fallbackEstimate(systemCapacityKw)
  }

  // Step 2: Call PVWatts with lat/lon
  try {
    const response = await axios.get(NREL_API, {
      params: {
        api_key: API_KEY,
        lat: geoResult.lat,
        lon: geoResult.lon,
        system_capacity: systemCapacityKw,
        module_type: 0,  // Standard
        array_type: 1,   // Fixed roof mount
        losses: 14,      // System losses %
        tilt: 20,        // Typical roof pitch
        azimuth: 180     // South-facing
      }
    })

    return {
      city: geoResult.city,
      state: geoResult.state,
      lat: response.data.station_info.lat,
      lon: response.data.station_info.lon,
      annualKwh: response.data.outputs.ac_annual,
      monthlyKwh: response.data.outputs.ac_monthly,
      capacityFactor: response.data.outputs.capacity_factor,
      avgSunHoursPerDay: response.data.outputs.solrad_annual,
      monthlySunHours: response.data.outputs.solrad_monthly
    }
  } catch (error) {
    console.error('NREL API error:', error)
    return fallbackEstimate(systemCapacityKw)
  }
}

// Fallback when APIs fail
function fallbackEstimate(systemCapacityKw: number): SolarEstimate {
  const annualKwh = systemCapacityKw * 1400  // US average
  return {
    city: 'Unknown',
    state: 'US',
    lat: 39.8,
    lon: -98.6,
    annualKwh,
    monthlyKwh: distributeAnnualToMonthly(annualKwh),
    capacityFactor: 15,
    avgSunHoursPerDay: 4.5,
    monthlySunHours: [3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.0, 5.5, 5.0, 4.5, 3.5, 3.0]
  }
}
```

---

## UI Component System

### Design System Tokens (Tailwind)

```css
/* Color Tokens */
--surface-50:  /* Lightest gray */
--surface-100: /* Very light gray */
--surface-200: /* Light gray - borders */
--surface-300: /* Medium-light gray */
...
--surface-900: /* Near black */

--primary-50:  /* Lightest green */
--primary-500: /* Brand green */
--primary-900: /* Darkest green */

/* Dark Mode */
dark:surface-*
dark:primary-*
```

### Component Patterns

#### Input Validation Pattern

```typescript
// In page component
const [zipCode, setZipCode] = useState('')
const [zipCodeError, setZipCodeError] = useState<string>('')

const validateZipCode = (value: string) => {
  if (value.length === 0) {
    setZipCodeError('')
    return
  }
  if (!/^\d{5}$/.test(value)) {
    setZipCodeError('Invalid zip code - please verify and try again')
  } else {
    setZipCodeError('')
  }
}

<InputField
  label="ZIP Code"
  value={zipCode}
  onChange={(val) => {
    setZipCode(val)
    validateZipCode(val)
  }}
  error={zipCodeError}
  tooltip="US zip code for your installation..."
/>
```

#### Tooltip Pattern

```typescript
// Every input and result should have a tooltip
<div className="flex items-center gap-2">
  <label>System Size</label>
  <SmartTooltip content="Peak DC capacity in kW. Find this on your solar panel installation paperwork or inverter specs. Typical residential systems are 5-10 kW." />
</div>
```

#### Chart Interactivity Pattern (Planned Enhancement)

```typescript
// Hover state tracking
const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null)

// In chart SVG
<svg
  onMouseMove={(e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setHoverPosition({ x, y })
  }}
  onMouseLeave={() => setHoverPosition(null)}
>
  {/* Chart elements */}
  {hoverPosition && (
    <Tooltip position={hoverPosition} value={interpolatedValue} />
  )}
</svg>
```

---

## Key Design Decisions

### Decision 1: Pure Function Calculations vs. Class-Based

**Options Considered:**
1. **Pure functions in separate modules** (chosen)
2. Class-based calculator objects
3. Calculation logic embedded in components

**Decision: Pure Functions**

**Rationale:**
- Easier to test (no mocking needed)
- No state management within calculations
- Composable and reusable
- Fits functional React patterns
- Clear separation of concerns

**Implementation:**
```typescript
// ✅ Pure function approach
export function calculateCOPe(
  electricityRate: number,
  miner: MinerSpec,
  btcMetrics: BTCMetrics
): COPeResult {
  // Deterministic calculation
  // No side effects
  // Easy to test
}

// ❌ Alternative (rejected): Class-based
class COPeCalculator {
  constructor(private electricityRate: number) {}
  calculate(miner: MinerSpec): COPeResult {
    // Stateful, harder to test
  }
}
```

---

### Decision 2: Local State vs. Global State Management

**Options Considered:**
1. **Component-local state with hooks** (chosen)
2. Redux/Redux Toolkit
3. Zustand
4. Context API for shared state

**Decision: Local State**

**Rationale:**
- Calculators are independent (no state sharing needed)
- Simpler mental model
- No boilerplate
- Performance optimized with useMemo
- Easier debugging (state is colocated with component)

**When Global State Would Be Needed:**
- User accounts / saved scenarios
- Cross-calculator comparisons
- Shared session data

---

### Decision 3: API Data Fetching Pattern

**Options Considered:**
1. **useEffect + useState** (chosen)
2. React Query / SWR
3. Custom hooks for each API
4. Axios interceptors with global state

**Decision: useEffect + useState**

**Rationale:**
- Simple, built-in React pattern
- API calls are infrequent (mostly on mount)
- No complex caching requirements
- Easy to understand and maintain

**When React Query Would Be Beneficial:**
- Frequent re-fetching
- Complex caching strategies
- Optimistic updates
- Background refetching

**Implementation:**
```typescript
// Current pattern
useEffect(() => {
  async function fetchData() {
    setLoading(true)
    try {
      const data = await getApiData()
      setData(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }
  fetchData()
}, [])
```

---

### Decision 4: Chart Library Selection

**Options Considered:**
1. **Recharts + Custom SVG** (chosen - hybrid)
2. Recharts only
3. D3.js
4. Custom SVG only
5. Chart.js / Victory

**Decision: Hybrid Approach**

**Rationale:**
- Recharts for standard charts (future use)
- Custom SVG for specialized visualizations
  - COPe infinity chart (compressed upper range)
  - Variable X-axis charts
  - Dual-axis revenue + generation chart
- Full control over interactions and styling
- Smaller bundle size than D3
- Easier dark mode integration

---

### Decision 5: Three-Knob Override System

**Options Considered:**
1. **Three-knob linked system** (chosen)
2. Independent inputs (5 separate fields)
3. Scenario presets only
4. No overrides (live data only)

**Decision: Three-Knob Linked System**

**Rationale:**
- Educates users about BTC network relationships
- Maintains mathematical consistency
- Price group: btcPrice ↔ hashprice
- Network group: networkHashrate ↔ hashvalue (with Fee % as anchor)
- Fee % slider: Controls transaction fee modeling (never implied)
- Prevents impossible combinations
- Power users can model any network scenario accurately

**User Experience:**
- Visual grouping with color-coding (green = price, orange = network)
- Clear "(implied)" indicators when values are derived
- Fee % is the "anchor" - never shows "(implied)"
- "Reset to live data" button resets all overrides including fee %

---

### Decision 6: kWh-Based Formula (Solar Calculator)

**Decision: Calculate revenue directly from kWh using hashvalue**

**Rationale:**
- Solar never generates peak flux consistently
- Sun hours-based calculation was conceptually incorrect
- kWh is the primary input - revenue should derive directly from it
- Only miner efficiency (J/TH) matters, not power or hashrate individually
- Clearer "what if all my solar energy was mined" messaging

**Implementation:**
```typescript
// Core formula: kWh → BTC using efficiency and hashvalue
const efficiencyJTH = miner.powerW / miner.hashrateTH
const totalHours = days * 24
const avgPowerW = (kwh * 1000) / totalHours
const avgHashrateTH = avgPowerW / efficiencyJTH
const sats = avgHashrateTH * hashvalueSats * days
const btc = sats / 1e8

// Or equivalently (simplified):
sats = (kWh × 1000 / efficiency_J_TH) × (hashvalue_sats / 24)
```

**Key Insight:**
- Hashvalue already incorporates network difficulty and transaction fees
- Revenue is always proportional to kWh input
- Chart bars and generation line are always proportional (same source)

---

### Decision 7: Input Card Layout (Hashrate Heating)

**Decision: Grouped cards with variable widths/columns**

**Rationale:**
- Current grid has uneven visual appearance
- Cards can flex to content (1-col, 2-col, 3-col, 4-col)
- Better visual balance
- Logical grouping (Location, Electricity, Fuel, Miner)

**Implementation:**
```jsx
<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
  {/* Location card - spans 3 cols */}
  <div className="lg:col-span-3 bg-white rounded-xl p-4">
    <h3>Location</h3>
    {/* 1-column inputs */}
  </div>

  {/* Electricity card - spans 4 cols */}
  <div className="lg:col-span-4 bg-white rounded-xl p-4">
    <h3>Electricity</h3>
    {/* 2-column grid inside */}
  </div>

  {/* Fuel card - spans 5 cols */}
  <div className="lg:col-span-5 bg-white rounded-xl p-4">
    <h3>Compare Fuel</h3>
    {/* 3-column grid inside */}
  </div>
</div>
```

---

## File Structure

### Current Structure

```
webapp-calculators/
├── public/
│   └── assets/
├── src/
│   ├── api/
│   │   ├── bitcoin.ts           # CoinGecko price, Mempool hashrate+fees
│   │   └── solar.ts             # NREL, Zippopotam APIs
│   ├── calculations/
│   │   ├── hashrate.ts          # COPe, arbitrage logic
│   │   ├── solar.ts             # Solar mining logic
│   │   └── index.ts             # Barrel exports
│   ├── components/
│   │   ├── InputField.tsx
│   │   ├── SelectField.tsx
│   │   ├── SmartTooltip.tsx
│   │   ├── PdfReportButton.tsx
│   │   ├── StateHeatMap.tsx
│   │   ├── DualAxisChart.tsx    # Monthly revenue & generation chart
│   │   ├── SEO.tsx              # SEO metadata component
│   │   └── Layout.tsx
│   ├── data/
│   │   ├── fuelPrices.ts        # Regional pricing data
│   │   └── calculators.ts       # Calculator metadata
│   ├── hooks/
│   │   └── usePdfReport.ts      # PDF generation hook
│   ├── pages/
│   │   ├── HashrateHeating.tsx  # ~1900 lines
│   │   ├── SolarMonetization.tsx # ~1550 lines (with excess mode improvements)
│   │   └── Home.tsx
│   ├── pdf/
│   │   ├── types.ts             # PDF report interfaces
│   │   ├── styles.ts            # PDF styling
│   │   ├── components/          # PDF component modules
│   │   │   ├── PdfHeader.tsx
│   │   │   ├── PdfResults.tsx
│   │   │   ├── PdfInputs.tsx
│   │   │   └── PdfChart.tsx
│   │   ├── HashrateHeatingReport.tsx
│   │   └── SolarMiningReport.tsx
│   ├── test/
│   │   ├── hashrate.test.ts     # 37 tests - COPe, arbitrage
│   │   ├── solar.test.ts        # 42 tests - Solar mining, net metering
│   │   └── pdf.test.ts          # 24 tests - PDF generation
│   ├── types/
│   │   └── index.ts             # Shared TypeScript types
│   ├── App.tsx                  # Router configuration
│   ├── main.tsx                 # Entry point
│   └── index.css                # Tailwind imports
├── .env                         # Environment variables (gitignored)
├── .env.example                 # Environment template
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── SPEC.md                      # Requirements specification
└── ARCHITECTURE.md              # This file
```

### Planned Additions (Per SPEC)

```
src/
├── hooks/                       # Custom React hooks (future)
│   ├── useDarkMode.ts          # Dark mode toggle logic
│   ├── useLocalStorage.ts      # Persist preferences
│   └── useDebounce.ts          # Debouncing utility
├── utils/                      # Utility functions (future)
│   ├── validation.ts           # Input validation helpers
│   └── formatting.ts           # Number formatting utilities
└── test/                       # Test files
    ├── calculations/
    │   ├── solar.test.ts
    │   └── hashrate.test.ts
    └── components/
        └── InputField.test.tsx
```

---

## Implementation Roadmap

### ✅ Phase 1: Foundation Improvements (COMPLETED)

**Status:** Complete
**Completion Date:** 2026-01-07

**Accomplishments:**
- ✅ Added comprehensive tooltips (2-3 sentences) across all inputs
- ✅ Updated miner presets (added Single Board S19 Pro)
- ✅ Implemented validation and error handling
- ✅ Verified dark mode compatibility

**Files Modified:**
- `src/calculations/hashrate.ts` (miner presets updated)
- `src/pages/SolarMonetization.tsx` (tooltips added)
- `src/pages/HashrateHeating.tsx` (tooltips added)

---

### ✅ Phase 2: Solar Calculator Refactoring (COMPLETED)

**Status:** Complete
**Completion Date:** 2026-01-07

**Accomplishments:**
- ✅ Removed miner quantity input logic
- ✅ Implemented simplified 100% solar utilization calculation
- ✅ Created DualAxisChart component (revenue bars + generation line)
- ✅ Unified results layout across all three modes
- ✅ Added excess-specific data calculations in Excess mode
- ✅ Fixed chart label clipping (increased top padding to 50px)
- ✅ Changed result cards to 2x2 grid layout
- ✅ Removed unnecessary UI elements from excess mode

**Files Created:**
- `src/components/DualAxisChart.tsx`

**Files Modified:**
- `src/calculations/solar.ts` (removed minerQuantity parameter)
- `src/pages/SolarMonetization.tsx` (major refactor, added excessMiningData calculation)

**Recent Improvements (2026-01-08):**
- Fixed chart label clipping for peak revenue months
- Implemented conditional data display (full system vs excess-only)
- Added `excessMiningData` useMemo for excess mode calculations
- Removed duplicate charts and empty states from excess mode

---

### ✅ Phase 3: Hashrate Calculator Enhancements (COMPLETED)

**Status:** Complete
**Completion Date:** 2026-01-07

**Accomplishments:**
- ✅ Redesigned input section with grouped card layout
- ✅ Implemented chart hover interactivity
- ✅ Added compressed upper range for COPe infinity visualization

**Files Modified:**
- `src/pages/HashrateHeating.tsx` (input layout redesign, chart improvements)

---

### ✅ Phase 4: Transaction Fee Handling (COMPLETED)

**Status:** Complete
**Completion Date:** 2026-01-07

**Accomplishments:**
- ✅ Using live fee data from Mempool.space (includes transaction fees via Fee % slider)
- ✅ Implemented fee-aware override calculations
- ✅ Added Mempool.space API integration for historical fee data
- ✅ Added comprehensive tooltips explaining fee inclusion

**Files Modified:**
- `src/api/bitcoin.ts` (added fee rate fetching)
- `src/pages/SolarMonetization.tsx` (override handlers updated)
- `src/pages/HashrateHeating.tsx` (override handlers updated)

---

### ✅ Phase 5: Dark Mode Enhancement (COMPLETED)

**Status:** Complete
**Completion Date:** 2026-01-07

**Accomplishments:**
- ✅ System preference auto-detection implemented
- ✅ Manual dark mode toggle added
- ✅ Preference persistence in localStorage
- ✅ Smooth transitions between themes
- ✅ All components tested in both modes

**Files Created:**
- `src/hooks/useDarkMode.ts` (not needed - using Tailwind's built-in dark mode)

**Files Modified:**
- All component files (dark mode classes added)

---

### ✅ Phase 6: SEO & Metadata (COMPLETED)

**Status:** Complete
**Completion Date:** 2026-01-07

**Accomplishments:**
- ✅ React Helmet implementation for meta tags
- ✅ OpenGraph tags for social sharing
- ✅ Structured data (Schema.org JSON-LD)
- ✅ Page-specific titles and descriptions
- ✅ Canonical URLs
- ✅ Sitemap and robots.txt configuration

**Files Created:**
- `src/components/SEO.tsx`
- `public/robots.txt`
- `public/sitemap.xml`

**Dependencies Added:**
- `react-helmet-async`

---

### ✅ Phase 7: PDF Report Refinement (COMPLETED)

**Status:** Complete
**Completion Date:** 2026-01-07

**Accomplishments:**
- ✅ Unified PDF report styling across both calculators
- ✅ Verified calculation accuracy (matches on-screen results)
- ✅ Enhanced explanatory text and context
- ✅ Consistent branding and visual design
- ✅ Modular PDF component architecture

**Files Created:**
- `src/pdf/components/` (modular PDF components)
- `src/pdf/styles.ts`
- `src/pdf/HashrateHeatingReport.tsx`
- `src/pdf/SolarMiningReport.tsx`

**Files Modified:**
- `src/hooks/usePdfReport.ts`
- `src/components/PdfReportButton.tsx`

---

### ✅ Phase 8: Testing Infrastructure (COMPLETED)

**Status:** Complete
**Completion Date:** 2026-01-08

**Accomplishments:**
- ✅ **100 tests passing** across 3 test suites
- ✅ **100% statement coverage** on calculation logic
- ✅ **100% function coverage**
- ✅ **88.88% branch coverage**
- ✅ Comprehensive unit tests for all calculations
- ✅ Test coverage reporting configured
- ✅ Vitest with v8 coverage provider

**Files Created:**
- `src/test/hashrate.test.ts` (37 tests)
- `src/test/solar.test.ts` (39 tests) - kWh-based formula tests
- `src/test/pdf.test.ts` (24 tests)
- `vitest.config.ts`

**Test Coverage Details:**
- `hashrate.ts`: 100% statements, 86.95% branches
- `solar.ts`: 100% statements, 90.9% branches
- All edge cases covered (R=1, R>1, infinity, zero values, efficiency scaling)

---

## Testing Architecture

### Unit Testing Strategy

**What to Test:**
1. **Calculation Functions** (High Priority)
   - All functions in `calculations/solar.ts`
   - All functions in `calculations/hashrate.ts`
   - Edge cases (R=1, R>1, infinity, division by zero)
   - Boundary values

2. **Utility Functions** (Medium Priority)
   - Format functions (formatBtc, formatUsd, formatKwh)
   - Validation helpers
   - Conversion functions

3. **Components** (Low Priority)
   - Critical components (InputField, SmartTooltip)
   - User interactions
   - Error states

**What NOT to Test:**
- API integration (use mocks)
- Visual styling
- Third-party libraries

### Test Structure

```typescript
// Example: COPe calculation test
describe('calculateCOPe', () => {
  const mockMiner: MinerSpec = {
    name: 'Test Miner',
    powerW: 1000,
    hashrateTH: 50
  }

  const mockBtcMetrics: BTCMetrics = {
    btcPrice: 50000,
    networkHashrate: 500e6,  // 500 EH/s in TH/s
    blockReward: 3.125
  }

  it('calculates correct COPe for typical values', () => {
    const result = calculateCOPe(0.10, mockMiner, mockBtcMetrics)

    expect(result.R).toBeGreaterThan(0)
    expect(result.R).toBeLessThan(1)
    expect(result.COPe).toBeGreaterThan(1)
    expect(result.COPe).toBeLessThan(Infinity)
  })

  it('returns infinity when R >= 1 (free heating)', () => {
    // Use very low electricity rate to make R >= 1
    const result = calculateCOPe(0.001, mockMiner, mockBtcMetrics)

    expect(result.R).toBeGreaterThanOrEqual(1)
    expect(result.COPe).toBe(Infinity)
    expect(result.status).toBe('profitable')
  })

  it('handles edge case: zero electricity rate', () => {
    // Should handle gracefully or throw meaningful error
    const result = calculateCOPe(0, mockMiner, mockBtcMetrics)
    expect(result.R).toBe(Infinity)
  })
})
```

### Integration Testing (Manual)

**Critical User Flows to Test:**

1. **Solar Calculator - Estimate Mode**
   - Enter ZIP code → Verify API call → Check results
   - Invalid ZIP → Verify error message
   - Change system size → Results update

2. **Solar Calculator - Excess Mode**
   - Enter excess kWh → Select compensation type
   - Verify comparison calculation
   - Check recommendation banner

3. **Hashrate Calculator**
   - Select location → Auto-populate prices
   - Enter custom values → Calculate COPe
   - Expand charts → Verify X-axis switching

4. **BTC Override System**
   - Override BTC price → Verify implied hashprice updates
   - Override hashvalue → Verify implied network hashrate updates
   - Reset to live data → All overrides cleared

5. **PDF Export**
   - Generate PDF from solar calculator
   - Generate PDF from hashrate calculator
   - Verify all data matches screen

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **API Downtime** (CoinGecko, Mempool, NREL) | Users can't get live data | Medium | Fallback data + manual override system already implemented |
| **Calculation Errors** | Wrong financial decisions | Low | Unit tests + manual verification + user feedback loop |
| **Breaking Changes** from Spec Refactor | Regression bugs | Medium | Phased implementation + thorough testing between phases |
| **Browser Compatibility** | Users on older browsers can't access | Low | Target modern browsers only (documented in spec) |
| **Performance Issues** (Large Charts) | Laggy UI on mobile | Low | Use React.memo, debouncing, efficient re-renders |
| **Transaction Fee Data Unavailable** | Override calculations less accurate | Medium | Use conservative estimate + document assumption |
| **Dark Mode Inconsistencies** | Poor UX in dark mode | Low | Test all components in both modes |

---

## Future Enhancements (Out of Scope)

These architectural considerations are documented but not currently planned:

### Multi-Calculator Comparison
- Allow side-by-side scenario comparison
- Would require global state management (Zustand)
- URL parameter sharing for bookmarkable scenarios

### User Accounts
- Save calculations
- Historical tracking
- Would require backend API + database
- Authentication system

### Real-Time Data
- WebSocket connection to live BTC price
- Auto-refresh calculations
- Would require connection management

### Advanced Modeling
- Pool fees and operational costs
- Hardware degradation over time
- Dynamic difficulty adjustment predictions
- Would require time-series calculations

---

## References

- **Requirements**: [SPEC.md](./SPEC.md)
- **Tech Stack**:
  - [React 18 Docs](https://react.dev/)
  - [TypeScript Handbook](https://www.typescriptlang.org/docs/)
  - [Vite Guide](https://vitejs.dev/guide/)
  - [Tailwind CSS](https://tailwindcss.com/docs)
- **APIs**:
  - [NREL PVWatts](https://developer.nrel.gov/docs/solar/pvwatts/v8/)
  - [CoinGecko API](https://www.coingecko.com/api/documentation)
  - [Mempool.space API](https://mempool.space/docs/api)

---

## Project Summary

### Current Production Status

**Version:** 1.3 (Production)
**Last Updated:** 2026-01-13
**Implementation:** All 8 phases complete + Solar formula refactor

### Key Achievements

1. **Calculation Engine**
   - Pure function architecture with 100% test coverage
   - COPe calculation with infinity handling
   - Solar mining revenue calculation using kWh-based formula with hashvalue
   - Net metering comparison logic
   - Key insight: Only miner efficiency (J/TH) matters for solar mining revenue

2. **User Interface**
   - Two comprehensive calculators (Solar Monetization, Hashrate Heating)
   - Three input modes for Solar calculator (Estimate, Production, Excess)
   - Responsive design with dark mode support
   - Interactive dual-axis charts
   - Comprehensive tooltips for user education

3. **Data Integration**
   - Live BTC network data (CoinGecko + Mempool.space APIs)
   - Solar production estimates (NREL PVWatts)
   - Three-knob override system (BTC Price, Hashvalue/Hashrate, Fee %)
   - Transaction fee-aware calculations via Fee % slider

4. **Quality Assurance**
   - 100 passing unit tests
   - 100% statement coverage on calculations
   - Comprehensive edge case handling
   - Validated against real-world data

5. **PDF Reports**
   - Professional PDF generation for both calculators
   - Matches on-screen calculations exactly
   - Comprehensive explanations and branding

### Recent Enhancements (2026-01-13 Solar Formula Refactor)

**Solar Calculator Calculation Overhaul:**
- Replaced sun hours-based calculation with kWh-based formula
- Revenue now derived directly from kWh using hashvalue (sats/TH/day)
- Only miner efficiency (J/TH) matters - not power or hashrate individually
- Chart bars now always proportional to generation line (both from same kWh source)
- Fixed chart hover scaling for viewBox coordinates
- Labels positioned inside bars for tall bars, above for short bars

**Removed:**
- `calculateDailySolarBtc()` - used sun hours
- `calculateMonthlyBtcBreakdown()` - used sun hours
- `calculateSunHours()` - no longer needed
- `BTCMetrics` type - replaced with direct hashvalue usage
- `sunHours` and `avgSunHours` memos in SolarMonetization.tsx

**Added:**
- `calculateBtcFromKwh()` - core formula using efficiency and hashvalue
- `calculateMonthlyExcessMining()` - for excess mode monthly chart

**File Changes:**
- `src/calculations/solar.ts` - Complete rewrite with kWh-based formula
- `src/pages/SolarMonetization.tsx` - Major refactor to use hashvalue directly
- `src/components/DualAxisChart.tsx` - Updated hover scaling and label positioning
- `src/test/solar.test.ts` - Rewritten for new API (39 tests)
- `src/api/solar.ts` - Added clarifying comments for sun hours fields

### Architecture Highlights

**Strengths:**
- **Pure Calculation Functions** - Testable, reliable, reusable
- **Component-Local State** - Simple, performant, maintainable
- **API Resilience** - Graceful degradation with fallback data
- **Type Safety** - Full TypeScript coverage
- **Separation of Concerns** - Clear layer boundaries

**Design Patterns:**
- Calculation engine isolated from UI
- useMemo for derived state optimization
- Debounced API calls for performance
- Three-knob override system for user education (Fee % as anchor)
- Responsive grid layouts with Tailwind

### Maintenance Notes

- All phases of the implementation roadmap are complete
- Test coverage maintains 100% on calculation logic
- Documentation (SPEC.md, ARCHITECTURE.md) updated to reflect current state
- Solar formula refactored from sun hours-based to kWh-based calculation (2026-01-13)
- Future enhancements documented in "Out of Scope" sections
- Ready for production deployment

---

**Document Maintenance:**
- Update this document when architectural decisions change
- Link to relevant ADRs (Architecture Decision Records) if created
- Keep diagrams synchronized with implementation
- Version control alongside code
- Update phase completion dates as work progresses

---

**End of Architecture Document**

*This document serves as the technical blueprint and completion record for the requirements defined in SPEC.md. All 8 implementation phases are complete and the application is production-ready.*
