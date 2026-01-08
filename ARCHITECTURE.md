# Exergy Heat Calculator Web App - Architecture Document

**Version:** 1.0
**Last Updated:** 2026-01-07
**Status:** Active (Live Production + Planned Improvements)
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
        │  Braiins API │         │  NREL PVWatts │
        │ (BTC Network)│         │ (Solar Data)  │
        └──────────────┘         └───────────────┘
                │                        │
        ┌───────▼──────┐         ┌──────▼────────┐
        │ Zippopotam   │         │ Mempool.space │
        │ (Geocoding)  │         │  (TX Fees)    │
        └──────────────┘         └───────────────┘
```

### Calculator Page Architecture

```
┌─────────────────────────────────────────────────────────┐
│          Calculator Page Component                       │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Bitcoin Network Data Section                    │   │
│  │  (Two-Knob Override System)                      │   │
│  │  - Live API data with manual override controls   │   │
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
│ - api/bitcoin.ts (Braiins, Mempool)                      │
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
    └─► Braiins API
        └─► btcPrice, networkHashrate, hashvalue, hashprice
            └─► Update braiinsData state
                └─► Enable override controls
                    └─► Two-knob system calculations
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
    └─► Braiins API
        └─► btcPrice, networkHashrate, hashvalue, hashprice
            └─► Update braiinsData state
                └─► Enable override controls
```

### Two-Knob Override System (Both Calculators)

```
Knob 1: Price Group
    ├─► User edits BTC Price
    │       └─► Clear hashpriceOverride
    │           └─► Calculate implied hashprice from (hashvalue × btcPrice / 1e8)
    │
    └─► User edits Hashprice
            └─► Clear btcPriceOverride
                └─► Calculate implied btcPrice from (hashprice × 1e8 / hashvalue)

Knob 2: Network Group
    ├─► User edits Network Hashrate
    │       └─► Clear hashvalueOverride
    │           └─► Calculate implied hashvalue from network hashrate + fee assumption
    │
    └─► User edits Hashvalue
            └─► Clear networkHashrateOverride
                └─► Calculate implied network hashrate from hashvalue + fee assumption

Fee Handling:
    - Braiins API hashvalue includes fees (preferred source)
    - Override calculations use 30-day average fee rate from Mempool.space
    - Maintains realistic relationships between metrics
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
const [braiinsData, setBraiinsData] = useState<BraiinsMetrics | null>(null)
const [solarEstimate, setSolarEstimate] = useState<SolarEstimate | null>(null)
const [loadingBtc, setLoadingBtc] = useState(true)
const [loadingSolar, setLoadingSolar] = useState(false)
```

#### 3. Override State (useState)
```typescript
const [btcPriceOverride, setBtcPriceOverride] = useState<string>('')
const [hashvalueOverride, setHashvalueOverride] = useState<string>('')
const [hashpriceOverride, setHashpriceOverride] = useState<string>('')
const [networkHashrateOverride, setNetworkHashrateOverride] = useState<string>('')
```

#### 4. Derived State (useMemo)
```typescript
// Calculation results - recomputed when dependencies change
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
      const data = await getBraiinsData()
      setBraiinsData(data)
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
Input Parameters
    ↓
┌────────────────────────────────────────┐
│ 1. Monthly Distribution                │
│    - Annual → Monthly (if needed)      │
│    - Apply seasonal pattern            │
└────────────┬───────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│ 2. Mining Hours Calculation            │
│    mining_hours = total_kWh / miner_kW │
└────────────┬───────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│ 3. Hashrate-Hours Calculation          │
│    hashrate_hrs = miner_TH × hours     │
└────────────┬───────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│ 4. BTC Revenue Calculation             │
│    btc = hashrate_hrs × network_share  │
│    usd = btc × btc_price               │
└────────────┬───────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│ 5. Per-kWh Metrics                     │
│    revenue_per_kwh = usd / total_kWh   │
│    sats_per_kwh = (btc × 1e8) / kWh    │
└────────────┬───────────────────────────┘
             ↓
     SolarMiningResult
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
// Core solar mining calculation
export function calculateSolarMining(
  systemCapacityKw: number,
  annualProductionKwh: number,
  monthlyProductionKwh: number[],
  monthlySunHours: number[],
  miner: MinerSpec,
  minerQuantity: number,  // Note: Will be removed per spec
  btcMetrics: BTCMetrics
): SolarMiningResult

// Net metering comparison
export function calculateNetMeteringComparison(
  excessKwh: number,
  netMeteringRate: number,
  miner: MinerSpec,
  avgSunHoursPerDay: number,
  btcMetrics: BTCMetrics
): NetMeteringComparison

// Helper: Calculate sun hours from production
export function calculateSunHours(
  annualKwh: number,
  systemCapacityKw: number
): number
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
// Braiins API - Primary source for BTC network data
export async function getBraiinsData(): Promise<BraiinsMetrics> {
  try {
    const response = await axios.get('https://insights.braiins.com/api/...')
    return {
      btcPrice: response.data.price,
      networkHashrate: response.data.hashrate,
      hashvalue: response.data.hashvalue,  // Includes transaction fees
      hashprice: response.data.hashprice,
      difficulty: response.data.difficulty
    }
  } catch (error) {
    console.error('Braiins API error:', error)
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

### Decision 5: Two-Knob Override System

**Options Considered:**
1. **Two-knob linked system** (chosen)
2. Independent inputs (4 separate fields)
3. Scenario presets only
4. No overrides (live data only)

**Decision: Two-Knob Linked System**

**Rationale:**
- Educates users about BTC network relationships
- Maintains mathematical consistency
- Price group: btcPrice ↔ hashprice
- Network group: networkHashrate ↔ hashvalue
- Prevents impossible combinations
- Power users can model scenarios accurately

**User Experience:**
- Visual grouping with color-coding (green = price, orange = network)
- Clear "(implied)" indicators when values are derived
- "Reset to live data" button when overridden

---

### Decision 6: Miner Quantity Removal (Solar Calculator)

**Decision: Remove miner quantity input**

**Rationale (from SPEC):**
- Solar never generates peak flux consistently
- Confusing UX with auto-calculated "max miners"
- Simplified calculation: all power → mining at selected efficiency
- Clearer messaging about ideal vs. real-world scenarios

**Implementation Change:**
```typescript
// Before: Calculate max miners, allow override
const maxMiners = calculateMaxMiners(systemKw, miner.powerW)
const actualQuantity = quantityOverride ? minerQuantity : maxMiners

// After: Assume all energy goes to mining
// Calculate revenue directly from kWh and miner efficiency
mining_hours = total_kWh / (miner_power_kW)
hashrate_hours = miner_hashrate_TH × mining_hours
```

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
│   │   ├── bitcoin.ts           # Braiins, Mempool APIs
│   │   └── solar.ts             # NREL, Zippopotam APIs
│   ├── calculations/
│   │   ├── hashrate.ts          # COPe, arbitrage logic
│   │   └── solar.ts             # Solar mining logic
│   ├── components/
│   │   ├── InputField.tsx
│   │   ├── SelectField.tsx
│   │   ├── SmartTooltip.tsx
│   │   ├── PdfReportButton.tsx
│   │   ├── StateHeatMap.tsx
│   │   └── Layout.tsx
│   ├── data/
│   │   └── fuelPrices.ts        # Regional pricing data
│   ├── pages/
│   │   ├── HashrateHeating.tsx  # ~1900 lines
│   │   ├── SolarMonetization.tsx # ~1500 lines
│   │   └── Home.tsx
│   ├── pdf/
│   │   ├── types.ts             # PDF report interfaces
│   │   └── generator.ts         # PDF generation logic
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

### Phase 1: Foundation Improvements (Current Work)

**Goals:**
- Add comprehensive tooltips (2-3 sentences)
- Update miner presets (add Single Board S19)
- Improve validation and error handling

**Tasks:**
1. Update `MINER_PRESETS` array in calculations/hashrate.ts
2. Add tooltip prop to all InputField/SelectField instances
3. Write tooltip content per SPEC.md guidelines
4. Implement validation error messages
5. Test dark mode compatibility

**Files to Modify:**
- `src/calculations/hashrate.ts` (miner presets)
- `src/pages/SolarMonetization.tsx` (tooltips)
- `src/pages/HashrateHeating.tsx` (tooltips)
- `src/components/SmartTooltip.tsx` (if styling updates needed)

---

### Phase 2: Solar Calculator Refactoring

**Goals:**
- Remove miner quantity input
- Implement simplified kWh → revenue calculation
- Add dual-axis chart (revenue + generation)
- Unify results layout for all modes

**Tasks:**
1. **Remove Miner Quantity Logic**
   - Remove `minerQuantity` state and inputs
   - Remove `quantityOverride` state
   - Update calculation to assume 100% solar utilization
   - Remove "Mining Capacity" and "Solar Utilization" result cards

2. **Update Calculation Function**
   ```typescript
   // New signature (remove minerQuantity param)
   export function calculateSolarMining(
     systemCapacityKw: number,
     annualProductionKwh: number,
     monthlyProductionKwh: number[],
     monthlySunHours: number[],
     miner: MinerSpec,  // No quantity!
     btcMetrics: BTCMetrics
   ): SolarMiningResult
   ```

3. **Implement Dual-Axis Chart**
   - Create custom SVG chart component
   - Left Y-axis: USD (bars)
   - Right Y-axis: kWh (line)
   - Bar labels: Primary (USD), Subtitle (sats)
   - Auto-scale axes independently

4. **Unify Results Layouts**
   - Same result card structure for Total Production and Excess modes
   - Conditional labels ("Annual Production" vs "Annual Export")
   - Consistent chart across both modes

**Files to Create:**
- `src/components/DualAxisChart.tsx`

**Files to Modify:**
- `src/calculations/solar.ts`
- `src/pages/SolarMonetization.tsx`

---

### Phase 3: Hashrate Calculator Enhancements

**Goals:**
- Grouped card input layout
- Chart hover interactivity
- Compressed upper range for COPe infinity

**Tasks:**
1. **Redesign Input Section**
   - Implement 12-column grid layout
   - Create input cards with variable spans
   - Adjust internal layouts for visual balance

2. **Chart Hover Interactivity**
   - Add mouse move/leave handlers
   - Interpolate Y value at cursor X position
   - Display exact values in tooltip
   - Update current marker to follow cursor

3. **COPe Infinity Visualization**
   - Implement compressed scale function
     ```typescript
     function scaleYCompressed(value: number): number {
       if (value <= 10) {
         return linearScale(value, 0, 10, bottom, middle)
       } else if (value <= 100) {
         return linearScale(value, 10, 100, middle, top * 0.9)
       } else {
         return top  // Infinity
       }
     }
     ```
   - Update Y-axis labels: 0, 2, 5, 10, 25, 50, 100, ∞
   - Add visual indicators for scale transitions

**Files to Modify:**
- `src/pages/HashrateHeating.tsx` (input layout)
- Chart components within HashrateHeating.tsx

---

### Phase 4: Transaction Fee Handling

**Goals:**
- Always use Braiins API hashvalue (includes fees)
- Implement fee-aware override calculations
- Add Mempool.space API for historical fee data

**Tasks:**
1. **Add Mempool.space API**
   ```typescript
   // src/api/bitcoin.ts
   export async function getAverageFeeRate(): Promise<number> {
     // Fetch 30-day average fee sats per block
     // Return as percentage of block reward
   }
   ```

2. **Update Override Calculations**
   - When user overrides Network Hashrate:
     - Fetch average fee rate
     - Calculate hashvalue = (144 × (3.125 + fee_btc) × 1e8) / network_hashrate
   - When user overrides Hashvalue:
     - Back-calculate network hashrate including fee assumption

3. **Add Tooltips**
   - Explain that hashvalue includes transaction fees
   - Clarify fee assumptions in override mode

**Files to Modify:**
- `src/api/bitcoin.ts`
- `src/pages/SolarMonetization.tsx` (override handlers)
- `src/pages/HashrateHeating.tsx` (override handlers)

---

### Phase 5: Dark Mode Enhancement

**Goals:**
- Add manual dark mode toggle
- Persist preference in localStorage
- Smooth transitions

**Tasks:**
1. **Create useDarkMode Hook**
   ```typescript
   // src/hooks/useDarkMode.ts
   export function useDarkMode() {
     const [darkMode, setDarkMode] = useState(() => {
       const stored = localStorage.getItem('darkMode')
       if (stored) return stored === 'true'
       return window.matchMedia('(prefers-color-scheme: dark)').matches
     })

     useEffect(() => {
       localStorage.setItem('darkMode', String(darkMode))
       document.documentElement.classList.toggle('dark', darkMode)
     }, [darkMode])

     return [darkMode, setDarkMode] as const
   }
   ```

2. **Add Toggle Button**
   - Add to header/nav component
   - Sun/moon icon
   - Accessible keyboard controls

3. **Test All Components**
   - Verify all colors work in both modes
   - Check charts, inputs, tooltips
   - Ensure readable contrast

**Files to Create:**
- `src/hooks/useDarkMode.ts`

**Files to Modify:**
- `src/components/Layout.tsx` (add toggle)
- `src/App.tsx` (use hook)

---

### Phase 6: SEO & Metadata

**Goals:**
- Full SEO optimization
- OpenGraph tags
- Structured data

**Tasks:**
1. **React Helmet or react-helmet-async**
   ```typescript
   // In each calculator page
   <Helmet>
     <title>Solar Mining Calculator | Exergy Heat</title>
     <meta name="description" content="Calculate bitcoin mining revenue from solar panels..." />
     <meta property="og:title" content="Solar Mining Calculator" />
     <meta property="og:description" content="..." />
     <meta property="og:image" content="/og-image-solar.jpg" />
     <script type="application/ld+json">
       {JSON.stringify(structuredData)}
     </script>
   </Helmet>
   ```

2. **Generate OG Images**
   - Create preview images for each calculator
   - 1200x630px for social sharing

3. **Sitemap Generation**
   - Add vite plugin or build script
   - Generate sitemap.xml

4. **Robots.txt**
   - Allow all crawlers
   - Reference sitemap

**Files to Create:**
- `public/robots.txt`
- `public/sitemap.xml`
- OG images in `public/assets/`

**Dependencies to Add:**
- `react-helmet-async`

---

### Phase 7: PDF Report Refinement

**Goals:**
- Match hashrate heating report style for solar
- Verify calculation accuracy
- Improve explanatory text

**Tasks:**
1. **Audit Current Reports**
   - Generate test PDFs for both calculators
   - Verify all calculations match screen
   - Check formatting, alignment, branding

2. **Style Consistency**
   - Ensure both reports use same:
     - Header/footer layout
     - Color scheme
     - Typography
     - Section structure

3. **Enhance Explanations**
   - Add 2-3 sentence explanations for each metric
   - Explain assumptions clearly
   - Add context and interpretation guidance

**Files to Modify:**
- `src/pdf/` (all files)
- `src/pages/SolarMonetization.tsx` (PDF data generation)
- `src/pages/HashrateHeating.tsx` (PDF data generation)

---

### Phase 8: Testing Infrastructure

**Goals:**
- Unit tests for all calculations
- Component tests for critical UI
- Test coverage reporting

**Tasks:**
1. **Calculation Tests**
   ```typescript
   // src/test/calculations/solar.test.ts
   describe('calculateSolarMining', () => {
     it('correctly converts 10,000 kWh to BTC revenue', () => {
       const result = calculateSolarMining(...)
       expect(result.annualBtc).toBeCloseTo(0.05, 2)
     })

     it('distributes annual to monthly correctly', () => {
       // Test monthly distribution logic
     })
   })
   ```

2. **Component Tests**
   ```typescript
   // src/test/components/InputField.test.tsx
   describe('InputField', () => {
     it('displays error message when provided', () => {
       render(<InputField error="Invalid input" ... />)
       expect(screen.getByText('Invalid input')).toBeInTheDocument()
     })
   })
   ```

3. **Test Coverage**
   - Configure Vitest coverage
   - Set coverage thresholds (80%+ for calculations)
   - Add to CI pipeline

**Files to Create:**
- All files in `src/test/`
- `vitest.config.ts` (if custom config needed)

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
| **API Downtime** (Braiins, NREL) | Users can't get live data | Medium | Fallback data + manual override system already implemented |
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
  - [Braiins Insights](https://insights.braiins.com/)
  - [Mempool.space API](https://mempool.space/docs/api)

---

**Document Maintenance:**
- Update this document when architectural decisions change
- Link to relevant ADRs (Architecture Decision Records) if created
- Keep diagrams synchronized with implementation
- Version control alongside code

---

**End of Architecture Document**

*This document serves as the technical blueprint for implementing the requirements defined in SPEC.md.*
