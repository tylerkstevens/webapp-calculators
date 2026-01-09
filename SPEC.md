# Exergy Heat Calculator Web App - Technical Specification

**Version:** 1.1
**Last Updated:** 2026-01-08
**Status:** Production (Live)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Solar Monetization Calculator](#solar-monetization-calculator)
3. [Hashrate Heating Calculator](#hashrate-heating-calculator)
4. [Global Web App Specifications](#global-web-app-specifications)
5. [Shared Components & Patterns](#shared-components--patterns)
6. [Testing Strategy](#testing-strategy)
7. [Success Criteria](#success-criteria)

---

## Project Overview

**webapp-calculators** is a React + TypeScript web application providing energy economics calculators focused on bitcoin mining and alternative energy strategies. The application helps users analyze the financial viability of hashrate heating and solar bitcoin mining.

### Tech Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom design tokens
- **Routing**: React Router v7
- **State Management**: React useState + useMemo
- **Charts**: Recharts + custom SVG charts
- **Icons**: Lucide React
- **PDF Generation**: Custom PDF report system

### Current Calculators
1. **Solar Monetization** (`/solar-monetization`) - Bitcoin mining revenue from solar PV systems
2. **Hashrate Heating** (`/hashrate-heating`) - COPe analysis comparing hashrate heating to traditional fuels

---

## Solar Monetization Calculator

### Purpose
Estimate bitcoin mining revenue potential from solar photovoltaic systems. Helps users determine if mining their solar production or excess energy is more profitable than traditional net metering.

### Calculation Modes

The calculator has three distinct input modes:

#### Mode 1: Estimate from System Size
- **User Provides**: ZIP code, system size (kW)
- **System Fetches**: NREL PVWatts solar production estimate for location
- **Use Case**: Users who know their system specs but want location-based estimates

#### Mode 2: Use Actual Production
- **User Provides**: Actual solar production data (annual total OR monthly breakdown)
- **Use Case**: Users with historical solar data from monitoring apps or utility bills
- **Data Entry Options**:
  - Annual total (kWh/year) - auto-distributed by seasonal sun hours
  - Monthly breakdown (12 values) - more accurate calculations

#### Mode 3: Excess Energy Comparison
- **User Provides**: Excess grid export data, net metering compensation type and rate
- **Purpose**: Compare mining excess solar vs selling back to grid
- **Compensation Types**:
  - Bill Credits (~$0.12/kWh) - 1:1 kWh credit offset
  - Net Billing (~$0.05/kWh) - Utility's avoided cost rate
  - Annual Cash-Out (~$0.02/kWh) - Year-end excess buyback

### Input Fields

#### Location & System (All Modes)
- **ZIP Code**
  - Type: 5-digit US ZIP code
  - Validation: Must be valid US ZIP
  - API: Zippopotam geocoding → NREL PVWatts
  - Tooltip: "US zip code for your installation. We use NREL PVWatts solar data for your location to estimate production."

- **System Size**
  - Type: Number (kW)
  - Validation: Must be > 0, no upper limit
  - Default: 10 kW
  - Tooltip: "Peak DC capacity in kW. Find this on your solar panel installation paperwork or inverter specs. Typical residential systems are 5-10 kW."

#### Production Data (Mode 2 only)
- **Annual Production** (if annual entry selected)
  - Type: Number (kWh)
  - Validation: Must be > 0
  - Tooltip: "Total kWh generated in one year. Find this on your solar monitoring app (Enphase, SolarEdge, etc.) or utility bill under 'Solar Generation' or 'Customer Generation'."

- **Monthly Production Grid** (if monthly entry selected)
  - 12 input fields (Jan-Dec)
  - Auto-totals annual sum
  - Tooltip: "Monthly generation in kWh. Find this on your solar monitoring app (Enphase, SolarEdge, etc.) or utility bill under 'Solar Generation' or 'Customer Generation'."

#### Excess Export Data (Mode 3 only)
- **Annual Grid Export** (if annual entry selected)
  - Type: Number (kWh)
  - Validation: Must be > 0
  - Tooltip: "Total kWh sent to grid annually. Look for 'Energy Delivered to Grid', 'Net Export', or 'Excess Generation' on your utility bill. Some bills show this as negative kWh."

- **Monthly Export Grid** (if monthly entry selected)
  - 12 input fields (Jan-Dec)
  - Auto-totals annual sum

- **Compensation Type Quick Select**
  - Three buttons: Bill Credits, Net Billing, Annual Cash-Out
  - Auto-populates default rate, user can override
  - Each has tooltip explaining the compensation structure

- **Your Rate**
  - Type: Number ($/kWh)
  - Updates when compensation type changes
  - User can manually override
  - Tooltip: "Your actual export compensation rate. Find this on your utility bill under 'Export Credit Rate', 'Net Metering Rate', or 'Avoided Cost'. Contact your utility if you're unsure of your exact rate."

#### Miner Selection (All Modes)
- **Miner Model**
  - Dropdown with presets + "Custom" option
  - Tooltip: "Choose your miner model or enter custom specs. More efficient miners (lower W/TH) earn more BTC per kWh of solar energy."

- **Power** (W)
  - Auto-filled from preset, editable for custom
  - Validation: Must be > 0

- **Hashrate** (TH/s)
  - Auto-filled from preset, editable for custom
  - Validation: Must be > 0

**Note**: Miner quantity input is REMOVED. Calculations assume all solar power is used for mining with the selected miner's efficiency.

### Miner Presets (Global)
```typescript
[
  { name: 'Heatbit Trio', powerW: 400, hashrateTH: 10 },
  { name: 'Heatbit Maxi', powerW: 1500, hashrateTH: 39 },
  { name: 'Avalon Mini 3', powerW: 850, hashrateTH: 40 },
  { name: 'Avalon Q', powerW: 1700, hashrateTH: 90 },
  { name: 'Whastminer M64', powerW: 5000, hashrateTH: 228 },
  { name: 'Bitmain S19j Pro', powerW: 3068, hashrateTH: 104 },
  { name: 'Bitmain S19k Pro', powerW: 2760, hashrateTH: 120 },
  { name: 'Bitmain S9', powerW: 1400, hashrateTH: 13.5 },
  { name: 'Single Board S19', powerW: 850, hashrateTH: 30 }  // NEW
]
```

### Calculation Logic

#### Simplified Revenue Calculation (No Miner Quantity)
```
For Total Production Modes (Estimate/Production):
  1. Convert annual kWh to equivalent mining hours:
     mining_hours = total_kWh / (miner_power_kW)

  2. Calculate total hashrate-hours:
     hashrate_hours = miner_hashrate_TH × mining_hours

  3. Calculate BTC earned:
     daily_btc_per_TH = (144 blocks × 3.125 BTC) / network_hashrate_TH
     total_btc = daily_btc_per_TH × hashrate_hours / 24

  4. Calculate revenue:
     revenue_usd = total_btc × btc_price

For Excess Energy Mode:
  - Same calculation but using excess kWh instead of total production
  - Compare mining revenue to (excess_kWh × net_metering_rate)
```

#### Monthly Distribution
- **Estimate mode**: Use NREL monthly sun hours pattern
- **Production mode with annual input**: Distribute by location's sun hours (if available) or generic seasonal factors
- **Production mode with monthly input**: Use user's exact monthly values
- **Excess mode with annual input**: Distribute by same pattern as production (conservative assumption)
- **Excess mode with monthly input**: Use user's exact monthly values

### Bitcoin Network Data (Two-Knob Override System)

The calculator displays live BTC network data from Braiins API with a two-knob override system:

#### Knob 1: Price Group (BTC Price ↔ Hashprice)
- **BTC Price** (editable) - Current bitcoin price in USD
- **Hashprice** (editable) - USD earned per TH/s/day
- Relationship: `hashprice = hashvalue × btcPrice / 1e8`
- Editing one implies the other

#### Knob 2: Network Group (Hashvalue ↔ Network Hashrate)
- **Hashvalue** (editable) - Sats earned per TH/s/day
- **Network Hashrate** (editable) - Total network hashrate in EH/s
- Relationship: `hashvalue = (144 × 3.125 × 1e8) / networkHashrate`
- Editing one implies the other

#### Override Behavior
- Default: Show live data from Braiins API with "(Live)" indicator
- When overridden: Show user value, calculate implied values, show "Reset to live data" button
- **Transaction Fees**: Always use Braiins API hashvalue (includes fees). For override calculations, incorporate recent historical average fee rate to maintain realistic hashvalue/hashrate relationships.

#### Tooltips for Two-Knob System
- **Price Group Tooltip**: "BTC Price and Hashprice are linked. Editing one recalculates the other based on current network hashvalue. This lets you model different bitcoin price scenarios while maintaining network consistency."

- **Network Group Tooltip**: "Network Hashrate and Hashvalue are linked. Editing one recalculates the other based on network difficulty and fees. This lets you model different network conditions while maintaining mathematical consistency."

### Results Display

#### Unified Results Layout (Both Total Production and Excess Modes)

All result sections have consistent structure regardless of mode:

**Result Cards** (2x2 grid layout using `grid grid-cols-1 sm:grid-cols-2`):
1. **Annual Production** (or "Annual Excess" for Excess mode)
   - Total kWh annually
   - Avg sun hours per day
   - Tooltip: "Total solar energy available for mining. Based on your location's sun hours and system size. Higher sun hours mean more mining opportunity."

2. **Annual BTC Earnings**
   - BTC amount + sats
   - USD value at current price
   - Shows full system data in Estimate/Production modes
   - Shows excess-only data in Excess mode (calculated from grid export)
   - Tooltip (comprehensive): "Total bitcoin mined annually using your solar power. Calculated from your hashrate (based on miner efficiency) and solar production hours. Assumes static BTC price and network conditions - actual earnings depend on BTC price when you sell and network difficulty changes over time. Does not account for future volatility."

3. **Monthly Average**
   - BTC amount + sats
   - USD value
   - Shows full system average in Estimate/Production modes
   - Shows excess-only average in Excess mode
   - Tooltip: "Average monthly mining revenue. Summer months typically earn more due to longer sun hours. Remember this assumes current BTC price and network conditions throughout the year."

4. **Revenue per kWh**
   - $/kWh and sats/kWh
   - Shows full system efficiency in Estimate/Production modes
   - Shows excess-only efficiency in Excess mode
   - Tooltip: "How much value you extract from each kWh of solar power via mining. Compare this to your utility's net metering rate to see relative value. Higher miner efficiency = higher revenue per kWh."

**REMOVED Cards**:
- Mining Capacity (no longer relevant without miner quantity)
- Solar Utilization (no longer relevant without miner quantity)

#### Monthly Revenue & Generation Chart (Dual-Axis)

**Chart Type**: Bar chart with line overlay
- **Bars**: Monthly revenue (left Y-axis, USD scale)
  - Primary label: USD value (e.g., "$427")
  - Subtitle label: Sats value (e.g., "2.1M sats")
  - Labels positioned 20px above bars with 50px top padding to prevent clipping
- **Line**: Monthly solar generation (right Y-axis, kWh scale)
  - Overlaid line showing kWh pattern
- **Axes**: Auto-scaled independently
- **Interactive**: Hover shows exact values at mouse position
- **Caption**: "Monthly mining revenue varies with seasonal sun hours. Chart assumes static BTC price and network conditions."
- **Display**: Shows in all three modes (Estimate, Production, and Excess)
  - Excess mode uses excess-specific data (not full system production)

#### Excess Mode Additional Display

When in Excess mode, show comparison card:
- Net metering value ($/year at selected rate)
- Mining revenue ($/year + BTC amount)
- Advantage (mining vs net metering)
- Multiplier (how many times better)
- Recommendation banner (green if mining better, amber if net metering better)

**Excess Mode Specific Behavior:**
- Result cards display excess-only data (not full system capacity)
- Monthly chart shows excess export kWh (not total production)
- No "Mining Setup Details" card shown
- No empty state placeholders displayed

### Edge Cases & Validation

#### Invalid Location
- **Trigger**: ZIP code not found or NREL API fails
- **Behavior**: Show error message "Invalid zip code - please verify and try again", clear results
- **Recovery**: User must enter valid ZIP or switch to Production mode

#### Zero Solar Production
- **Trigger**: User enters 0 kWh in Production or Excess mode
- **Behavior**: Show guidance message "For production estimates, try the 'Estimate from system size' mode instead"
- **Recovery**: Guide user to correct mode

#### Missing Required Fields
- **Trigger**: Required field empty when switching modes
- **Behavior**: Show error "Enter [field name] to calculate mining revenue"
- **Recovery**: User fills required field

### Calculation Assumptions (Must Document in Tooltips)

1. **24/7 mining during sun hours**: Assumes miners run at full capacity during all daylight hours with no downtime, throttling, or variability.

2. **100% solar utilization**: Assumes all solar power goes to mining with no household consumption, grid export (in total production modes), or curtailment.

3. **Instantaneous power matching**: Assumes mining power perfectly matches solar output moment-to-moment without battery storage.

4. **Static BTC price and network**: Uses current BTC price and network hashrate across all months. Does not model future difficulty adjustments, price volatility, or fee changes.

### API Integrations

#### NREL PVWatts
- **Endpoint**: `https://developer.nrel.gov/api/pvwatts/v8.json`
- **Authentication**: API key from `VITE_NREL_API_KEY` env variable
- **Geocoding**: Zippopotam (`api.zippopotam.us/us/{zipCode}`) for ZIP → lat/lon
- **Fallback**: US average (1400 kWh/kW, generic seasonal pattern) if API fails
- **Debounce**: 500ms delay on ZIP code changes

#### Braiins (Bitcoin Network Data)
- **Endpoint**: `insights.braiins.com/api`
- **Data**: BTC price, network hashrate, hashvalue, hashprice
- **Refresh**: On component mount only
- **Fallback**: Show loading state, allow manual override

### PDF Report

**Style**: Match hashrate heating PDF report design
- **Header**: Exergy Heat branding
- **Sections**:
  1. Summary (1-2 sentence overview)
  2. Input Categories (Bitcoin Data, Solar System, Mining Setup, Net Metering if applicable)
  3. Results (key metrics with explanations)
  4. Monthly Chart (revenue breakdown bar chart)
  5. Comparison table (if Excess mode)
- **Footer**: "Generated with Claude Code" badge, generation date
- **Filename**: `solar-mining-potential.pdf` or `solar-net-metering-comparison.pdf`

---

## Hashrate Heating Calculator

### Purpose
Calculate the Coefficient of Performance - Economic (COPe) for hashrate heating systems. Compare the economics of bitcoin miner heating versus traditional fuel sources (natural gas, propane, heat pumps, etc.).

### Input Structure - Grouped Card Layout

**Design Goal**: Vary card widths, internal column layouts, and heights to create uniform overall appearance of input section.

#### Card 1: Location
- Country selector (US/Canada)
- Region/state selector
- Auto-populates regional electricity and fuel price averages

#### Card 2: Electricity
- **Electricity Rate** ($/kWh)
  - Manual input OR calculated from bill
- **Bill Calculator** (optional):
  - Bill Amount ($)
  - Bill Usage (kWh)
  - Calculates: rate = amount / usage
  - **Tooltip Enhancement**: "Find your total bill amount and kWh usage on your electric bill. Look for 'Total Amount Due' and 'Total kWh Used' or 'Electricity Usage'. Some bills split charges by rate tiers."

#### Card 3: Compare Fuel
- **Fuel Type** dropdown
  - Natural Gas, Propane, Heating Oil, Electric Resistance, Heat Pump, Wood Pellets
- **Fuel Rate** ($/unit)
  - Unit changes based on fuel type ($/therm, $/gallon, $/kWh, etc.)
- **Fuel Efficiency**
  - AFUE (0-1) for combustion fuels
  - COP for heat pumps
  - Locked at 1.0 for electric resistance
  - **Validation**: Soft warnings for values outside typical range, allow any positive number
- **Fuel Bill Calculator** (optional):
  - Bill Amount ($)
  - Usage (in fuel units)
  - Calculates rate
  - **Tooltip Enhancement**: "Enter your fuel bill total and usage to calculate your rate. Find usage on your bill as 'Therms Used' (natural gas), 'Gallons Delivered' (propane/oil), or similar units."

#### Card 4: Miner
- **Miner Model** dropdown (shared global presets + custom)
  - Tooltip: Same as Solar calculator
- **Power** (W)
- **Hashrate** (TH/s)

### Bitcoin Network Data
Same two-knob override system as Solar calculator. See Solar calculator section for details.

### Calculation Logic

#### COPe Formula
```
R = Daily Mining Revenue / Daily Electricity Cost

where:
  Daily Mining Revenue = Daily BTC × BTC Price
  Daily BTC = (miner_hashrate / network_hashrate) × 144 blocks × 3.125 BTC
  Daily Electricity Cost = (miner_power_kW × 24 hours) × electricity_rate

COPe = 1 / (1 - R)

Special cases:
  - If R >= 1: COPe = ∞ (free heating or paid to heat)
  - If R < 0: Not valid (shouldn't happen with positive electricity rates)
```

#### Heating Status
- **Profitable** (R >= 1): Mining covers all costs or more
- **Subsidized** (0.5 < R < 1): Mining significantly reduces costs
- **Loss** (R <= 0.5): Still paying most of electricity cost

#### Arbitrage Calculation
```
Traditional Cost per kWh = (fuel_rate × kWh_to_fuel_units) / fuel_efficiency

Hashrate Cost per kWh = (Electricity Rate × (1 - R))

Savings % = ((Traditional - Hashrate) / Traditional) × 100

Monthly/Annual Savings = (Traditional - Hashrate) × monthly_heat_kWh × months
```

### Results Display

#### Primary Result Cards
1. **COPe**
   - Value (formatted as number, ∞, or "Paid to heat!")
   - Status indicator (profitable/subsidized/loss)
   - **Comprehensive Tooltip**: "Coefficient of Performance - Economic. Like COP for heat pumps but includes mining revenue. Formula: COPe = 1/(1-R) where R = mining revenue / electricity cost. Interpretation: COPe of 1 = full cost. COPe of 2 = 50% cost reduction. COPe of 10 = 90% cost reduction. COPe of ∞ = free or paid to heat. Compare to traditional heat pump COP (typically 2-4)."
   - Expandable chart (see below)

2. **Heating Subsidy (R)**
   - Percentage (0-100%+)
   - "X% of electricity paid by mining"
   - Expandable chart

3. **Effective Heating Cost**
   - $/kWh, $/MMBTU, $/therm
   - Net cost after BTC revenue offset

4. **Break-even Electricity Rate**
   - $/kWh where COPe = ∞ (free heating)

5. **Savings vs [Fuel Type]**
   - Percentage savings
   - Monthly/annual dollar savings
   - Expandable chart with variable X-axis

#### Expandable Chart Interactivity

**Current Issues to Fix**:
1. Add hover states showing exact values at mouse position
2. Improve COPe infinity visualization (currently plateaus)

**Enhancements**:
- **Hover Interaction**:
  - As mouse moves over chart, show exact X and Y values at cursor position
  - Display in small tooltip or overlay near cursor
  - Update current value marker to follow cursor

- **COPe Chart Infinity Visualization**:
  - Use compressed upper range instead of plateau
  - Normal linear scale from COPe 0-10
  - Compressed scale from COPe 10-100 (smaller visual space)
  - Asymptote to ∞ symbol at top of chart
  - Y-axis labels: 0, 2, 5, 10, 25, 50, 100, ∞

**Variable X-Axis Options**:
- All charts: Electricity Rate, Miner Efficiency, Hashprice
- Savings chart additionally: Fuel Rate (hidden for electric fuel types)

#### State Heat Map
- Shows US state-by-state savings potential
- Color gradient based on savings percentage
- **Status**: Working well, keep as-is
- **Future**: Could add Canada provinces, make interactive

### Edge Cases & Validation

#### Zero or Negative Rates
- **Electricity Rate <= 0**: Block with error "Electricity rate must be greater than $0"
- **Fuel Rate <= 0**: Block with error "Fuel rate must be greater than $0"
- **Rationale**: Prevents division by zero and nonsensical results

#### Invalid Fuel Efficiency
- **Trigger**: Combustion fuel >100% efficiency (>1.0), heat pump COP <1.0, extreme values
- **Behavior**: Soft warning "Efficiency outside typical range for [fuel type]. Typical range: [X-Y]"
- **Allow**: Any positive value (user may have unusual system)

### Calculation Assumptions

1. **24/7 miner operation**: Assumes continuous mining for full heat output and revenue

2. **Static BTC price and network**: Uses current BTC price and network conditions. Does not model future difficulty adjustments, price volatility, or fee changes.

3. **100% heat utilization**: Assumes all miner heat output is useful and displaces traditional heating sources

4. **Energy arbitrage focus**: This calculator compares heating fuel economics, not modeling actual energy loads or consumption patterns

### Transaction Fees in Network Calculations

**Always Use Braiins API Values**:
- Braiins hashvalue includes transaction fees
- Braiins network hashrate is actual measured hashrate

**For Override Calculations**:
- When user overrides Network Hashrate → Calculate implied hashvalue including recent historical average fee rate
- When user overrides Hashvalue → Calculate implied network hashrate accounting for fees in that hashvalue
- Use recent 30-day average transaction fee data from Mempool.space or similar API
- **Tooltip Clarification**: Document that hashvalue includes both block subsidy (3.125 BTC) and transaction fees

### PDF Report

**Requirements**:
- Verify all calculations match on-screen results
- Add/improve explanatory paragraphs for COPe, subsidy %, savings
- Ensure completeness: all inputs, assumptions, results included
- Match visual design, content structure, and branding of existing report

---

## Global Web App Specifications

### Navigation & Structure

**Current Structure** (Keep as-is):
- Home page (`/`) - Calculator selection cards
- Calculator pages (`/solar-monetization`, `/hashrate-heating`)
- No persistent navbar or sidebar
- No breadcrumbs

### Footer

**Design Requirement**: Match exergyheat.com footer for brand consistency
- Links, copyright, social media as per main website
- Ensure footer appears on all pages

### Design System

**Brand Consistency**: Match exergyheat.com branding
- **Colors**: Use same primary, secondary, accent colors
- **Typography**: Match font families, sizes, weights
- **Spacing**: Consistent padding, margins, gaps
- **Components**: Buttons, cards, inputs should match main site style

**Tailwind Tokens**:
- `surface-*`: Grayscale tokens for backgrounds, borders, text
- `primary-*`: Brand color (green)
- `accent-*`: Highlight colors
- Dark mode variants with `dark:` prefix

### Dark Mode

**Implementation**: Auto-detect system preference + manual toggle

**Requirements**:
1. Default to user's system preference (prefers-color-scheme)
2. Provide manual toggle button in header/nav
3. Save user preference in localStorage
4. User override persists across sessions
5. Smooth transition between themes

### Responsive Design

**Priority**: Equal importance for desktop and mobile
- Test thoroughly on both platforms
- Ensure charts, tables, inputs work well on mobile
- Touch-friendly tap targets (minimum 44x44px)
- Readable text sizes on small screens
- Horizontal scrolling only where necessary (charts)

**Breakpoints** (Tailwind defaults):
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### SEO & Metadata

**Full SEO Optimization Required**:

1. **Page Titles & Descriptions**
   - Unique title tags for each calculator
   - Compelling meta descriptions (150-160 characters)
   - Keywords: bitcoin mining, solar, heating, COPe, hashrate

2. **OpenGraph Tags**
   - og:title, og:description, og:image for each page
   - Twitter card tags
   - Proper og:type (website/article)

3. **Structured Data**
   - Schema.org JSON-LD for calculators
   - Organization markup
   - Breadcrumb markup (if added later)

4. **Technical SEO**
   - Sitemap.xml generation
   - Robots.txt configuration
   - Canonical URLs
   - Proper heading hierarchy (h1 → h2 → h3)

### Browser Support

**Target**: Modern browsers only
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- **No IE11 support**

### Performance Standards

**Reasonable Performance** with Vite defaults:
- Utilize Vite's automatic code splitting
- Lazy load calculator pages (React.lazy)
- Optimize images (appropriate formats, compression)
- No specific performance budget constraints
- Monitor bundle size, keep it reasonable (<500KB initial JS)

### Analytics & Privacy

**No Tracking**: Privacy-first approach
- No Google Analytics
- No user behavior tracking
- No third-party analytics scripts
- No cookies for tracking purposes
- Only essential cookies (dark mode preference, etc.)

### Accessibility

**Basic Level**: Current state is acceptable
- Semantic HTML structure
- Proper heading hierarchy
- Alt text on images
- Form labels associated with inputs
- Keyboard accessible (tab navigation works)
- **No formal WCAG AA compliance testing required** (but good practices encouraged)

---

## Shared Components & Patterns

### Reusable UI Components

#### InputField
- Standardized input with label, prefix/suffix, help text, tooltips
- Supports text, number, email types
- Validation states (error, success)
- Dark mode compatible

#### SelectField
- Dropdown selector with label
- Options array
- Dark mode compatible

#### SmartTooltip
- Contextual help icon with popover
- 2-3 sentence detailed explanations
- Format: Explanation + Where to find it + Examples/context
- Click or hover to reveal
- Dark mode compatible

#### PdfReportButton
- Generates PDF from report data
- Loading state during generation
- Customizable filename
- Handles both calculator types

#### StateHeatMap (Hashrate Heating only)
- SVG-based US state visualization
- Color gradient based on data
- Hover tooltips for each state

### Architectural Patterns

#### File Organization
```
src/
├── api/              # External API integrations
│   ├── bitcoin.ts    # Braiins, CoinGecko, Mempool
│   └── solar.ts      # NREL, Zippopotam
├── calculations/     # Pure calculation functions
│   ├── hashrate.ts   # COPe, arbitrage, network metrics
│   └── solar.ts      # Solar mining, net metering
├── components/       # Reusable UI components
│   ├── InputField.tsx
│   ├── SelectField.tsx
│   ├── SmartTooltip.tsx
│   ├── PdfReportButton.tsx
│   ├── StateHeatMap.tsx
│   └── Layout.tsx
├── data/            # Static data (fuel prices, regions)
├── pages/           # Calculator page components
│   ├── HashrateHeating.tsx
│   ├── SolarMonetization.tsx
│   └── Home.tsx
├── pdf/             # PDF generation logic
│   └── types.ts     # PDF data interfaces
├── types/           # TypeScript definitions
└── App.tsx          # Router and app entry
```

#### State Management Pattern
- Local component state with `useState`
- Derived calculations with `useMemo` (proper dependency arrays)
- API data fetching with `useEffect`
- No global state library (Redux, Zustand) needed

#### API Integration Pattern
```typescript
// 1. Define types
interface ApiResponse { ... }

// 2. Create fetch function in api/ folder
export async function fetchData(): Promise<ApiResponse> {
  try {
    const response = await axios.get(...)
    return processedData
  } catch (error) {
    console.error('API error:', error)
    return fallbackData
  }
}

// 3. Use in component with useEffect
useEffect(() => {
  async function loadData() {
    setLoading(true)
    const data = await fetchData()
    setData(data)
    setLoading(false)
  }
  loadData()
}, [dependencies])
```

#### Calculation Pattern
```typescript
// 1. Pure functions in calculations/ folder
export function calculateMetric(
  input1: number,
  input2: number,
  context: Context
): Result {
  // Pure calculation logic
  return result
}

// 2. Use with useMemo in component
const result = useMemo(() =>
  calculateMetric(input1, input2, context),
  [input1, input2, context]
)
```

### Global Miner Presets

**Shared Across All Calculators**:
```typescript
export const MINER_PRESETS: MinerSpec[] = [
  { name: 'Heatbit Trio', powerW: 400, hashrateTH: 10 },
  { name: 'Heatbit Maxi', powerW: 1500, hashrateTH: 39 },
  { name: 'Avalon Mini 3', powerW: 850, hashrateTH: 40 },
  { name: 'Avalon Q', powerW: 1700, hashrateTH: 90 },
  { name: 'Whastminer M64', powerW: 5000, hashrateTH: 228 },
  { name: 'Bitmain S19j Pro', powerW: 3068, hashrateTH: 104 },
  { name: 'Bitmain S19k Pro', powerW: 2760, hashrateTH: 120 },
  { name: 'Bitmain S9', powerW: 1400, hashrateTH: 13.5 },
  { name: 'Single Board S19 Pro', powerW: 850, hashrateTH: 30 }
]
```

**Location**: `src/calculations/hashrate.ts` (canonical source)
**Exported**: Re-exported from `src/calculations/solar.ts` for consistency

---

## Testing Strategy

### Manual Testing
- Test each calculator with various input combinations
- Test edge cases (zero values, invalid locations, extreme overrides)
- Test on different browsers (Chrome, Firefox, Safari, Edge)
- Test on mobile devices (iOS Safari, Android Chrome)
- Test dark mode toggle
- Test PDF report generation

### Unit Tests (Implemented)
- ✅ **103 tests passing** across 3 test suites
- ✅ **100% statement coverage** on calculation logic
- ✅ **100% function coverage**
- ✅ **88.88% branch coverage** (only minor edge cases uncovered)
- All calculation functions in `src/calculations/` fully tested
- All conversion utilities tested (formatBtc, formatUsd, formatKwh, etc.)
- Network metric calculations tested
- COPe formula edge cases tested
- Solar mining revenue calculations tested
- **Testing Framework**: Vitest with v8 coverage provider

**Test Files:**
- `src/test/hashrate.test.ts` (37 tests) - COPe, arbitrage, network calculations
- `src/test/solar.test.ts` (42 tests) - Solar mining, net metering, production calculations
- `src/test/pdf.test.ts` (24 tests) - PDF report generation, state rankings

**Example Test Cases**:
```typescript
describe('calculateCOPe', () => {
  it('returns infinity when R >= 1 (free heating)', () => {...})
  it('calculates correct COPe for typical values', () => {...})
  it('handles extreme electricity rates', () => {...})
})

describe('calculateSolarMining', () => {
  it('correctly converts kWh to BTC revenue', () => {...})
  it('distributes monthly production correctly', () => {...})
})
```

---

## Success Criteria

### Functional Completeness
- All three solar calculator modes work correctly
- Hashrate heating calculator produces accurate COPe values
- All inputs validate properly
- All edge cases handled gracefully
- PDF reports generate without errors

### User Comprehension
- Users understand what to input (via tooltips)
- Users understand what results mean (via tooltips)
- Users can make informed decisions based on outputs
- Error messages are clear and actionable

### Calculation Accuracy
- Results match hand calculations within 1%
- COPe formula verified against real-world data
- Solar revenue estimates align with actual mining returns
- Monthly distributions are realistic

### Performance
- Calculator loads in <3 seconds on 3G
- Input changes update results immediately (<100ms)
- Charts render smoothly without lag
- API calls complete within reasonable time (<5s)

### Code Quality
- TypeScript type safety throughout
- No console errors in production
- Clean React patterns (proper hooks usage)
- Calculation functions are pure and testable
- Comments explain non-obvious logic

---

## Future Considerations (Out of Scope)

**Features NOT in this spec** (may be added later):
- Pool fees and operational costs modeling
- Multi-scenario comparison tools
- Historical BTC price charts
- Battery storage modeling for solar
- URL parameter sharing / bookmarkable scenarios (planned as separate feature)
- User accounts and saved scenarios
- Integration with live mining pool data
- More countries beyond US/Canada

---

## Appendix: Key Formulas

### COPe (Coefficient of Performance - Economic)
```
R = Mining Revenue / Electricity Cost
COPe = 1 / (1 - R)

where R = Revenue Ratio (Heating Subsidy)
```

### Hashvalue (sats/TH/day)
```
hashvalue = (144 blocks/day × block_reward_BTC × 1e8 sats/BTC + daily_fees_sats) / network_hashrate_TH
```

### Hashprice ($/TH/day)
```
hashprice = (hashvalue × btc_price_USD) / 1e8
```

### Solar Mining BTC Calculation
```
hashrate_hours = (total_kWh / miner_power_kW) × miner_hashrate_TH
daily_btc_per_TH = (144 × 3.125) / network_hashrate_TH
total_btc = daily_btc_per_TH × hashrate_hours / 24
```

### Heating Arbitrage
```
traditional_cost_per_kWh = (fuel_rate × BTU_conversion) / fuel_efficiency
hashrate_cost_per_kWh = electricity_rate × (1 - R)
savings_percent = ((traditional - hashrate) / traditional) × 100
```

---

**End of Specification**

*This living document will be updated as requirements evolve and new features are designed.*
